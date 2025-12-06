-- ========================================
-- ADMIN PANEL - ADD TO EXISTING DATABASE
-- ========================================
-- Chạy file này nếu database đã tồn tại và bạn chỉ cần thêm Admin Panel
-- Run: mysql -u root -p taskhub_db < add_admin_panel.sql

USE taskhub_db;

-- ========================================
-- 1. CREATE SYSTEM SETTINGS TABLE
-- ========================================

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
-- 2. CREATE INDEXES FOR OPTIMIZATION
-- ========================================

-- Index for admin user role queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Index for admin activity logs queries
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_action ON logs(action);
CREATE INDEX IF NOT EXISTS idx_logs_target_table ON logs(target_table);

-- ========================================
-- 3. CREATE STORED PROCEDURE
-- ========================================

-- Drop procedure if exists
DROP PROCEDURE IF EXISTS log_admin_activity;

-- Create procedure to log admin activities
DELIMITER //
CREATE PROCEDURE log_admin_activity(
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
-- 4. CREATE VIEW FOR DASHBOARD STATS
-- ========================================

-- Drop view if exists
DROP VIEW IF EXISTS admin_dashboard_stats;

-- Create view for quick admin dashboard stats
CREATE VIEW admin_dashboard_stats AS
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
-- 5. VERIFICATION
-- ========================================

-- Check if setup completed successfully
SELECT 'Admin Panel tables created successfully!' as status, NOW() as created_time;

-- Show system settings table
SELECT 'System Settings Table:' as info;
SELECT * FROM system_settings;

-- Show created indexes
SELECT 'Created Indexes:' as info;
SHOW INDEX FROM users WHERE Key_name = 'idx_users_role';
SHOW INDEX FROM logs WHERE Key_name IN ('idx_logs_created_at', 'idx_logs_action', 'idx_logs_target_table');

-- Show dashboard stats
SELECT 'Dashboard Statistics:' as info;
SELECT * FROM admin_dashboard_stats;

-- ========================================
-- DONE!
-- ========================================

