-- Matryx Medizys - Doctors Module
-- Based on the Doctor List screen from the application

-- Doctors table - Primary table for doctor information
CREATE TABLE doctors (
    doctor_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    specialization VARCHAR(100),
    hospital_id INT,
    location VARCHAR(100),
    committed_cases INT DEFAULT 0,
    remarks TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Doctor associations - Track multiple hospital associations
CREATE TABLE doctor_hospital_associations (
    association_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    hospital_id INT NOT NULL,
    role VARCHAR(100),
    department VARCHAR(100),
    schedule TEXT,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
);

-- Doctor specialties - Multiple specialties per doctor
CREATE TABLE doctor_specialties (
    specialty_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    specialty_name VARCHAR(100) NOT NULL,
    expertise_level VARCHAR(50),
    years_experience INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
);

-- Doctor preferences - Procedure/product preferences
CREATE TABLE doctor_preferences (
    preference_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    category_id INT NOT NULL,
    subcategory_id INT,
    product_id INT,
    preference_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Doctor meetings - Track interactions with doctors
CREATE TABLE doctor_meetings (
    meeting_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    user_id INT NOT NULL,
    meeting_date DATE NOT NULL,
    meeting_type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    discussion TEXT,
    outcome TEXT,
    follow_up_date DATE,
    follow_up_action TEXT,
    status VARCHAR(50) DEFAULT 'Completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Doctor documents - Store documents related to doctors
CREATE TABLE doctor_documents (
    document_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INT,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id)
);

-- Doctor case history - Track all cases done by the doctor
CREATE TABLE doctor_case_history (
    history_id SERIAL PRIMARY KEY,
    doctor_id INT NOT NULL,
    case_id INT NOT NULL,
    surgery_date DATE NOT NULL,
    procedure_name VARCHAR(255),
    hospital_id INT,
    outcome VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id),
    FOREIGN KEY (case_id) REFERENCES cases(case_id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id)
);

-- TRIGGERS

-- Update timestamp when doctor record is modified
CREATE OR REPLACE FUNCTION update_doctor_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_doctor_timestamp
BEFORE UPDATE ON doctors
FOR EACH ROW
EXECUTE FUNCTION update_doctor_timestamp();

-- Update committed cases count automatically
CREATE OR REPLACE FUNCTION update_doctor_committed_cases()
RETURNS TRIGGER AS $$
BEGIN
    -- Update doctor's committed cases count
    IF TG_OP = 'INSERT' THEN
        UPDATE doctors
        SET committed_cases = committed_cases + 1
        WHERE doctor_id = NEW.doctor_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE doctors
        SET committed_cases = GREATEST(committed_cases - 1, 0)
        WHERE doctor_id = OLD.doctor_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.doctor_id <> NEW.doctor_id THEN
        -- Doctor was changed for a case
        UPDATE doctors
        SET committed_cases = committed_cases + 1
        WHERE doctor_id = NEW.doctor_id;
        
        UPDATE doctors
        SET committed_cases = GREATEST(committed_cases - 1, 0)
        WHERE doctor_id = OLD.doctor_id;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_doctor_committed_cases
AFTER INSERT OR UPDATE OR DELETE ON cases
FOR EACH ROW
EXECUTE FUNCTION update_doctor_committed_cases();

-- Automatically add to doctor case history when a case is created
CREATE OR REPLACE FUNCTION add_to_doctor_case_history()
RETURNS TRIGGER AS $$
DECLARE
    procedure_name_val VARCHAR(255);
BEGIN
    -- Get procedure name from the category and subcategory
    SELECT 
        CASE 
            WHEN sc.name IS NOT NULL THEN CONCAT(c.name, ' - ', sc.name)
            ELSE c.name
        END INTO procedure_name_val
    FROM 
        categories c
    LEFT JOIN 
        subcategories sc ON NEW.subcategory_id = sc.subcategory_id
    WHERE 
        c.category_id = NEW.category_id;
    
    -- Insert into doctor case history
    INSERT INTO doctor_case_history (
        doctor_id,
        case_id,
        surgery_date,
        procedure_name,
        hospital_id,
        outcome,
        notes
    ) VALUES (
        NEW.doctor_id,
        NEW.case_id,
        NEW.surgery_date,
        procedure_name_val,
        NEW.hospital_id,
        'Scheduled',
        'Case created'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_to_doctor_case_history
AFTER INSERT ON cases
FOR EACH ROW
EXECUTE FUNCTION add_to_doctor_case_history();

-- INDEXES

-- Indexes for doctors table
CREATE INDEX idx_doctors_name ON doctors(name);
CREATE INDEX idx_doctors_hospital_id ON doctors(hospital_id);
CREATE INDEX idx_doctors_specialization ON doctors(specialization);
CREATE INDEX idx_doctors_is_active ON doctors(is_active);

-- Indexes for doctor associations
CREATE INDEX idx_doctor_associations_doctor_id ON doctor_hospital_associations(doctor_id);
CREATE INDEX idx_doctor_associations_hospital_id ON doctor_hospital_associations(hospital_id);
CREATE INDEX idx_doctor_associations_is_primary ON doctor_hospital_associations(is_primary);

-- Indexes for doctor preferences
CREATE INDEX idx_doctor_preferences_doctor_id ON doctor_preferences(doctor_id);
CREATE INDEX idx_doctor_preferences_category_id ON doctor_preferences(category_id);
CREATE INDEX idx_doctor_preferences_product_id ON doctor_preferences(product_id);

-- Indexes for doctor meetings
CREATE INDEX idx_doctor_meetings_doctor_id ON doctor_meetings(doctor_id);
CREATE INDEX idx_doctor_meetings_date ON doctor_meetings(meeting_date);
CREATE INDEX idx_doctor_meetings_follow_up ON doctor_meetings(follow_up_date);

-- Indexes for doctor case history
CREATE INDEX idx_doctor_case_history_doctor_id ON doctor_case_history(doctor_id);
CREATE INDEX idx_doctor_case_history_surgery_date ON doctor_case_history(surgery_date);

-- VIEWS

-- View for doctor summary with case statistics
CREATE OR REPLACE VIEW doctor_summary_view AS
SELECT 
    d.doctor_id,
    d.name,
    d.specialization,
    h.name AS primary_hospital,
    d.committed_cases,
    COUNT(DISTINCT c.case_id) AS total_cases,
    COUNT(DISTINCT CASE WHEN c.surgery_date >= CURRENT_DATE - INTERVAL '30 days' THEN c.case_id END) AS cases_last_30_days,
    MAX(c.surgery_date) AS last_case_date,
    ROUND(AVG(c.selling_price), 2) AS avg_case_value
FROM 
    doctors d
LEFT JOIN 
    hospitals h ON d.hospital_id = h.hospital_id
LEFT JOIN 
    cases c ON d.doctor_id = c.doctor_id
GROUP BY 
    d.doctor_id, d.name, d.specialization, h.name, d.committed_cases;

-- View for doctors with procedure preferences
CREATE OR REPLACE VIEW doctor_procedure_preferences AS
SELECT 
    d.doctor_id,
    d.name AS doctor_name,
    h.name AS hospital_name,
    c.name AS category_name,
    sc.name AS subcategory_name,
    p.name AS preferred_product,
    dp.preference_notes
FROM 
    doctors d
JOIN 
    hospitals h ON d.hospital_id = h.hospital_id
JOIN 
    doctor_preferences dp ON d.doctor_id = dp.doctor_id
JOIN 
    categories c ON dp.category_id = c.category_id
LEFT JOIN 
    subcategories sc ON dp.subcategory_id = sc.subcategory_id
LEFT JOIN 
    products p ON dp.product_id = p.product_id;

-- View for upcoming doctor meetings and follow-ups
CREATE OR REPLACE VIEW upcoming_doctor_meetings AS
SELECT 
    m.meeting_id,
    d.name AS doctor_name,
    h.name AS hospital_name,
    u.name AS team_member,
    m.meeting_date,
    m.meeting_type,
    m.location,
    m.follow_up_date,
    m.follow_up_action,
    m.status
FROM 
    doctor_meetings m
JOIN 
    doctors d ON m.doctor_id = d.doctor_id
JOIN 
    users u ON m.user_id = u.user_id
LEFT JOIN 
    hospitals h ON d.hospital_id = h.hospital_id
WHERE 
    m.follow_up_date >= CURRENT_DATE
ORDER BY 
    m.follow_up_date;
