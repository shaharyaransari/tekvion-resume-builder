const multer = require('multer');
const path = require('path');
const fs = require('fs');

const isVercel = !!process.env.VERCEL;

/**
 * Ensure a directory exists, or create it
 * @param {string} dir
 */
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

/**
 * Create a multer instance with dynamic destination and optional filename
 * @param {Object} options
 * @param {string} options.destination - The path to save files
 * @param {string} [options.filenameField] - Optional: `req.body[filenameField]` will be used as filename (extension added automatically)
 * @param {string[]} [options.allowedMimeTypes] - Optional: custom list of allowed MIME types
 * @param {number} [options.maxFileSize] - Optional: max file size in bytes (default 5MB)
 */
const createUploader = ({ destination, filenameField, allowedMimeTypes: customMimes, maxFileSize }) => {
  // On Vercel, use /tmp since the filesystem is read-only
  const resolvedDestination = isVercel ? path.join('/tmp', destination) : destination;
  ensureDir(resolvedDestination);

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, resolvedDestination);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const baseNameFromReq = filenameField && req.body?.[filenameField];
      const safeBaseName = baseNameFromReq
        ? baseNameFromReq.replace(/\s+/g, '_').replace(/[^\w\-]/g, '')
        : path.basename(file.originalname, ext);

      const finalName = baseNameFromReq
        ? `${safeBaseName}${ext}`
        : `${safeBaseName}-${Date.now()}${ext}`;

      cb(null, finalName);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = customMimes || [
      'text/html',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/jpg'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type'), false);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxFileSize || 5 * 1024 * 1024 } // default 5MB
  });
};

module.exports = createUploader;