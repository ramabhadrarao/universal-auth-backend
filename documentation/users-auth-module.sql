-- Matryx Medizys - Users and Authentication Module

-- Users table - Primary table for system users
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    designation VARCHAR(100),
    profile_image_path VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Roles table - User roles for permission management
CREATE TABLE roles (
    role_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Permissions table - Granular permission definitions
CREATE TABLE permissions (
    permission_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role permissions - Link permissions to roles
CREATE TABLE role_permissions (
    role_permission_id SERIAL PRIMARY KEY,
    role_id INT NOT NULL,
    permission_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (permission_id) REFERENCES permissions(permission_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    UNIQUE (role_id, permission_id)
);

-- User roles - Link users to roles
CREATE TABLE user_roles (
    user_role_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (role_id) REFERENCES roles(role_id),
    FOREIGN KEY (created_by) REFERENCES users(user_id),
    UNIQUE (user_id, role_id)
);

-- Login history - Track user logins
CREATE TABLE login_history (
    login_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_type VARCHAR(50),
    login_status VARCHAR(20) NOT NULL,
    failure_reason VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Password resets - For password reset functionality
CREATE TABLE password_resets (
    reset_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    ip_address VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Session tokens - For maintaining user sessions
CREATE TABLE session_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- User preferences - Store user-specific settings
CREATE TABLE user_preferences (
    preference_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    UNIQUE (user_id, preference_key)
);

-- User activity log - Track important user actions
CREATE TABLE user_activity_log (
    activity_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    description TEXT,
    activity_data JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- TRIGGERS

-- Update timestamp when user is modified
CREATE OR REPLACE FUNCTION update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_user_timestamp();

-- Update timestamp when role is modified
CREATE TRIGGER trigger_update_role_timestamp
BEFORE UPDATE ON roles
FOR EACH ROW
EXECUTE FUNCTION update_user_timestamp();

-- Update timestamp when user preference is modified
CREATE TRIGGER trigger_update_user_preference_timestamp
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_timestamp();

-- Log user password changes
CREATE OR REPLACE FUNCTION log_password_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.password_hash <> NEW.password_hash THEN
        INSERT INTO user_activity_log (
            user_id,
            activity_type,
            entity_type,
            entity_id,
            description,
            ip_address
        ) VALUES (
            NEW.user_id,
            'Password Change',
            'users',
            NEW.user_id,
            'User password was changed',
            '0.0.0.0'  -- This should be replaced with actual IP in application code
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_password_change
AFTER UPDATE OF password_hash ON users
FOR EACH ROW
EXECUTE FUNCTION log_password_change();

-- Automatically expire old session tokens
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE session_tokens
    SET is_active = FALSE
    WHERE user_id = NEW.user_id
    AND token <> NEW.token
    AND is_active = TRUE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expire_old_sessions
AFTER INSERT ON session_tokens
FOR EACH ROW
EXECUTE FUNCTION expire_old_sessions();

-- INDEXES

-- Indexes for users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Indexes for roles and permissions
CREATE INDEX idx_roles_name ON roles(name);
CREATE INDEX idx_permissions_module_action ON permissions(module, action);
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Indexes for login history
CREATE INDEX idx_login_history_user_id ON login_history(user_id);
CREATE INDEX idx_login_history_timestamp ON login_history(login_timestamp);

-- Indexes for session tokens
CREATE INDEX idx_session_tokens_user_id ON session_tokens(user_id);
CREATE INDEX idx_session_tokens_token ON session_tokens(token);
CREATE INDEX idx_session_tokens_expiry ON session_tokens(expires_at);

-- Indexes for user activity log
CREATE INDEX idx_user_activity_user_id ON user_activity_log(user_id);
CREATE INDEX idx_user_activity_type ON user_activity_log(activity_type);
CREATE INDEX idx_user_activity_entity ON user_activity_log(entity_type, entity_id);
CREATE INDEX idx_user_activity_timestamp ON user_activity_log(created_at);

-- VIEWS

-- View for user permissions (all permissions a user has through roles)
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT 
    u.user_id,
    u.username,
    u.name,
    r.role_id,
    r.name AS role_name,
    p.permission_id,
    p.name AS permission_name,
    p.module,
    p.action
FROM 
    users u
JOIN 
    user_roles ur ON u.user_id = ur.user_id
JOIN 
    roles r ON ur.role_id = r.role_id
JOIN 
    role_permissions rp ON r.role_id = rp.role_id
JOIN 
    permissions p ON rp.permission_id = p.permission_id
WHERE 
    u.is_active = TRUE;

-- View for active users with their roles
CREATE OR REPLACE VIEW active_users_with_roles AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.name,
    u.phone,
    u.designation,
    STRING_AGG(DISTINCT r.name, ', ') AS roles,
    u.last_login,
    u.created_at
FROM 
    users u
LEFT JOIN 
    user_roles ur ON u.user_id = ur.user_id
LEFT JOIN 
    roles r ON ur.role_id = r.role_id
WHERE 
    u.is_active = TRUE
GROUP BY 
    u.user_id, u.username, u.email, u.name, u.phone, u.designation, u.last_login, u.created_at;

-- View for user activity summary
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.user_id,
    u.name,
    COUNT(DISTINCT ual.activity_id) AS total_activities,
    COUNT(DISTINCT CASE WHEN ual.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN ual.activity_id END) AS activities_last_7_days,
    COUNT(DISTINCT CASE WHEN ual.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN ual.activity_id END) AS activities_last_30_days,
    MAX(ual.created_at) AS last_activity_date,
    MAX(lh.login_timestamp) AS last_login_date,
    COUNT(DISTINCT lh.login_id) AS total_logins
FROM 
    users u
LEFT JOIN 
    user_activity_log ual ON u.user_id = ual.user_id
LEFT JOIN 
    login_history lh ON u.user_id = lh.user_id
WHERE 
    u.is_active = TRUE
GROUP BY 
    u.user_id, u.name;

-- SAMPLE DATA FOR PERMISSIONS

-- Insert default permissions
INSERT INTO permissions (name, description, module, action) VALUES
('view_dashboard', 'Can view dashboard', 'dashboard', 'view'),
('manage_users', 'Can manage users', 'users', 'manage'),
('view_users', 'Can view users', 'users', 'view'),
('manage_roles', 'Can manage roles', 'roles', 'manage'),
('view_roles', 'Can view roles', 'roles', 'view'),
('manage_hospitals', 'Can manage hospitals', 'hospitals', 'manage'),
('view_hospitals', 'Can view hospitals', 'hospitals', 'view'),
('manage_doctors', 'Can manage doctors', 'doctors', 'manage'),
('view_doctors', 'Can view doctors', 'doctors', 'view'),
('manage_cases', 'Can manage cases', 'cases', 'manage'),
('view_cases', 'Can view cases', 'cases', 'view'),
('manage_products', 'Can manage products', 'products', 'manage'),
('view_products', 'Can view products', 'products', 'view'),
('manage_categories', 'Can manage categories', 'categories', 'manage'),
('view_categories', 'Can view categories', 'categories', 'view'),
('manage_principles', 'Can manage principles', 'principles', 'manage'),
('view_principles', 'Can view principles', 'principles', 'view'),
('manage_departments', 'Can manage departments', 'departments', 'manage'),
('view_departments', 'Can view departments', 'departments', 'view'),
('view_reports', 'Can view reports', 'reports', 'view'),
('export_data', 'Can export data', 'system', 'export');

-- Insert default roles
INSERT INTO roles (name, description, is_system_role, created_at) VALUES
('Administrator', 'Full system administrator with all permissions', TRUE, CURRENT_TIMESTAMP),
('Manager', 'Department manager with management permissions', TRUE, CURRENT_TIMESTAMP),
('Sales Representative', 'Sales staff with limited permissions', TRUE, CURRENT_TIMESTAMP),
('Inventory Manager', 'Manages product inventory', TRUE, CURRENT_TIMESTAMP),
('Read Only', 'Can only view data, no edit capabilities', TRUE, CURRENT_TIMESTAMP);

-- Insert admin user (password should be hashed in application code)
-- Default password: Admin@123 (this is just a placeholder - should be properly hashed)
INSERT INTO users (username, email, password_hash, name, is_active, created_at) VALUES
('admin', 'admin@matryxmedizys.com', '$2a$12$1TpC0BF.DW./KPR4DSkvXuH1xR4qc7vtiQJORPFJ5O9OGgN0JBUW.', 'System Administrator', TRUE, CURRENT_TIMESTAMP);

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id, created_at) VALUES
(1, 1, CURRENT_TIMESTAMP);

-- Assign all permissions to admin role
INSERT INTO role_permissions (role_id, permission_id, created_at)
SELECT 1, permission_id, CURRENT_TIMESTAMP FROM permissions;
