-- Matryx Medizys - Database Relationships and Additional Constraints

-- This file contains additional foreign key constraints to complete the relationships
-- between tables from different modules, as well as additional check constraints
-- for data integrity

-- ================================================
-- CROSS-MODULE RELATIONSHIPS
-- ================================================

-- Cases relationships
ALTER TABLE cases
    ADD CONSTRAINT fk_cases_hospitals
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id);

ALTER TABLE cases
    ADD CONSTRAINT fk_cases_doctors
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id);

ALTER TABLE cases
    ADD CONSTRAINT fk_cases_principles
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id);

ALTER TABLE cases
    ADD CONSTRAINT fk_cases_categories
    FOREIGN KEY (category_id) REFERENCES categories(category_id);

ALTER TABLE cases
    ADD CONSTRAINT fk_cases_subcategories
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id);

ALTER TABLE cases
    ADD CONSTRAINT fk_cases_creator
    FOREIGN KEY (created_by) REFERENCES users(user_id);

-- Doctor-Hospital relationships
ALTER TABLE doctors
    ADD CONSTRAINT fk_doctors_hospitals
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id);

-- Product relationships
ALTER TABLE products
    ADD CONSTRAINT fk_products_principles
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id);

-- Department Employee relationships
ALTER TABLE department_employees
    ADD CONSTRAINT fk_department_employees_users
    FOREIGN KEY (employee_id) REFERENCES users(user_id);

-- ================================================
-- ADDITIONAL CHECK CONSTRAINTS
-- ================================================

-- Ensure case selling price is greater than or equal to DP value
ALTER TABLE cases
    ADD CONSTRAINT chk_case_pricing
    CHECK (selling_price >= dp_value);

-- Ensure product MRP is greater than or equal to DP value
ALTER TABLE products
    ADD CONSTRAINT chk_product_pricing
    CHECK (mrp >= dp_value);

-- Ensure date ranges are valid (start date before end date)
ALTER TABLE department_targets
    ADD CONSTRAINT chk_department_target_dates
    CHECK (start_date <= end_date);

ALTER TABLE employee_targets
    ADD CONSTRAINT chk_employee_target_dates
    CHECK (start_date <= end_date);

ALTER TABLE hospital_agreements
    ADD CONSTRAINT chk_hospital_agreement_dates
    CHECK (start_date <= end_date OR end_date IS NULL);

ALTER TABLE principle_agreements
    ADD CONSTRAINT chk_principle_agreement_dates
    CHECK (start_date <= end_date OR end_date IS NULL);

-- Ensure valid inventory quantities
ALTER TABLE product_inventory
    ADD CONSTRAINT chk_inventory_quantity
    CHECK (quantity >= 0);

-- Ensure valid transaction quantities
ALTER TABLE product_inventory_transactions
    ADD CONSTRAINT chk_transaction_quantity
    CHECK (quantity > 0);

-- Ensure valid case product quantities
ALTER TABLE case_products
    ADD CONSTRAINT chk_case_product_quantity
    CHECK (quantity > 0);

-- ================================================
-- DATABASE-LEVEL CONSTRAINTS
-- ================================================

-- Create a function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql;

-- Add domain for valid email addresses
CREATE DOMAIN valid_email AS TEXT
CHECK (is_valid_email(VALUE));

-- Add domain for phone numbers
CREATE DOMAIN valid_phone AS TEXT
CHECK (VALUE ~ '^[0-9]{10,15}$');

-- Apply domains to appropriate columns
ALTER TABLE users
    ALTER COLUMN email TYPE valid_email,
    ALTER COLUMN phone TYPE valid_phone;

ALTER TABLE hospitals
    ALTER COLUMN email TYPE valid_email,
    ALTER COLUMN phone TYPE valid_phone;

ALTER TABLE doctors
    ALTER COLUMN email TYPE valid_email,
    ALTER COLUMN phone TYPE valid_phone;

ALTER TABLE principles
    ALTER COLUMN email TYPE valid_email,
    ALTER COLUMN phone TYPE valid_phone;

-- ================================================
-- CASCADING DELETES AND UPDATES
-- ================================================

-- Create view for tracking cascade operations
CREATE TABLE cascade_operation_log (
    log_id SERIAL PRIMARY KEY,
    operation_type VARCHAR(10) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    related_table VARCHAR(100) NOT NULL,
    related_record_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create functions for cascade operations
CREATE OR REPLACE FUNCTION log_cascade_operation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO cascade_operation_log (
        operation_type,
        table_name,
        record_id,
        related_table,
        related_record_id
    ) VALUES (
        TG_OP,
        TG_TABLE_NAME,
        OLD.id,
        TG_ARGV[0],
        OLD.id
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Example trigger for logging cascade deletes
-- CREATE TRIGGER log_category_delete_cascade
-- BEFORE DELETE ON categories
-- FOR EACH ROW
-- EXECUTE FUNCTION log_cascade_operation('subcategories');

-- ================================================
-- ISOLATION LEVELS AND TRANSACTION MANAGEMENT
-- ================================================

-- Create a stored procedure for transferring inventory between locations
CREATE OR REPLACE PROCEDURE transfer_inventory(
    p_product_id INT,
    p_batch_number VARCHAR(50),
    p_from_location VARCHAR(100),
    p_to_location VARCHAR(100),
    p_quantity INT,
    p_user_id INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_available_quantity INT;
    v_inventory_id_from INT;
    v_inventory_id_to INT;
    v_existing_quantity INT;
BEGIN
    -- Start transaction with serializable isolation
    SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
    
    -- Check if source inventory exists with enough quantity
    SELECT inventory_id, quantity INTO v_inventory_id_from, v_available_quantity
    FROM product_inventory
    WHERE product_id = p_product_id
    AND batch_number = p_batch_number
    AND location = p_from_location
    AND status = 'Available'
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source inventory not found';
    END IF;
    
    IF v_available_quantity < p_quantity THEN
        RAISE EXCEPTION 'Not enough quantity available (% available, % requested)', 
            v_available_quantity, p_quantity;
    END IF;
    
    -- Check if destination inventory exists
    SELECT inventory_id, quantity INTO v_inventory_id_to, v_existing_quantity
    FROM product_inventory
    WHERE product_id = p_product_id
    AND batch_number = p_batch_number
    AND location = p_to_location
    AND status = 'Available'
    FOR UPDATE;
    
    -- Update source inventory
    UPDATE product_inventory
    SET quantity = quantity - p_quantity,
        last_updated = CURRENT_TIMESTAMP,
        updated_by = p_user_id
    WHERE inventory_id = v_inventory_id_from;
    
    -- If destination exists, update it; otherwise, create new inventory record
    IF FOUND THEN
        UPDATE product_inventory
        SET quantity = quantity + p_quantity,
            last_updated = CURRENT_TIMESTAMP,
            updated_by = p_user_id
        WHERE inventory_id = v_inventory_id_to;
    ELSE
        -- Get expiry date and dp_value from source inventory
        INSERT INTO product_inventory (
            product_id,
            batch_number,
            location,
            quantity,
            dp_value,
            expiry_date,
            received_date,
            status,
            last_updated,
            updated_by
        )
        SELECT 
            product_id,
            batch_number,
            p_to_location,
            p_quantity,
            dp_value,
            expiry_date,
            CURRENT_DATE,
            status,
            CURRENT_TIMESTAMP,
            p_user_id
        FROM product_inventory
        WHERE inventory_id = v_inventory_id_from;
    END IF;
    
    -- Record the transaction
    INSERT INTO product_inventory_transactions (
        product_id,
        transaction_type,
        quantity,
        transaction_date,
        batch_number,
        location_from,
        location_to,
        notes,
        created_by
    ) VALUES (
        p_product_id,
        'Transfer',
        p_quantity,
        CURRENT_TIMESTAMP,
        p_batch_number,
        p_from_location,
        p_to_location,
        'Inventory transfer',
        p_user_id
    );
    
    -- Clean up inventory with zero quantity
    DELETE FROM product_inventory
    WHERE inventory_id = v_inventory_id_from
    AND quantity = 0;
    
    -- Commit transaction
    COMMIT;
END;
$$;

-- Create a stored procedure for creating a new case with products
CREATE OR REPLACE PROCEDURE create_case_with_products(
    p_surgery_date DATE,
    p_hospital_id INT,
    p_doctor_id INT,
    p_principle_id INT,
    p_category_id INT,
    p_subcategory_id INT,
    p_dp_value DECIMAL(10, 2),
    p_selling_price DECIMAL(10, 2),
    p_created_by INT,
    p_products JSONB -- Array of products with product_id, quantity, unit_price, dp_value
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_case_id INT;
    v_product JSONB;
    v_product_id INT;
    v_quantity INT;
    v_unit_price DECIMAL(10, 2);
    v_dp_value DECIMAL(10, 2);
    v_batch_number VARCHAR(50);
    v_inventory_id INT;
    v_available_quantity INT;
BEGIN
    -- Start transaction
    BEGIN;
    
    -- Create the case
    INSERT INTO cases (
        surgery_date,
        hospital_id,
        doctor_id,
        principle_id,
        category_id,
        subcategory_id,
        dp_value,
        selling_price,
        created_at,
        created_by,
        status
    ) VALUES (
        p_surgery_date,
        p_hospital_id,
        p_doctor_id,
        p_principle_id,
        p_category_id,
        p_subcategory_id,
        p_dp_value,
        p_selling_price,
        CURRENT_TIMESTAMP,
        p_created_by,
        'Active'
    ) RETURNING case_id INTO v_case_id;
    
    -- Add products to the case
    FOR v_product IN SELECT * FROM jsonb_array_elements(p_products)
    LOOP
        v_product_id := (v_product->>'product_id')::INT;
        v_quantity := (v_product->>'quantity')::INT;
        v_unit_price := (v_product->>'unit_price')::DECIMAL(10, 2);
        v_dp_value := (v_product->>'dp_value')::DECIMAL(10, 2);
        v_batch_number := v_product->>'batch_number';
        
        -- Check inventory availability if batch is specified
        IF v_batch_number IS NOT NULL THEN
            SELECT inventory_id, quantity INTO v_inventory_id, v_available_quantity
            FROM product_inventory
            WHERE product_id = v_product_id
            AND batch_number = v_batch_number
            AND status = 'Available'
            FOR UPDATE;
            
            IF NOT FOUND OR v_available_quantity < v_quantity THEN
                RAISE EXCEPTION 'Not enough inventory for product ID % batch %', 
                    v_product_id, v_batch_number;
            END IF;
            
            -- Update inventory
            UPDATE product_inventory
            SET quantity = quantity - v_quantity,
                last_updated = CURRENT_TIMESTAMP,
                updated_by = p_created_by
            WHERE inventory_id = v_inventory_id;
            
            -- Record inventory transaction
            INSERT INTO product_inventory_transactions (
                product_id,
                transaction_type,
                quantity,
                transaction_date,
                reference_id,
                reference_type,
                batch_number,
                location_from,
                notes,
                created_by
            ) VALUES (
                v_product_id,
                'Case Usage',
                v_quantity,
                CURRENT_TIMESTAMP,
                v_case_id,
                'case',
                v_batch_number,
                (SELECT location FROM product_inventory WHERE inventory_id = v_inventory_id),
                'Used in case',
                p_created_by
            );
            
            -- Clean up inventory with zero quantity
            DELETE FROM product_inventory
            WHERE inventory_id = v_inventory_id
            AND quantity = 0;
        END IF;
        
        -- Add product to case
        INSERT INTO case_products (
            case_id,
            product_id,
            quantity,
            unit_price,
            dp_value,
            batch_number,
            created_at
        ) VALUES (
            v_case_id,
            v_product_id,
            v_quantity,
            v_unit_price,
            v_dp_value,
            v_batch_number,
            CURRENT_TIMESTAMP
        );
        
        -- Track product usage
        INSERT INTO product_usage (
            product_id,
            case_id,
            quantity,
            batch_number,
            used_date,
            dp_value,
            selling_price,
            created_at,
            created_by
        ) VALUES (
            v_product_id,
            v_case_id,
            v_quantity,
            v_batch_number,
            p_surgery_date,
            v_dp_value,
            v_unit_price,
            CURRENT_TIMESTAMP,
            p_created_by
        );
    END LOOP;
    
    -- Commit transaction
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        -- Rollback transaction in case of any error
        ROLLBACK;
        RAISE;
END;
$$;

-- ================================================
-- MATERIALIZED VIEWS FOR REPORTING
-- ================================================

-- Materialized view for monthly sales performance
CREATE MATERIALIZED VIEW monthly_sales_performance AS
SELECT 
    DATE_TRUNC('month', c.surgery_date) AS month,
    d.department_id,
    d.name AS department_name,
    COUNT(DISTINCT c.case_id) AS case_count,
    COUNT(DISTINCT c.hospital_id) AS hospital_count,
    COUNT(DISTINCT c.doctor_id) AS doctor_count,
    SUM(c.selling_price) AS total_revenue,
    SUM(c.selling_price - c.dp_value) AS total_profit,
    ROUND(AVG(c.selling_price), 2) AS avg_case_value,
    SUM(cp.quantity) AS total_products_used
FROM 
    cases c
JOIN 
    users u ON c.created_by = u.user_id
JOIN 
    department_employees de ON u.user_id = de.employee_id
JOIN 
    departments d ON de.department_id = d.department_id
LEFT JOIN 
    case_products cp ON c.case_id = cp.case_id
GROUP BY 
    DATE_TRUNC('month', c.surgery_date), d.department_id, d.name
ORDER BY 
    month DESC, total_revenue DESC;

-- Create index for materialized view
CREATE INDEX idx_monthly_sales_performance_month ON monthly_sales_performance(month);
CREATE INDEX idx_monthly_sales_performance_department ON monthly_sales_performance(department_id);

-- Create function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW monthly_sales_performance;
    REFRESH MATERIALIZED VIEW product_performance;
    REFRESH MATERIALIZED VIEW doctor_performance;
    REFRESH MATERIALIZED VIEW hospital_performance;
END;
$$ LANGUAGE plpgsql;

-- Materialized view for product performance
CREATE MATERIALIZED VIEW product_performance AS
SELECT 
    p.product_id,
    p.name AS product_name,
    p.product_code,
    pr.name AS principle_name,
    cat.name AS category_name,
    COUNT(DISTINCT cp.case_id) AS case_count,
    SUM(cp.quantity) AS total_quantity_used,
    SUM(cp.unit_price * cp.quantity) AS total_revenue,
    SUM((cp.unit_price - cp.dp_value) * cp.quantity) AS total_profit,
    ROUND(AVG(cp.unit_price), 2) AS avg_selling_price,
    MAX(c.surgery_date) AS last_used_date
FROM 
    products p
JOIN 
    principles pr ON p.principle_id = pr.principle_id
LEFT JOIN 
    category_products catp ON p.product_id = catp.product_id
LEFT JOIN 
    categories cat ON catp.category_id = cat.category_id
LEFT JOIN 
    case_products cp ON p.product_id = cp.product_id
LEFT JOIN 
    cases c ON cp.case_id = c.case_id
GROUP BY 
    p.product_id, p.name, p.product_code, pr.name, cat.name;

-- Create index for product performance
CREATE INDEX idx_product_performance_product_id ON product_performance(product_id);
CREATE INDEX idx_product_performance_revenue ON product_performance(total_revenue);

-- Materialized view for doctor performance
CREATE MATERIALIZED VIEW doctor_performance AS
SELECT 
    d.doctor_id,
    d.name AS doctor_name,
    h.name AS hospital_name,
    COUNT(DISTINCT c.case_id) AS case_count,
    COUNT(DISTINCT c.category_id) AS unique_categories,
    SUM(c.selling_price) AS total_revenue,
    SUM(c.selling_price - c.dp_value) AS total_profit,
    ROUND(AVG(c.selling_price), 2) AS avg_case_value,
    MAX(c.surgery_date) AS last_case_date
FROM 
    doctors d
LEFT JOIN 
    hospitals h ON d.hospital_id = h.hospital_id
LEFT JOIN 
    cases c ON d.doctor_id = c.doctor_id
GROUP BY 
    d.doctor_id, d.name, h.name;

-- Create index for doctor performance
CREATE INDEX idx_doctor_performance_doctor_id ON doctor_performance(doctor_id);
CREATE INDEX idx_doctor_performance_revenue ON doctor_performance(total_revenue);

-- Materialized view for hospital performance
CREATE MATERIALIZED VIEW hospital_performance AS
SELECT 
    h.hospital_id,
    h.name AS hospital_name,
    h.city,
    h.state,
    COUNT(DISTINCT c.case_id) AS case_count,
    COUNT(DISTINCT c.doctor_id) AS unique_doctors,
    COUNT(DISTINCT c.category_id) AS unique_categories,
    SUM(c.selling_price) AS total_revenue,
    SUM(c.selling_price - c.dp_value) AS total_profit,
    ROUND(AVG(c.selling_price), 2) AS avg_case_value,
    MAX(c.surgery_date) AS last_case_date
FROM 
    hospitals h
LEFT JOIN 
    cases c ON h.hospital_id = c.hospital_id
GROUP BY 
    h.hospital_id, h.name, h.city, h.state;

-- Create index for hospital performance
CREATE INDEX idx_hospital_performance_hospital_id ON hospital_performance(hospital_id);
CREATE INDEX idx_hospital_performance_revenue ON hospital_performance(total_revenue);

-- ================================================
-- SCHEDULED JOBS
-- ================================================

-- Create extension for job scheduling (requires PostgreSQL 12+)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule job to refresh materialized views daily
SELECT cron.schedule('0 1 * * *', 'SELECT refresh_materialized_views()');

-- Schedule job to check for expiring inventory weekly
CREATE OR REPLACE FUNCTION notify_expiring_inventory()
RETURNS VOID AS $$
DECLARE
    expiry_count INT;
BEGIN
    -- Count products expiring in next 30 days
    SELECT COUNT(*) INTO expiry_count
    FROM product_inventory
    WHERE expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND quantity > 0;
    
    -- Log notification (in real system would send emails, etc.)
    IF expiry_count > 0 THEN
        INSERT INTO system_notifications (
            notification_type,
            title,
            message,
            is_read
        ) VALUES (
            'Expiring Inventory',
            'Products Expiring Soon',
            expiry_count || ' products are expiring within the next 30 days',
            FALSE
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule weekly expiry check
SELECT cron.schedule('0 9 * * 1', 'SELECT notify_expiring_inventory()');

-- ================================================
-- AUDIT LOGGING
-- ================================================

-- Create audit log table
CREATE TABLE audit_log (
    audit_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    operation VARCHAR(10) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

-- Create generic audit function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
BEGIN
    IF TG_OP = 'INSERT' THEN
        old_data = NULL;
        new_data = to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        old_data = to_jsonb(OLD);
        new_data = to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        old_data = to_jsonb(OLD);
        new_data = NULL;
    END IF;

    INSERT INTO audit_log (
        table_name,
        record_id,
        operation,
        old_data,
        new_data,
        changed_by,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'INSERT' THEN NEW.id
            ELSE OLD.id
        END,
        TG_OP,
        old_data,
        new_data,
        current_setting('app.current_user_id', true)::INTEGER,
        CURRENT_TIMESTAMP
    );

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to set up audit triggers
CREATE OR REPLACE FUNCTION create_audit_trigger(tablename TEXT)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
        CREATE TRIGGER audit_trigger_for_%I
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION audit_trigger_function();
    ', tablename, tablename);
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to important tables
SELECT create_audit_trigger('cases');
SELECT create_audit_trigger('doctors');
SELECT create_audit_trigger('hospitals');
SELECT create_audit_trigger('products');
SELECT create_audit_trigger('principles');
SELECT create_audit_trigger('users');
SELECT create_audit_trigger('departments');

-- Create system notifications table
CREATE TABLE system_notifications (
    notification_id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE,
    read_by INT,
    read_at TIMESTAMP,
    FOREIGN KEY (read_by) REFERENCES users(user_id)
);

-- Create index for notifications
CREATE INDEX idx_notifications_is_read ON system_notifications(is_read);
CREATE INDEX idx_notifications_created_at ON system_notifications(created_at);

-- ================================================
-- DATABASE MAINTENANCE
-- ================================================

-- Create a function to clean up old session tokens
CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS VOID AS $$
BEGIN
    -- Delete expired tokens older than 30 days
    DELETE FROM session_tokens
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days';
    
    -- Log the cleanup
    INSERT INTO system_notifications (
        notification_type,
        title,
        message,
        is_read
    ) VALUES (
        'System Maintenance',
        'Session Cleanup',
        'Expired sessions have been cleaned up',
        FALSE
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly session cleanup
SELECT cron.schedule('0 2 1 * *', 'SELECT cleanup_old_sessions()');

-- Create a function to optimize database tables
CREATE OR REPLACE FUNCTION optimize_database()
RETURNS VOID AS $$
BEGIN
    -- Run VACUUM ANALYZE on all tables
    VACUUM ANALYZE;
    
    -- Log the maintenance
    INSERT INTO system_notifications (
        notification_type,
        title,
        message,
        is_read
    ) VALUES (
        'System Maintenance',
        'Database Optimization',
        'Database tables have been optimized',
        FALSE
    );
END;
$$ LANGUAGE plpgsql;

-- Schedule weekly database optimization
SELECT cron.schedule('0 3 * * 0', 'SELECT optimize_database()');
