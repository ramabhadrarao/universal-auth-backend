-- Matryx Medizys - Categories Module
-- Based on the Categories List screen from the application

-- Categories table - Primary table for product categories
CREATE TABLE categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Subcategories table - For category subdivisions
CREATE TABLE subcategories (
    subcategory_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Category applications table - For specific applications of categories
CREATE TABLE category_applications (
    application_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    subcategory_id INT,
    application_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id)
);

-- Category-product relationship table
CREATE TABLE category_products (
    category_product_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    subcategory_id INT,
    product_id INT NOT NULL,
    is_featured BOOLEAN DEFAULT FALSE,
    display_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Category specifications - For specific attributes of categories
CREATE TABLE category_specifications (
    spec_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    subcategory_id INT,
    spec_name VARCHAR(100) NOT NULL,
    spec_type VARCHAR(50) NOT NULL, -- e.g., text, number, boolean, enum
    spec_unit VARCHAR(20),  -- e.g., mm, kg, etc.
    spec_options TEXT,  -- For enum types, comma-separated options
    is_required BOOLEAN DEFAULT FALSE,
    display_order INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id)
);

-- Category procedures - Medical procedures associated with categories
CREATE TABLE category_procedures (
    procedure_id SERIAL PRIMARY KEY,
    category_id INT NOT NULL,
    subcategory_id INT,
    procedure_name VARCHAR(200) NOT NULL,
    description TEXT,
    estimated_duration_minutes INT,
    complexity_level VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id)
);

-- TRIGGERS

-- Update timestamp when category is modified
CREATE OR REPLACE FUNCTION update_category_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_category_timestamp
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_category_timestamp();

-- Update timestamp when subcategory is modified
CREATE TRIGGER trigger_update_subcategory_timestamp
BEFORE UPDATE ON subcategories
FOR EACH ROW
EXECUTE FUNCTION update_category_timestamp();

-- Ensure subcategories are deactivated when parent category is deactivated
CREATE OR REPLACE FUNCTION handle_category_deactivation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = FALSE AND OLD.is_active = TRUE THEN
        UPDATE subcategories
        SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
        WHERE category_id = NEW.category_id AND is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_handle_category_deactivation
AFTER UPDATE OF is_active ON categories
FOR EACH ROW
WHEN (NEW.is_active = FALSE AND OLD.is_active = TRUE)
EXECUTE FUNCTION handle_category_deactivation();

-- INDEXES

-- Indexes for categories table
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_categories_is_active ON categories(is_active);

-- Indexes for subcategories table
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_subcategories_name ON subcategories(name);
CREATE INDEX idx_subcategories_is_active ON subcategories(is_active);

-- Composite index for category-subcategory combinations
CREATE INDEX idx_subcategories_category_name ON subcategories(category_id, name);

-- Indexes for category applications
CREATE INDEX idx_category_applications_category_id ON category_applications(category_id);
CREATE INDEX idx_category_applications_subcategory_id ON category_applications(subcategory_id);

-- Indexes for category products
CREATE INDEX idx_category_products_category_id ON category_products(category_id);
CREATE INDEX idx_category_products_product_id ON category_products(product_id);
CREATE INDEX idx_category_products_featured ON category_products(is_featured);

-- VIEWS

-- View for category hierarchy
CREATE OR REPLACE VIEW category_hierarchy_view AS
SELECT 
    c.category_id,
    c.name AS category_name,
    c.description AS category_description,
    c.is_active AS category_active,
    sc.subcategory_id,
    sc.name AS subcategory_name,
    sc.description AS subcategory_description,
    sc.is_active AS subcategory_active,
    COUNT(DISTINCT p.product_id) AS product_count
FROM 
    categories c
LEFT JOIN 
    subcategories sc ON c.category_id = sc.category_id
LEFT JOIN 
    category_products cp ON 
        (c.category_id = cp.category_id AND cp.subcategory_id IS NULL) OR
        (sc.subcategory_id = cp.subcategory_id)
LEFT JOIN 
    products p ON cp.product_id = p.product_id
GROUP BY 
    c.category_id, c.name, c.description, c.is_active,
    sc.subcategory_id, sc.name, sc.description, sc.is_active
ORDER BY 
    c.name, sc.name;

-- View for category product counts
CREATE OR REPLACE VIEW category_product_counts AS
SELECT
    c.category_id,
    c.name AS category_name,
    COUNT(DISTINCT cp.product_id) AS total_products,
    COUNT(DISTINCT CASE WHEN p.is_active = TRUE THEN p.product_id END) AS active_products,
    COUNT(DISTINCT CASE WHEN pr.principle_id IS NOT NULL THEN pr.principle_id END) AS unique_suppliers,
    MIN(p.dp_value) AS min_price,
    MAX(p.dp_value) AS max_price,
    ROUND(AVG(p.dp_value), 2) AS avg_price
FROM
    categories c
LEFT JOIN
    category_products cp ON c.category_id = cp.category_id
LEFT JOIN
    products p ON cp.product_id = p.product_id
LEFT JOIN
    principles pr ON p.principle_id = pr.principle_id
GROUP BY
    c.category_id, c.name
ORDER BY
    c.name;

-- View for popular categories by case usage
CREATE OR REPLACE VIEW popular_categories_by_usage AS
SELECT
    c.category_id,
    c.name AS category_name,
    COUNT(DISTINCT cs.case_id) AS case_count,
    COUNT(DISTINCT cs.doctor_id) AS unique_doctors,
    COUNT(DISTINCT cs.hospital_id) AS unique_hospitals,
    SUM(cs.selling_price) AS total_revenue
FROM
    categories c
LEFT JOIN
    cases cs ON c.category_id = cs.category_id
WHERE
    cs.surgery_date >= CURRENT_DATE - INTERVAL '365 days'
GROUP BY
    c.category_id, c.name
ORDER BY
    case_count DESC;
