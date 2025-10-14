const { body, validationResult } = require('express-validator');

// Validation middleware cho đăng ký
const validateRegister = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Tên người dùng là bắt buộc')
    .matches(/^[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s]+$/)
    .withMessage('Tên người dùng chỉ được chứa chữ cái, số, dấu gạch dưới và khoảng trắng'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email là bắt buộc')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc')
    .isLength({ min: 6, max: 100 })
    .withMessage('Mật khẩu phải có từ 6-100 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải có 10-11 chữ số'),

  body('role')
    .optional()
    .isIn(['mb', 'pm', 'admin'])
    .withMessage('Vai trò không hợp lệ'),

  // Middleware để xử lý kết quả validation
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    }
    next();
  }
];

// Validation middleware cho đăng nhập
const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email là bắt buộc')
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Mật khẩu là bắt buộc'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    }
    next();
  }
];

// Validation middleware cho cập nhật profile
const validateUpdateProfile = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tên người dùng phải có từ 3-50 ký tự')
    .matches(/^[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s]+$/)
    .withMessage('Tên người dùng chỉ được chứa chữ cái, số, dấu gạch dưới và khoảng trắng'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải có 10-11 chữ số'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    }
    next();
  }
];

// Validation middleware cho đổi mật khẩu
const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Mật khẩu hiện tại là bắt buộc'),

  body('newPassword')
    .notEmpty()
    .withMessage('Mật khẩu mới là bắt buộc')
    .isLength({ min: 6, max: 100 })
    .withMessage('Mật khẩu mới phải có từ 6-100 ký tự')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Mật khẩu mới phải chứa ít nhất 1 chữ thường, 1 chữ hoa và 1 số'),

  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: errors.array().map(error => ({
          field: error.path,
          message: error.msg
        }))
      });
    }
    next();
  }
];

module.exports = {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateChangePassword
};
