import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads', 'providers');

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, '-').toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (file.fieldname === 'gallery') {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Only image files are allowed in gallery'));
  }

  if (file.fieldname === 'videos') {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    return cb(new Error('Only video files are allowed in videos'));
  }

  cb(new Error('Invalid upload field'));
}

const uploadProviderMedia = multer({
  storage,
  fileFilter,
  limits: {
    files: 9,
    fileSize: 50 * 1024 * 1024, // 50MB each
  },
}).fields([
  { name: 'gallery', maxCount: 6 },
  { name: 'videos', maxCount: 3 },
]);

export default uploadProviderMedia;