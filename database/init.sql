-- Tạo database
CREATE DATABASE IF NOT EXISTS taskhub_db;
USE taskhub_db;

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(15),
    id_card VARCHAR(20),
    address TEXT,
    date_of_birth DATE,
    gender ENUM('Nam', 'Nữ', 'Không muốn tiết lộ'),
    marital_status ENUM('Độc thân', 'Đã kết hôn', 'Đã ly hôn', 'Góa chồng','Góa vợ'),
    ethnicity VARCHAR(50),
    occupation VARCHAR(100),
    avatar VARCHAR(255) DEFAULT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- 2. Table Workspaces - Không gian làm việc
CREATE TABLE IF NOT EXISTS workspaces (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 2.1. Table Workspace Members - Thành viên trong từng không gian làm việc
-- Mỗi user có role riêng theo từng workspace
CREATE TABLE IF NOT EXISTS workspace_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('pm', 'tl', 'mb', 'clt') DEFAULT 'mb',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_workspace_user (workspace_id, user_id)
);


-- 3. Table prj - Quản lý thông tin dự án
CREATE TABLE IF NOT EXISTS prj (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INT,
    workspace_id INT,
    status ENUM('Not Started', 'In Progress', 'Completed', 'Pending', 'Planned', 'Cancelled', 'Testing', 'In Review', 'Delayed') DEFAULT 'Not Started',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL
);

-- 4. Table Project Members - Quản lý thành viên từng dự án
CREATE TABLE IF NOT EXISTS prj_mb (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    user_id INT,
    role ENUM('pm','tl', 'mb') DEFAULT 'mb',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_project_user (project_id, user_id)
);

-- 5. Table Tasks - Quản lý các công việc trong dự án
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('Not Started', 'In Progress', 'Completed', 'Pending', 'Planned', 'Cancelled', 'Testing', 'In Review', 'Delayed') DEFAULT 'Not Started',
    progress INT DEFAULT 0,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj(id) ON DELETE CASCADE
);

-- 6. Table Task Assignments - Quản lý giao việc cho từng người
CREATE TABLE IF NOT EXISTS tsk_asg (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT,
    user_id INT,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_task_user (task_id, user_id)
);

-- 7. Table Task Comments - Chat theo task
CREATE TABLE IF NOT EXISTS tsk_cmt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT,
    user_id INT,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7.1. Table Project Comments - Chat theo project
CREATE TABLE IF NOT EXISTS prj_cmt (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Table Documents - Quản lý liên kết tài liệu Google
CREATE TABLE IF NOT EXISTS docs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT,
    file_id VARCHAR(255) NOT NULL,
    type ENUM('doc', 'sheet', 'ppt') NOT NULL,
    url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES prj(id) ON DELETE CASCADE
);

-- 9. Table Activity Logs - Theo dõi toàn bộ hành động
CREATE TABLE IF NOT EXISTS logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(255),
    target_table VARCHAR(50),
    target_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- 10. Table Notifications - Thông báo hệ thống
CREATE TABLE IF NOT EXISTS ntf (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Table Members - Quản lý thông tin thành viên
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workspace_id INT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    date_of_birth DATE,
    occupation VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_prj_owner_id ON prj(owner_id);
CREATE INDEX idx_prj_workspace_id ON prj(workspace_id);
CREATE INDEX idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX idx_prj_mb_project_id ON prj_mb(project_id);
CREATE INDEX idx_prj_mb_user_id ON prj_mb(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tsk_asg_task_id ON tsk_asg(task_id);
CREATE INDEX idx_tsk_asg_user_id ON tsk_asg(user_id);
CREATE INDEX idx_tsk_cmt_task_id ON tsk_cmt(task_id);
CREATE INDEX idx_prj_cmt_project_id ON prj_cmt(project_id);
CREATE INDEX idx_prj_cmt_user_id ON prj_cmt(user_id);
CREATE INDEX idx_prj_cmt_created_at ON prj_cmt(created_at);
CREATE INDEX idx_logs_user_id ON logs(user_id);
CREATE INDEX idx_ntf_user_id ON ntf(user_id);
CREATE INDEX idx_ntf_is_read ON ntf(is_read);
CREATE INDEX idx_members_email ON members(email);

-- Migration: Thêm cột workspace_id vào bảng members (nếu chưa có)
ALTER TABLE members ADD COLUMN workspace_id INT NULL;
ALTER TABLE members ADD CONSTRAINT fk_members_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;
CREATE INDEX idx_members_workspace_id ON members(workspace_id);

-- Migration: Thêm cột workspace_id vào bảng prj (nếu chưa có)
ALTER TABLE prj ADD COLUMN workspace_id INT NULL;
ALTER TABLE prj ADD CONSTRAINT fk_prj_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;
CREATE INDEX idx_prj_workspace_id ON prj(workspace_id);

-- Migration: Thêm cột role vào bảng users (nếu chưa có)
ALTER TABLE users ADD COLUMN role ENUM('user', 'admin') DEFAULT 'user';

-- ========================================
-- ADMIN PANEL SETUP
-- ========================================

-- 12. Table System Settings - Cấu hình hệ thống (cho Admin Panel)
CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by INT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('site_name', 'TaskHub', 'Tên website'),
('maintenance_mode', 'false', 'Chế độ bảo trì'),
('max_upload_size', '10485760', 'Kích thước file upload tối đa (bytes)'),
('jwt_expire_days', '7', 'Số ngày token hết hạn'),
('allow_registration', 'true', 'Cho phép đăng ký tài khoản mới')
ON DUPLICATE KEY UPDATE setting_key = setting_key;

-- ========================================
-- ADMIN PANEL INDEXES (Optimization)
-- ========================================

-- Index for admin user role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index for admin activity logs queries
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_target_table ON logs(target_table);

-- ========================================
-- ADMIN PANEL PROCEDURES
-- ========================================

-- Procedure to log admin activities
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS log_admin_activity(
    IN p_user_id INT,
    IN p_action VARCHAR(255),
    IN p_target_table VARCHAR(50),
    IN p_target_id INT,
    IN p_description TEXT
)
BEGIN
    INSERT INTO logs (user_id, action, target_table, target_id, description, created_at)
    VALUES (p_user_id, p_action, p_target_table, p_target_id, p_description, NOW());
END //
DELIMITER ;

-- ========================================
-- ADMIN PANEL VIEWS
-- ========================================

-- View for quick admin dashboard stats
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM users) as total_users,
    (SELECT COUNT(*) FROM workspaces) as total_workspaces,
    (SELECT COUNT(*) FROM prj) as total_projects,
    (SELECT COUNT(*) FROM tasks) as total_tasks,
    (SELECT COUNT(*) FROM users WHERE role = 'admin') as admin_count,
    (SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as new_users_this_month,
    (SELECT COUNT(*) FROM prj WHERE status = 'In Progress') as active_projects,
    (SELECT COUNT(*) FROM tasks WHERE status = 'In Progress') as active_tasks;

-- ========================================
-- SAMPLE ADMIN USER (Optional - Uncomment to use)
-- ========================================

-- Create a default admin user for testing
-- IMPORTANT: Change the email and password in production!

/*
INSERT INTO users (username, email, password, role, created_at) 
VALUES (
    'Admin User', 
    'admin@taskhub.com', 
    -- Password: 'admin123' hashed with bcrypt (10 rounds)
    '$2a$10$8K1p/a0dL3LzjmGXfIQKNOYfRwfqj7vJ1QN3xQXqxN4xYmQN5qX3m',
    'admin',
    NOW()
)
ON DUPLICATE KEY UPDATE role = 'admin';
*/

-- Or manually update an existing user to admin:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';

-- ========================================
-- VERIFICATION
-- ========================================

-- Check if database setup completed successfully
SELECT 'Database setup completed successfully!' as status, NOW() as setup_time;

-- Display current admin users
SELECT id, username, email, role, created_at 
FROM users 
WHERE role = 'admin'
ORDER BY created_at DESC;

-- Display system stats from view
SELECT * FROM admin_dashboard_stats;