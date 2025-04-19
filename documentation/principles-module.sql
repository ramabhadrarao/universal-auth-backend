-- Matryx Medizys - Principles/Suppliers Module
-- Based on the Supplies/Principles List screen from the application

-- Principles table - Primary table for suppliers/manufacturers
CREATE TABLE principles (
    principle_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    website VARCHAR(255),
    gst_number VARCHAR(20),
    payment_terms VARCHAR(100),
    credit_days INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Principle contacts - Additional contacts at the principle/supplier
CREATE TABLE principle_contacts (
    contact_id SERIAL PRIMARY KEY,
    principle_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id)
);

-- Principle categories - Categories supplied by each principle
CREATE TABLE principle_categories (
    principle_category_id SERIAL PRIMARY KEY,
    principle_id INT NOT NULL,
    category_id INT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    terms TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Principle agreements - Contracts and agreements with suppliers
CREATE TABLE principle_agreements (
    agreement_id SERIAL PRIMARY KEY,
    principle_id INT NOT NULL,
    agreement_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    terms TEXT,
    discount_percentage DECIMAL(5, 2),
    payment_terms VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Active',
    document_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Principle visits - Track visits to/from suppliers
CREATE TABLE principle_visits (
    visit_id SERIAL PRIMARY KEY,
    principle_id INT NOT NULL,
    user_id INT NOT NULL,
    visit_date DATE NOT NULL,
    visit_type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    contacts_met TEXT,
    discussion TEXT,
    outcome TEXT,
    follow_up_date DATE,
    follow_up_action TEXT,
    status VARCHAR(50) DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Principle products - Products supplied by each principle
CREATE TABLE principle_products (
    principle_product_id SERIAL PRIMARY KEY,
    principle_id INT NOT NULL,
    product_id INT NOT NULL,
    principle_product_code VARCHAR(100),
    principle_product_name VARCHAR(255),
    unit_cost DECIMAL(10, 2),
    minimum_order_quantity INT,
    lead_time_days INT,
    is_preferred BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Principle documents - Store documents related to principles
CREATE TABLE principle_documents (
    document_id SERIAL PRIMARY KEY,
    principle_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT,
    FOREIGN KEY (principle_id) REFERENCES principles(principle_id),
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- TRIGGERS

-- Update timestamp when principle record is modified
CREATE OR REPLACE FUNCTION update_principle_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_principle_timestamp
BEFORE UPDATE ON principles
FOR EACH ROW
EXECUTE FUNCTION update_principle_timestamp();

-- Update timestamp when principle contact is modified
CREATE TRIGGER trigger_update_principle_contact_timestamp
BEFORE UPDATE ON principle_contacts
FOR EACH ROW
EXECUTE FUNCTION update_principle_timestamp();

-- Update timestamp when principle product is modified
CREATE TRIGGER trigger_update_principle_product_timestamp
BEFORE UPDATE ON principle_products
FOR EACH ROW
EXECUTE FUNCTION update_principle_timestamp();

-- Add principle history when agreement is added or status changes
CREATE OR REPLACE FUNCTION track_principle_agreement_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Add entry to history or notification table (to be created)
        -- Example: INSERT INTO principle_history...
    ELSIF TG_OP = 'UPDATE' THEN
        -- Track status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            -- Add entry to history or notification table
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_principle_agreement
AFTER INSERT OR UPDATE ON principle_agreements
FOR EACH ROW
EXECUTE FUNCTION track_principle_agreement_changes();

-- INDEXES

-- Indexes for principles table
CREATE INDEX idx_principles_name ON principles(name);
CREATE INDEX idx_principles_is_active ON principles(is_active);

-- Indexes for principle contacts
CREATE INDEX idx_principle_contacts_principle_id ON principle_contacts(principle_id);
CREATE INDEX idx_principle_contacts_is_primary ON principle_contacts(is_primary);

-- Indexes for principle categories
CREATE INDEX idx_principle_categories_principle_id ON principle_categories(principle_id);
CREATE INDEX idx_principle_categories_category_id ON principle_categories(category_id);

-- Indexes for principle products
CREATE INDEX idx_principle_products_principle_id ON principle_products(principle_id);
CREATE INDEX idx_principle_products_product_id ON principle_products(product_id);
CREATE INDEX idx_principle_products_principle_code ON principle_products(principle_product_code);

-- Indexes for principle visits
CREATE INDEX idx_principle_visits_principle_id ON principle_visits(principle_id);
CREATE INDEX idx_principle_visits_user_id ON principle_visits(user_id);
CREATE INDEX idx_principle_visits_visit_date ON principle_visits(visit_date);
CREATE INDEX idx_principle_visits_follow_up_date ON principle_visits(follow_up_date);

-- VIEWS

-- View for principle summary with product counts
CREATE OR REPLACE VIEW principle_summary_view AS
SELECT 
    p.principle_id,
    p.name,
    p.contact_person,
    p.phone,
    p.email,
    p.is_active,
    COUNT(DISTINCT pp.product_id) AS product_count,
    COUNT(DISTINCT pc.category_id) AS category_count,
    COUNT(DISTINCT c.case_id) AS case_count,
    SUM(c.selling_price) AS total_revenue,
    MAX(c.surgery_date) AS last_case_date
FROM 
    principles p
LEFT JOIN 
    principle_products pp ON p.principle_id = pp.principle_id
LEFT JOIN 
    principle_categories pc ON p.principle_id = pc.principle_id
LEFT JOIN 
    cases c ON p.principle_id = c.principle_id
GROUP BY 
    p.principle_id, p.name, p.contact_person, p.phone, p.email, p.is_active;

-- View for principles with active agreements
CREATE OR REPLACE VIEW principles_with_agreements AS
SELECT 
    p.principle_id,
    p.name,
    a.agreement_type,
    a.start_date,
    a.end_date,
    a.discount_percentage,
    a.payment_terms,
    a.status AS agreement_status
FROM 
    principles p
JOIN 
    principle_agreements a ON p.principle_id = a.principle_id
WHERE 
    a.status = 'Active' AND
    (a.end_date IS NULL OR a.end_date >= CURRENT_DATE);

-- View for upcoming principle visits/follow-ups
CREATE OR REPLACE VIEW upcoming_principle_visits AS
SELECT 
    v.visit_id,
    p.name AS principle_name,
    u.name AS team_member,
    v.visit_date,
    v.visit_type,
    v.location,
    v.contacts_met,
    v.follow_up_date,
    v.follow_up_action
FROM 
    principle_visits v
JOIN 
    principles p ON v.principle_id = p.principle_id
JOIN 
    users u ON v.user_id = u.user_id
WHERE 
    v.follow_up_date >= CURRENT_DATE
ORDER BY 
    v.follow_up_date;

-- View for principle product pricing
CREATE OR REPLACE VIEW principle_product_pricing AS
SELECT 
    pp.principle_id,
    p.name AS principle_name,
    pp.product_id,
    pr.name AS product_name,
    pp.principle_product_code,
    pp.principle_product_name,
    pp.unit_cost,
    pr.selling_price,
    ROUND(((pr.selling_price - pp.unit_cost) / pp.unit_cost * 100), 2) AS margin_percentage,
    pp.minimum_order_quantity,
    pp.lead_time_days,
    pp.is_preferred
FROM 
    principle_products pp
JOIN 
    principles p ON pp.principle_id = p.principle_id
JOIN 
    products pr ON pp.product_id = pr.product_id
WHERE 
    p.is_active = TRUE AND pr.is_active = TRUE;
