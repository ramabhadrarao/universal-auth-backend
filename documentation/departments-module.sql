-- Matryx Medizys - Departments Module
-- Based on the Department List screen from the application

-- Departments table - Primary table for company departments
CREATE TABLE departments (
    department_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INT,
    parent_department_id INT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (manager_id) REFERENCES users(user_id),
    FOREIGN KEY (parent_department_id) REFERENCES departments(department_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Department employees - Link employees to departments
CREATE TABLE department_employees (
    dept_employee_id SERIAL PRIMARY KEY,
    department_id INT NOT NULL,
    employee_id INT NOT NULL,
    role VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    target INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    FOREIGN KEY (employee_id) REFERENCES users(user_id)
);

-- Department targets - Sales and performance targets
CREATE TABLE department_targets (
    target_id SERIAL PRIMARY KEY,
    department_id INT NOT NULL,
    target_type VARCHAR(50) NOT NULL,  -- Sales, Cases, Revenue, etc.
    target_value DECIMAL(12, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    achieved_value DECIMAL(12, 2),
    achievement_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (CASE WHEN target_value > 0 THEN (achieved_value / target_value * 100) ELSE 0 END) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Employee targets - Individual employee targets
CREATE TABLE employee_targets (
    target_id SERIAL PRIMARY KEY,
    employee_id INT NOT NULL,
    department_id INT NOT NULL,
    target_type VARCHAR(50) NOT NULL,  -- Sales, Cases, Revenue, etc.
    target_value DECIMAL(12, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    achieved_value DECIMAL(12, 2),
    achievement_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (CASE WHEN target_value > 0 THEN (achieved_value / target_value * 100) ELSE 0 END) STORED,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (employee_id) REFERENCES users(user_id),
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Department activities - Track department activities and events
CREATE TABLE department_activities (
    activity_id SERIAL PRIMARY KEY,
    department_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    activity_date DATE NOT NULL,
    location VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Planned',
    outcome TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (department_id) REFERENCES departments(department_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Department territories - Geographic areas assigned to departments
CREATE TABLE department_territories (
    territory_id SERIAL PRIMARY KEY,
    department_id INT NOT NULL,
    territory_name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    region VARCHAR(100),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(department_id)
);

-- Territory hospitals - Hospitals within territories
CREATE TABLE territory_hospitals (
    territory_hospital_id SERIAL PRIMARY KEY,
    territory_id INT NOT NULL,
    hospital_id INT NOT NULL,
    assigned_employee_id INT,
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (territory_id) REFERENCES department_territories(territory_id),
    FOREIGN KEY (hospital_id) REFERENCES hospitals(hospital_id),
    FOREIGN KEY (assigned_employee_id) REFERENCES users(user_id)
);

-- TRIGGERS

-- Update timestamp when department record is modified
CREATE OR REPLACE FUNCTION update_department_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_department_timestamp
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION update_department_timestamp();

-- Update timestamp when department employee is modified
CREATE TRIGGER trigger_update_department_employee_timestamp
BEFORE UPDATE ON department_employees
FOR EACH ROW
EXECUTE FUNCTION update_department_timestamp();

-- Update timestamp when department target is modified
CREATE TRIGGER trigger_update_department_target_timestamp
BEFORE UPDATE ON department_targets
FOR EACH ROW
EXECUTE FUNCTION update_department_timestamp();

-- Update timestamp when employee target is modified
CREATE TRIGGER trigger_update_employee_target_timestamp
BEFORE UPDATE ON employee_targets
FOR EACH ROW
EXECUTE FUNCTION update_department_timestamp();

-- Auto-update department target achievement
CREATE OR REPLACE FUNCTION update_department_target_achievement()
RETURNS TRIGGER AS $$
DECLARE
    total_achieved DECIMAL(12, 2);
BEGIN
    -- Calculate the total achieved value based on the target type
    IF NEW.target_type = 'Sales' THEN
        SELECT COALESCE(SUM(c.selling_price), 0) INTO total_achieved
        FROM cases c
        JOIN department_employees de ON c.created_by = de.employee_id
        WHERE de.department_id = NEW.department_id
        AND c.surgery_date BETWEEN NEW.start_date AND NEW.end_date;
    ELSIF NEW.target_type = 'Cases' THEN
        SELECT COALESCE(COUNT(*), 0) INTO total_achieved
        FROM cases c
        JOIN department_employees de ON c.created_by = de.employee_id
        WHERE de.department_id = NEW.department_id
        AND c.surgery_date BETWEEN NEW.start_date AND NEW.end_date;
    END IF;
    
    -- Update the achieved value
    NEW.achieved_value = total_achieved;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_department_target_achievement
BEFORE INSERT OR UPDATE ON department_targets
FOR EACH ROW
EXECUTE FUNCTION update_department_target_achievement();

-- Auto-update employee target achievement
CREATE OR REPLACE FUNCTION update_employee_target_achievement()
RETURNS TRIGGER AS $$
DECLARE
    total_achieved DECIMAL(12, 2);
BEGIN
    -- Calculate the total achieved value based on the target type
    IF NEW.target_type = 'Sales' THEN
        SELECT COALESCE(SUM(c.selling_price), 0) INTO total_achieved
        FROM cases c
        WHERE c.created_by = NEW.employee_id
        AND c.surgery_date BETWEEN NEW.start_date AND NEW.end_date;
    ELSIF NEW.target_type = 'Cases' THEN
        SELECT COALESCE(COUNT(*), 0) INTO total_achieved
        FROM cases c
        WHERE c.created_by = NEW.employee_id
        AND c.surgery_date BETWEEN NEW.start_date AND NEW.end_date;
    END IF;
    
    -- Update the achieved value
    NEW.achieved_value = total_achieved;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_employee_target_achievement
BEFORE INSERT OR UPDATE ON employee_targets
FOR EACH ROW
EXECUTE FUNCTION update_employee_target_achievement();

-- INDEXES

-- Indexes for departments table
CREATE INDEX idx_departments_name ON departments(name);
CREATE INDEX idx_departments_manager_id ON departments(manager_id);
CREATE INDEX idx_departments_parent_id ON departments(parent_department_id);
CREATE INDEX idx_departments_is_active ON departments(is_active);

-- Indexes for department employees
CREATE INDEX idx_department_employees_department_id ON department_employees(department_id);
CREATE INDEX idx_department_employees_employee_id ON department_employees(employee_id);
CREATE INDEX idx_department_employees_is_active ON department_employees(is_active);

-- Indexes for department targets
CREATE INDEX idx_department_targets_department_id ON department_targets(department_id);
CREATE INDEX idx_department_targets_date_range ON department_targets(start_date, end_date);
CREATE INDEX idx_department_targets_type ON department_targets(target_type);

-- Indexes for employee targets
CREATE INDEX idx_employee_targets_employee_id ON employee_targets(employee_id);
CREATE INDEX idx_employee_targets_department_id ON employee_targets(department_id);
CREATE INDEX idx_employee_targets_date_range ON employee_targets(start_date, end_date);
CREATE INDEX idx_employee_targets_type ON employee_targets(target_type);

-- Indexes for department territories
CREATE INDEX idx_department_territories_department_id ON department_territories(department_id);
CREATE INDEX idx_department_territories_state_city ON department_territories(state, city);

-- Indexes for territory hospitals
CREATE INDEX idx_territory_hospitals_territory_id ON territory_hospitals(territory_id);
CREATE INDEX idx_territory_hospitals_hospital_id ON territory_hospitals(hospital_id);
CREATE INDEX idx_territory_hospitals_employee_id ON territory_hospitals(assigned_employee_id);

-- VIEWS

-- View for department summary with employee counts
CREATE OR REPLACE VIEW department_summary_view AS
SELECT 
    d.department_id,
    d.name AS department_name,
    u.name AS manager_name,
    pd.name AS parent_department,
    COUNT(DISTINCT de.employee_id) AS employee_count,
    COUNT(DISTINCT CASE WHEN de.is_active = TRUE THEN de.employee_id END) AS active_employee_count,
    d.is_active
FROM 
    departments d
LEFT JOIN 
    users u ON d.manager_id = u.user_id
LEFT JOIN 
    departments pd ON d.parent_department_id = pd.department_id
LEFT JOIN 
    department_employees de ON d.department_id = de.department_id
GROUP BY 
    d.department_id, d.name, u.name, pd.name, d.is_active;

-- View for department performance
CREATE OR REPLACE VIEW department_performance_view AS
SELECT 
    d.department_id,
    d.name AS department_name,
    dt.target_type,
    dt.start_date,
    dt.end_date,
    dt.target_value,
    dt.achieved_value,
    dt.achievement_percentage,
    COUNT(DISTINCT c.case_id) AS total_cases,
    COUNT(DISTINCT c.hospital_id) AS unique_hospitals,
    COUNT(DISTINCT c.doctor_id) AS unique_doctors,
    SUM(c.selling_price) AS total_revenue,
    SUM(c.selling_price - c.dp_value) AS total_profit
FROM 
    departments d
LEFT JOIN 
    department_targets dt ON d.department_id = dt.department_id
LEFT JOIN 
    department_employees de ON d.department_id = de.department_id
LEFT JOIN 
    cases c ON de.employee_id = c.created_by AND 
              c.surgery_date BETWEEN dt.start_date AND dt.end_date
WHERE 
    d.is_active = TRUE
GROUP BY 
    d.department_id, d.name, dt.target_type, dt.start_date, dt.end_date, 
    dt.target_value, dt.achieved_value, dt.achievement_percentage;

-- View for employee performance
CREATE OR REPLACE VIEW employee_performance_view AS
SELECT 
    u.user_id,
    u.name AS employee_name,
    d.name AS department_name,
    et.target_type,
    et.target_value,
    et.achieved_value,
    et.achievement_percentage,
    COUNT(DISTINCT c.case_id) AS total_cases,
    COUNT(DISTINCT c.hospital_id) AS unique_hospitals,
    COUNT(DISTINCT c.doctor_id) AS unique_doctors,
    SUM(c.selling_price) AS total_revenue,
    SUM(c.selling_price - c.dp_value) AS total_profit
FROM 
    users u
JOIN 
    department_employees de ON u.user_id = de.employee_id
JOIN 
    departments d ON de.department_id = d.department_id
LEFT JOIN 
    employee_targets et ON u.user_id = et.employee_id
LEFT JOIN 
    cases c ON u.user_id = c.created_by AND 
              c.surgery_date BETWEEN et.start_date AND et.end_date
WHERE 
    de.is_active = TRUE
GROUP BY 
    u.user_id, u.name, d.name, et.target_type, et.target_value, 
    et.achieved_value, et.achievement_percentage;

-- View for territory coverage
CREATE OR REPLACE VIEW territory_coverage_view AS
SELECT 
    dt.territory_id,
    dt.territory_name,
    d.name AS department_name,
    dt.city,
    dt.state,
    dt.region,
    COUNT(DISTINCT th.hospital_id) AS total_hospitals,
    COUNT(DISTINCT c.case_id) AS total_cases,
    SUM(c.selling_price) AS total_revenue
FROM 
    department_territories dt
JOIN 
    departments d ON dt.department_id = d.department_id
LEFT JOIN 
    territory_hospitals th ON dt.territory_id = th.territory_id
LEFT JOIN 
    cases c ON th.hospital_id = c.hospital_id
WHERE 
    dt.is_active = TRUE
GROUP BY 
    dt.territory_id, dt.territory_name, d.name, dt.city, dt.state, dt.region;
