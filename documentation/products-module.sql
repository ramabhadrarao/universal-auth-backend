-- Matryx Medizys - Products Module
-- Based on the Products List screen from the application

-- Products table - Primary table for medical products
CREATE TABLE products (
    product_id SERIAL PRIMARY KEY,
    principle_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100) NOT NULL,
    batch_number VARCHAR(50),
    dp_value DECIMAL(10, 2) NOT NULL,  -- Dealer price
    mrp DECIMAL(10, 2) NOT NULL,      -- Maximum retail price
    expiry_date DATE,
    quantity INT DEFAULT 1,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Product specifications - Technical details for products
CREATE TABLE product_specifications (
    spec_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    spec_name VARCHAR(100) NOT NULL,
    spec_value TEXT NOT NULL,
    spec_unit VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Product images - Store multiple images per product
CREATE TABLE product_images (
    image_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    image_path VARCHAR(500) NOT NULL,
    image_type VARCHAR(50),  -- Main, thumbnail, alternate view, etc.
    display_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Product documents - Technical documents, manuals, etc.
CREATE TABLE product_documents (
    document_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Product inventory - Track inventory levels and movements
CREATE TABLE product_inventory (
    inventory_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    batch_number VARCHAR(50),
    location VARCHAR(100),
    quantity INT NOT NULL,
    dp_value DECIMAL(10, 2),
    expiry_date DATE,
    received_date DATE,
    status VARCHAR(50) DEFAULT 'Available',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (updated_by) REFERENCES users(user_id)
);

-- Product inventory transactions - Track all inventory movements
CREATE TABLE product_inventory_transactions (
    transaction_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,  -- Received, Used, Transferred, Expired, etc.
    quantity INT NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reference_id INT,  -- Can reference case_id, transfer_id, etc.
    reference_type VARCHAR(50),  -- 'case', 'transfer', etc.
    batch_number VARCHAR(50),
    location_from VARCHAR(100),
    location_to VARCHAR(100),
    notes TEXT,
    created_by INT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Product usage history - Track product usage in cases
CREATE TABLE product_usage (
    usage_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    case_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    batch_number VARCHAR(50),
    used_date DATE NOT NULL,
    dp_value DECIMAL(10, 2),
    selling_price DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Product alternatives - Similar or substitute products
CREATE TABLE product_alternatives (
    alternative_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    alternative_product_id INT NOT NULL,
    compatibility_level VARCHAR(20),  -- Full, Partial, Emergency Only
    price_difference DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (alternative_product_id) REFERENCES products(product_id)
);

-- TRIGGERS

-- Update timestamp when product record is modified
CREATE OR REPLACE FUNCTION update_product_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_timestamp
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_product_timestamp();

-- Update timestamp when product specification is modified
CREATE TRIGGER trigger_update_product_spec_timestamp
BEFORE UPDATE ON product_specifications
FOR EACH ROW
EXECUTE FUNCTION update_product_timestamp();

-- Track inventory transactions when inventory is modified
CREATE OR REPLACE FUNCTION track_inventory_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Record new inventory
        INSERT INTO product_inventory_transactions (
            product_id,
            transaction_type,
            quantity,
            batch_number,
            location_to,
            notes,
            created_by
        ) VALUES (
            NEW.product_id,
            'Initial Stock',
            NEW.quantity,
            NEW.batch_number,
            NEW.location,
            'Initial inventory record',
            NEW.updated_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- If quantity changed, record a transaction
        IF OLD.quantity <> NEW.quantity THEN
            INSERT INTO product_inventory_transactions (
                product_id,
                transaction_type,
                quantity,
                batch_number,
                location_from,
                location_to,
                notes,
                created_by
            ) VALUES (
                NEW.product_id,
                CASE 
                    WHEN NEW.quantity > OLD.quantity THEN 'Stock Increase'
                    ELSE 'Stock Decrease'
                END,
                ABS(NEW.quantity - OLD.quantity),
                NEW.batch_number,
                OLD.location,
                NEW.location,
                'Inventory adjustment',
                NEW.updated_by
            );
        END IF;
        
        -- If location changed, record a transfer
        IF OLD.location <> NEW.location THEN
            INSERT INTO product_inventory_transactions (
                product_id,
                transaction_type,
                quantity,
                batch_number,
                location_from,
                location_to,
                notes,
                created_by
            ) VALUES (
                NEW.product_id,
                'Transfer',
                NEW.quantity,
                NEW.batch_number,
                OLD.location,
                NEW.location,
                'Location transfer',
                NEW.updated_by
            );
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_inventory_changes
AFTER INSERT OR UPDATE ON product_inventory
FOR EACH ROW
EXECUTE FUNCTION track_inventory_changes();

-- INDEXES

-- Indexes for products table
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_product_code ON products(product_code);
CREATE INDEX idx_products_principle_id ON products(principle_id);
CREATE INDEX idx_products_expiry_date ON products(expiry_date);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Indexes for product specifications
CREATE INDEX idx_product_specifications_product_id ON product_specifications(product_id);

-- Indexes for product inventory
CREATE INDEX idx_product_inventory_product_id ON product_inventory(product_id);
CREATE INDEX idx_product_inventory_batch_number ON product_inventory(batch_number);
CREATE INDEX idx_product_inventory_location ON product_inventory(location);
CREATE INDEX idx_product_inventory_expiry_date ON product_inventory(expiry_date);
CREATE INDEX idx_product_inventory_status ON product_inventory(status);

-- Indexes for product inventory transactions
CREATE INDEX idx_inventory_transactions_product_id ON product_inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_date ON product_inventory_transactions(transaction_date);
CREATE INDEX idx_inventory_transactions_type ON product_inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_reference ON product_inventory_transactions(reference_id, reference_type);

-- Indexes for product usage
CREATE INDEX idx_product_usage_product_id ON product_usage(product_id);
CREATE INDEX idx_product_usage_case_id ON product_usage(case_id);
CREATE INDEX idx_product_usage_used_date ON product_usage(used_date);

-- VIEWS

-- View for product inventory summary
CREATE OR REPLACE VIEW product_inventory_summary AS
SELECT 
    p.product_id,
    p.name,
    p.product_code,
    pr.name AS principle_name,
    SUM(pi.quantity) AS total_quantity,
    COUNT(DISTINCT pi.batch_number) AS batch_count,
    MIN(pi.expiry_date) AS earliest_expiry,
    CASE
        WHEN MIN(pi.expiry_date) < CURRENT_DATE + INTERVAL '90 days' THEN 'Warning'
        WHEN MIN(pi.expiry_date) < CURRENT_DATE + INTERVAL '180 days' THEN 'Monitor'
        ELSE 'Good'
    END AS expiry_status,
    SUM(pi.quantity * pi.dp_value) AS inventory_value
FROM 
    products p
JOIN 
    principles pr ON p.principle_id = pr.principle_id
LEFT JOIN 
    product_inventory pi ON p.product_id = pi.product_id
WHERE 
    p.is_active = TRUE AND pi.status = 'Available'
GROUP BY 
    p.product_id, p.name, p.product_code, pr.name;

-- View for products with low inventory
CREATE OR REPLACE VIEW products_low_inventory AS
SELECT 
    p.product_id,
    p.name,
    p.product_code,
    pr.name AS principle_name,
    SUM(pi.quantity) AS total_quantity,
    p.quantity AS min_required_quantity,
    CASE
        WHEN SUM(pi.quantity) < p.quantity * 0.25 THEN 'Critical'
        WHEN SUM(pi.quantity) < p.quantity * 0.5 THEN 'Low'
        ELSE 'Adequate'
    END AS inventory_status
FROM 
    products p
JOIN 
    principles pr ON p.principle_id = pr.principle_id
LEFT JOIN 
    product_inventory pi ON p.product_id = pi.product_id
WHERE 
    p.is_active = TRUE AND pi.status = 'Available'
GROUP BY 
    p.product_id, p.name, p.product_code, pr.name, p.quantity
HAVING 
    SUM(pi.quantity) < p.quantity;

-- View for products nearing expiry
CREATE OR REPLACE VIEW products_expiring_soon AS
SELECT 
    p.product_id,
    p.name,
    p.product_code,
    pr.name AS principle_name,
    pi.batch_number,
    pi.quantity,
    pi.expiry_date,
    DATE_PART('day', pi.expiry_date - CURRENT_DATE) AS days_until_expiry,
    pi.location
FROM 
    products p
JOIN 
    principles pr ON p.principle_id = pr.principle_id
JOIN 
    product_inventory pi ON p.product_id = pi.product_id
WHERE 
    p.is_active = TRUE 
    AND pi.status = 'Available' 
    AND pi.expiry_date IS NOT NULL
    AND pi.expiry_date < CURRENT_DATE + INTERVAL '180 days'
ORDER BY 
    pi.expiry_date;

-- View for product usage statistics
CREATE OR REPLACE VIEW product_usage_statistics AS
SELECT 
    p.product_id,
    p.name,
    p.product_code,
    pr.name AS principle_name,
    COUNT(DISTINCT pu.case_id) AS case_count,
    SUM(pu.quantity) AS total_quantity_used,
    SUM(pu.selling_price * pu.quantity) AS total_revenue,
    SUM((pu.selling_price - pu.dp_value) * pu.quantity) AS total_profit,
    ROUND(AVG(pu.selling_price), 2) AS avg_selling_price,
    MAX(pu.used_date) AS last_used_date
FROM 
    products p
JOIN 
    principles pr ON p.principle_id = pr.principle_id
LEFT JOIN 
    product_usage pu ON p.product_id = pu.product_id
WHERE 
    p.is_active = TRUE
GROUP BY 
    p.product_id, p.name, p.product_code, pr.name;

-- View for product details with specifications
CREATE OR REPLACE VIEW product_details_view AS
SELECT 
    p.product_id,
    p.name,
    p.product_code,
    p.batch_number,
    p.dp_value,
    p.mrp,
    p.expiry_date,
    p.quantity,
    pr.name AS principle_name,
    pr.principle_id,
    STRING_AGG(DISTINCT ps.spec_name || ': ' || ps.spec_value || 
               CASE WHEN ps.spec_unit IS NOT NULL THEN ' ' || ps.spec_unit ELSE '' END, 
               ', ') AS specifications,
    COUNT(DISTINCT pi.image_id) AS image_count,
    COUNT(DISTINCT pd.document_id) AS document_count,
    p.is_active,
    p.created_at,
    p.updated_at
FROM 
    products p
JOIN 
    principles pr ON p.principle_id = pr.principle_id
LEFT JOIN 
    product_specifications ps ON p.product_id = ps.product_id
LEFT JOIN 
    product_images pi ON p.product_id = pi.product_id
LEFT JOIN 
    product_documents pd ON p.product_id = pd.product_id
GROUP BY 
    p.product_id, p.name, p.product_code, p.batch_number, p.dp_value, p.mrp, 
    p.expiry_date, p.quantity, pr.name, pr.principle_id, p.is_active, p.created_at, p.updated_at;
