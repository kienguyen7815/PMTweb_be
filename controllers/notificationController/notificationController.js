const Notification = require('../../models/notificationModel/Notification');

// Lấy danh sách thông báo của người dùng
const getMyNotifications = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { unreadOnly, limit } = req.query;
        
        const notifications = await Notification.findByUserId(user_id, {
            unreadOnly: unreadOnly === 'true',
            limit: limit ? parseInt(limit) : 50
        });
        
        // Chuyển thông báo sang dạng JSON
        const notificationsData = notifications.map(notif => notif.toJSON());
        
        res.json({ success: true, data: notificationsData });
    } catch (err) {
        next(err);
    }
};

// Lấy số lượng thông báo chưa đọc
const getUnreadCount = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const count = await Notification.countUnread(user_id);
        res.json({ success: true, data: { count } });
    } catch (err) {
        next(err);
    }
};

// Đánh dấu một thông báo là đã đọc
const markAsRead = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy notification' });
        }

        if (notification.user_id !== user_id) {
            return res.status(403).json({ success: false, message: 'Không có quyền truy cập notification này' });
        }

        await notification.markAsRead();
        res.json({ success: true, data: notification.toJSON() });
    } catch (err) {
        next(err);
    }
};

// Đánh dấu tất cả thông báo là đã đọc
const markAllAsRead = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        await Notification.markAllAsRead(user_id);
        res.json({ success: true, message: 'Đã đánh dấu tất cả là đã đọc' });
    } catch (err) {
        next(err);
    }
};

// Xóa thông báo
const deleteNotification = async (req, res, next) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const notification = await Notification.findById(id);
        if (!notification) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy notification' });
        }

        if (notification.user_id !== user_id) {
            return res.status(403).json({ success: false, message: 'Không có quyền xóa notification này' });
        }

        await notification.delete();
        res.json({ success: true, message: 'Đã xóa notification' });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getMyNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};

