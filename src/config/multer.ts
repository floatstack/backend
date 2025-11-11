import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
}).single('file');

export const uploadMultiple = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10)) * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
}).array('files');

export default upload;