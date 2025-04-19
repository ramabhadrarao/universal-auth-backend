-- Matryx Medizys - Hospitals Module
-- Based on the Hospitals List screen from the application

-- Hospitals table - Primary table for hospitals/healthcare facilities
CREATE TABLE hospitals (
    hospital_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    location VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Hospital contacts - Contact persons at the hospital
CREATE TABLE hospital_contacts (
    contact_id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    department VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
);

-- Hospital departments - Departments within a hospital
CREATE TABLE hospital_departments (
    dept_id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL,
    department_name VARCHAR(100) NOT NULL,
    dept_head VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    location_within_hospital VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
);

-- Hospital visits - Track sales team visits to hospitals
CREATE TABLE hospital_visits (
    visit_id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL,
    visitor_id INT NOT NULL, -- User who visited
    visit_date DATE NOT NULL,
    contact_met VARCHAR(100),
    purpose VARCHAR(255),
    outcome TEXT,
    follow_up_date DATE,
    follow_up_action TEXT,
    status VARCHAR(50) DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (visitor_id) REFERENCES users(user_id)
);

-- Hospital agreements - Business agreements with hospitals
CREATE TABLE hospital_agreements (
    agreement_id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL,
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
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Hospital history - Track hospital relationship history
CREATE TABLE hospital_history (
    history_id SERIAL PRIMARY KEY,
    hospital_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- TRIGGERS

-- Update timestamp when hospital record is modified
CREATE OR REPLACE FUNCTION update_hospital_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_hospital_timestamp
BEFORE UPDATE ON hospitals
FOR EACH ROW
EXECUTE FUNCTION update_hospital_timestamp();

-- Update timestamp when hospital contact is modified
CREATE TRIGGER trigger_update_hospital_contact_timestamp
BEFORE UPDATE ON hospital_contacts
FOR EACH ROW
EXECUTE FUNCTION update_hospital_timestamp();

-- Update timestamp when hospital department is modified
CREATE TRIGGER trigger_update_hospital_dept_timestamp
BEFORE UPDATE ON hospital_departments
FOR EACH ROW
EXECUTE FUNCTION update_hospital_timestamp();

-- Add history entry when agreement is added or status changes
CREATE OR REPLACE FUNCTION track_hospital_agreement_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New agreement created
        INSERT INTO hospital_history (
            hospital_id, event_type, event_date, description, created_by
        ) VALUES (
            NEW.hospital_id, 
            'New Agreement', 
            CURRENT_DATE, 
            'New ' || NEW.agreement_type || ' agreement created with start date ' || NEW.start_date,
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Agreement status changed
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO hospital_history (
                hospital_id, event_type, event_date, description, created_by
            ) VALUES (
                NEW.hospital_id, 
                'Agreement Status Change', 
                CURRENT_DATE, 
                'Agreement status changed from ' || OLD.status || ' to ' || NEW.status,
                NEW.created_by
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_hospital_agreement
AFTER INSERT OR UPDATE ON hospital_agreements
FOR EACH ROW
EXECUTE FUNCTION track_hospital_agreement_changes();

-- INDEXES

-- Indexes for hospitals table
CREATE INDEX idx_hospitals_name ON hospitals(name);
CREATE INDEX idx_hospitals_city ON hospitals(city);
CREATE INDEX idx_hospitals_state ON hospitals(state);
CREATE INDEX idx_hospitals_is_active ON hospitals(is_active);

-- Indexes for hospital contacts
CREATE INDEX idx_hospital_contacts_hospital_id ON hospital_contacts(hospital_id);
CREATE INDEX idx_hospital_contacts_is_primary ON hospital_contacts(is_primary);

-- Indexes for hospital visits
CREATE INDEX idx_hospital_visits_hospital_id ON hospital_visits(hospital_id);
CREATE INDEX idx_hospital_visits_visitor_id ON hospital_visits(visitor_id);
CREATE INDEX idx_hospital_visits_visit_date ON hospital_visits(visit_date);
CREATE INDEX idx_hospital_visits_follow_up_date ON hospital_visits(follow_up_date);

-- Indexes for hospital agreements
CREATE INDEX idx_hospital_agreements_hospital_id ON hospital_agreements(hospital_id);
CREATE INDEX idx_hospital_agreements_status ON hospital_agreements(status);
CREATE INDEX idx_hospital_agreements_dates ON hospital_agreements(start_date, end_date);

-- VIEWS

-- View for hospital summary with primary contact
CREATE OR REPLACE VIEW hospital_summary_view AS
SELECT 
    h.hospital_id,
    h.name,
    h.city,
    h.state,
    h.phone,
    h.email,
    h.is_active,
    c.contact_name AS primary_contact_name,
    c.phone AS primary_contact_phone,
    c.email AS primary_contact_email,
    COUNT(DISTINCT d.doctor_id) AS doctors_count,
    COUNT(DISTINCT cs.case_id) AS cases_count,
    MAX(cs.surgery_date) AS last_case_date
FROM 
    hospitals h
LEFT JOIN 
    hospital_contacts c ON h.hospital_id = c.hospital_id AND c.is_primary = TRUE
LEFT JOIN 
    doctors d ON d.hospital_id = h.hospital_id
LEFT JOIN 
    cases cs ON cs.hospital_id = h.hospital_id
GROUP BY 
    h.hospital_id, h.name, h.city, h.state, h.phone, h.email, h.is_active, 
    c.contact_name, c.phone, c.email;

-- View for hospitals with active agreements
CREATE OR REPLACE VIEW hospitals_with_agreements AS
SELECT 
    h.hospital_id,
    h.name,
    h.city,
    h.state,
    a.agreement_type,
    a.start_date,
    a.end_date,
    a.discount_percentage,
    a.payment_terms,
    a.status AS agreement_status
FROM 
    hospitals h
JOIN 
    hospital_agreements a ON h.hospital_id = a.hospital_id
WHERE 
    a.status = 'Active' AND
    (a.end_date IS NULL OR a.end_date >= CURRENT_DATE);

-- View for upcoming hospital visits/follow-ups
CREATE OR REPLACE VIEW upcoming_hospital_visits AS
SELECT 
    v.visit_id,
    h.name AS hospital_name,
    h.city,
    u.name AS visitor_name,
    v.visit_date,
    v.contact_met,
    v.purpose,
    v.follow_up_date,
    v.follow_up_action
FROM 
    hospital_visits v
JOIN 
    hospitals h ON v.hospital_id = h.hospital_id
JOIN 
    users u ON v.visitor_id = u.user_id
WHERE 
    v.follow_up_date >= CURRENT_DATE
ORDER BY 
    v.follow_up_date;
