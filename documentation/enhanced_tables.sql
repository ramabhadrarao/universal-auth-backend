-- Add table for inventory physical counts
CREATE TABLE inventory_physical_counts (
    count_id SERIAL PRIMARY KEY,
    count_date DATE NOT NULL,
    location VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'In Progress',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    completed_at TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Add table for inventory count items
CREATE TABLE inventory_count_items (
    item_id SERIAL PRIMARY KEY,
    count_id INT NOT NULL,
    product_id INT NOT NULL,
    batch_number VARCHAR(50),
    system_quantity INT NOT NULL,
    actual_quantity INT NOT NULL,
    variance INT GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED,
    variance_reason TEXT,
    status VARCHAR(50) DEFAULT 'Pending',
    FOREIGN KEY (count_id) REFERENCES inventory_physical_counts(count_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- Add table for inventory damage/returns tracking
CREATE TABLE inventory_adjustments (
    adjustment_id SERIAL PRIMARY KEY,
    product_id INT NOT NULL,
    batch_number VARCHAR(50),
    location VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    adjustment_type VARCHAR(50) NOT NULL, -- 'Damage', 'Return', 'Missing'
    reason TEXT NOT NULL,
    adjustment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    adjusted_by INT,
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (adjusted_by) REFERENCES users(user_id)
);

-- Create view for missing stock (variance between system and physical count)
CREATE OR REPLACE VIEW missing_inventory_view AS
SELECT 
    pc.count_id,
    pc.count_date,
    pc.location,
    ci.product_id,
    p.name AS product_name,
    p.product_code,
    ci.batch_number,
    ci.system_quantity,
    ci.actual_quantity,
    ci.variance,
    ci.variance_reason
FROM 
    inventory_physical_counts pc
JOIN 
    inventory_count_items ci ON pc.count_id = ci.count_id
JOIN 
    products p ON ci.product_id = p.product_id
WHERE 
    ci.variance < 0
ORDER BY 
    pc.count_date DESC, ABS(ci.variance) DESC;

-- Create view for damaged items
CREATE OR REPLACE VIEW damaged_inventory_view AS
SELECT 
    ia.adjustment_id,
    ia.product_id,
    p.name AS product_name,
    p.product_code,
    ia.batch_number,
    ia.location,
    ia.quantity,
    ia.reason,
    ia.adjustment_date,
    u.name AS adjusted_by
FROM 
    inventory_adjustments ia
JOIN 
    products p ON ia.product_id = p.product_id
JOIN 
    users u ON ia.adjusted_by = u.user_id
WHERE 
    ia.adjustment_type = 'Damage'
ORDER BY 
    ia.adjustment_date DESC;



-- Create materialized view for inventory reports
CREATE MATERIALIZED VIEW inventory_reports AS
SELECT 
    DATE_TRUNC('month', transaction_date) AS month,
    product_id,
    SUM(CASE WHEN transaction_type = 'Received' THEN quantity ELSE 0 END) AS purchases,
    SUM(CASE WHEN transaction_type = 'Used' THEN quantity ELSE 0 END) AS sales,
    SUM(CASE WHEN transaction_type = 'Initial Stock' THEN quantity ELSE 0 END) AS opening_stock,
    SUM(CASE 
        WHEN transaction_type = 'Received' THEN quantity
        WHEN transaction_type = 'Used' THEN -quantity
        WHEN transaction_type = 'Transfer' AND location_to IS NOT NULL THEN quantity
        WHEN transaction_type = 'Transfer' AND location_from IS NOT NULL THEN -quantity
        ELSE 0
    END) AS net_change
FROM 
    product_inventory_transactions
GROUP BY 
    DATE_TRUNC('month', transaction_date), product_id;

-- Create view for top selling products
CREATE OR REPLACE VIEW top_selling_products AS
SELECT 
    p.product_id,
    p.name AS product_name,
    p.product_code,
    pr.name AS principle_name,
    cat.name AS category_name,
    COUNT(DISTINCT cp.case_id) AS case_count,
    SUM(cp.quantity) AS total_quantity_sold,
    SUM(cp.unit_price * cp.quantity) AS total_revenue,
    SUM((cp.unit_price - cp.dp_value) * cp.quantity) AS total_profit
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
GROUP BY 
    p.product_id, p.name, p.product_code, pr.name, cat.name
ORDER BY 
    total_quantity_sold DESC;

-- Create view for average period usage
CREATE OR REPLACE VIEW product_usage_periods AS
SELECT 
    product_id,
    DATE_TRUNC('month', used_date) AS month,
    SUM(quantity) AS monthly_usage,
    COUNT(DISTINCT case_id) AS case_count
FROM 
    product_usage
GROUP BY 
    product_id, DATE_TRUNC('month', used_date)
ORDER BY 
    product_id, month;


-- Add reorder point and safety stock columns to products
ALTER TABLE products
ADD COLUMN reorder_point INT,
ADD COLUMN safety_stock INT;

-- Create view for items to reorder
CREATE OR REPLACE VIEW inventory_reorder_list AS
SELECT 
    p.product_id,
    p.name,
    p.product_code,
    pr.name AS principle_name,
    SUM(pi.quantity) AS current_quantity,
    p.reorder_point,
    p.safety_stock,
    CASE
        WHEN SUM(pi.quantity) <= p.safety_stock THEN 'Critical'
        WHEN SUM(pi.quantity) <= p.reorder_point THEN 'Reorder'
        ELSE 'Adequate'
    END AS stock_status
FROM 
    products p
JOIN 
    principles pr ON p.principle_id = pr.principle_id
LEFT JOIN 
    product_inventory pi ON p.product_id = pi.product_id AND pi.status = 'Available'
WHERE 
    p.is_active = TRUE AND p.reorder_point IS NOT NULL
GROUP BY 
    p.product_id, p.name, p.product_code, pr.name, p.reorder_point, p.safety_stock
HAVING 
    SUM(pi.quantity) <= p.reorder_point
ORDER BY 
    stock_status, p.name;