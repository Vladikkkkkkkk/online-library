const multer = require('multer');
const path = require('path');
const config = require('../config');
const ApiError = require('../utils/ApiError');


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.uploadDir);
  },
  filename: (req, file, cb) => {

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});


const bookFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);

  if (config.upload.allowedFormats.includes(ext)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest(
      `Invalid file format. Allowed formats: ${config.upload.allowedFormats.join(', ')}`
    ), false);
  }
};


const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Invalid image format. Allowed: JPEG, PNG, GIF, WebP'), false);
  }
};


const uploadBook = multer({
  storage,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
  fileFilter: bookFileFilter,
});


const uploadImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/images');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, 
  },
  fileFilter: imageFileFilter,
});

module.exports = {
  uploadBook,
  uploadImage,
};

