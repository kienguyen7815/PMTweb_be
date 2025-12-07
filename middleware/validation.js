const { body, validationResult } = require('express-validator');

// Kiểm tra dữ liệu đầu vào khi đăng ký tài khoản
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

  // Xử lý kết quả validation và trả về lỗi nếu có
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

// Kiểm tra dữ liệu đầu vào khi đăng nhập
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

// Kiểm tra dữ liệu khi cập nhật thông tin cá nhân
const validateUpdateProfile = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Tên người dùng phải có từ 3-50 ký tự')
    .matches(/^[a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s]+$/)
    .withMessage('Tên người dùng chỉ được chứa chữ cái, số, dấu gạch dưới và khoảng trắng'),

  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email không hợp lệ')
    .normalizeEmail(),

  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9]{10,11}$/)
    .withMessage('Số điện thoại phải có 10-11 chữ số'),

  body('id_card')
    .optional()
    .trim()
    .matches(/^[0-9]{9,12}$/)
    .withMessage('Căn cước công dân phải có 9-12 chữ số'),

  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Địa chỉ không được quá 500 ký tự'),

  body('date_of_birth')
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('Ngày sinh phải có định dạng YYYY-MM-DD'),

  body('gender')
    .optional()
    .isIn(['Nam', 'Nữ', 'Không muốn tiết lộ'])
    .withMessage('Giới tính không hợp lệ'),

  body('marital_status')
    .optional()
    .isIn(['Độc thân', 'Đã kết hôn', 'Đã ly hôn', 'Góa chồng', 'Góa vợ'])
    .withMessage('Tình trạng hôn nhân không hợp lệ'),

  body('ethnicity')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Dân tộc không được quá 50 ký tự'),

  body('occupation')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Nghề nghiệp không được quá 100 ký tự'),

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

// Kiểm tra dữ liệu khi đổi mật khẩu
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
