const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Xử lý lỗi JWT hết hạn hoặc không hợp lệ
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Token không hợp lệ'
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Token đã hết hạn'
        });
    }

    // Xử lý lỗi duplicate key từ database
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
            success: false,
            message: 'Dữ liệu đã tồn tại'
        });
    }

    // Xử lý lỗi foreign key không hợp lệ
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            message: 'Tham chiếu không hợp lệ'
        });
    }

    // Xử lý lỗi validation từ middleware
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Xử lý lỗi upload file từ Multer
    if (err.name === 'MulterError') {
        let message = 'Lỗi khi upload file';
        if (err.code === 'LIMIT_FILE_SIZE') {
            message = 'Kích thước file vượt quá giới hạn cho phép (5MB)';
        } else if (err.code === 'LIMIT_FILE_COUNT') {
            message = 'Số lượng file vượt quá giới hạn';
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'File không được chấp nhận';
        }
        return res.status(400).json({
            success: false,
            message: message
        });
    }

    // Xử lý lỗi khi file không đúng định dạng cho phép
    if (err.message && err.message.includes('Chỉ chấp nhận file ảnh')) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    // Xử lý lỗi chung, trả về thông tin chi tiết trong development
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Lỗi server nội bộ';

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;
