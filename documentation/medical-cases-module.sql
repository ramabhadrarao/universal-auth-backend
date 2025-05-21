-- Matryx Medizys - Medical Cases Module
-- Based on the Cases List screen from the application

-- Cases table - Primary table for surgical cases
CREATE TABLE cases (
    case_id SERIAL PRIMARY KEY,
    surgery_date DATE NOT NULL,
    hospital_id INT NOT NULL,
    doctor_id INT NOT NULL,
    principle_id INT NOT NULL,
    category_id INT NOT NULL,
    subcategory_id INT,
    
    dp_value DECIMAL(10, 2),  -- Dealer price
    selling_price DECIMAL(10, 2),
    bd_value DECIMAL(10, 2),  -- Business development value
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    status VARCHAR(50) DEFAULT 'Active',
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);
-- sales person - internal employye / external employee (case introduced) 
-- delivery person - internal employye / external employee 
-- OT (Operation theater ) support Person  - Additional information about the case
-- recovery person - internal employye / external employee
-- case payment type - invoice / cash / credit / cheque / online payment

create table case_invoice_details (
    invoice_id SERIAL PRIMARY KEY,
    case_id INT NOT NULL,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Case history - Track changes in case details
CREATE TABLE case_history (
    history_id SERIAL PRIMARY KEY,
    case_id INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by INT,
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);
-- Case products - Products used in each case
CREATE TABLE case_products (
    case_product_id SERIAL PRIMARY KEY,
    case_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    dp_value DECIMAL(10, 2) NOT NULL,  -- Dealer price
    total_amount DECIMAL(10, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    batch_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Case status history - Track case status changes
CREATE TABLE case_status_history (
    history_id SERIAL PRIMARY KEY,
    case_id INT NOT NULL,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by INT,
    notes TEXT,
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (changed_by) REFERENCES users(user_id)
);

-- Case notes - Additional notes for cases
CREATE TABLE case_notes (
    note_id SERIAL PRIMARY KEY,
    case_id INT NOT NULL,
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Case documents - Files and documents related to cases
CREATE TABLE case_documents (
    document_id SERIAL PRIMARY KEY,
    case_id INT NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100),
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT,
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Case followups - Follow-up appointments or actions
CREATE TABLE case_followups (
    followup_id SERIAL PRIMARY KEY,
    case_id INT NOT NULL,
    followup_date DATE NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    completed_at TIMESTAMP,
    completed_by INT,
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    FOREIGN KEY (completed_by) REFERENCES users(user_id)
);

-- business development cost - text box, amount 
-- 
-- TRIGGERS

-- Update timestamp when case is modified
CREATE OR REPLACE FUNCTION update_case_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_case_timestamp
BEFORE UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION update_case_timestamp();

-- Track case status changes
CREATE OR REPLACE FUNCTION track_case_status_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO case_status_history (
            case_id,
            previous_status,
            new_status,
            changed_by
        ) VALUES (
            NEW.case_id,
            OLD.status,
            NEW.status,
            CURRENT_USER
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_case_status
AFTER UPDATE OF status ON cases
FOR EACH ROW
EXECUTE FUNCTION track_case_status_changes();

-- INDEXES

-- Indexes for faster searching and filtering
CREATE INDEX idx_cases_surgery_date ON cases(surgery_date);
CREATE INDEX idx_cases_hospital_id ON cases(hospital_id);
CREATE INDEX idx_cases_doctor_id ON cases(doctor_id);
CREATE INDEX idx_cases_principle_id ON cases(principle_id);
CREATE INDEX idx_cases_category_id ON cases(category_id);
CREATE INDEX idx_cases_status ON cases(status);

-- Composite indexes for common query patterns
CREATE INDEX idx_cases_category_subcategory ON cases(category_id, subcategory_id);
CREATE INDEX idx_cases_date_hospital ON cases(surgery_date, hospital_id);
CREATE INDEX idx_cases_date_doctor ON cases(surgery_date, doctor_id);

-- Indexes for case products
CREATE INDEX idx_case_products_case_id ON case_products(case_id);
CREATE INDEX idx_case_products_product_id ON case_products(product_id);

-- Index for case documents
CREATE INDEX idx_case_documents_case_id ON case_documents(case_id);

-- Index for case followups
CREATE INDEX idx_case_followups_case_id ON case_followups(case_id);
CREATE INDEX idx_case_followups_date ON case_followups(followup_date);

-- VIEWS

-- View for case summary information
CREATE OR REPLACE VIEW case_summary_view AS
SELECT 
    c.case_id,
    c.surgery_date,
    h.name AS hospital_name,
    d.name AS doctor_name,
    p.name AS principle_name,
    cat.name AS category_name,
    subcat.name AS subcategory_name,
    c.dp_value,
    c.selling_price,
    c.status,
    COUNT(cp.case_product_id) AS product_count,
    SUM(cp.total_amount) AS total_products_amount
FROM 
    cases c
JOIN 
    hospitals h ON c.hospital_id = h.hospital_id
JOIN 
    doctors d ON c.doctor_id = d.doctor_id
JOIN 
    principles p ON c.principle_id = p.principle_id
JOIN 
    categories cat ON c.category_id = cat.category_id
LEFT JOIN 
    subcategories subcat ON c.subcategory_id = subcat.subcategory_id
LEFT JOIN 
    case_products cp ON c.case_id = cp.case_id
GROUP BY 
    c.case_id, c.surgery_date, h.name, d.name, p.name, 
    cat.name, subcat.name, c.dp_value, c.selling_price, c.status;

-- View for monthly cases report
CREATE OR REPLACE VIEW monthly_cases_report AS
SELECT 
    DATE_TRUNC('month', c.surgery_date) AS month,
    COUNT(*) AS total_cases,
    COUNT(DISTINCT c.hospital_id) AS hospitals_count,
    COUNT(DISTINCT c.doctor_id) AS doctors_count,
    SUM(c.selling_price) AS total_revenue,
    SUM(c.selling_price - c.dp_value) AS total_profit
FROM 
    cases c
WHERE 
    c.status = 'Active'
GROUP BY 
    DATE_TRUNC('month', c.surgery_date)
ORDER BY 
    month DESC;
