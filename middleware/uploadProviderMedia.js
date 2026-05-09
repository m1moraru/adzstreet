import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
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
  storage: multerS3({
    s3: r2,
    bucket: process.env.R2_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,

    key: (_req, file, cb) => {
      const isVideo = file.mimetype.startsWith('video/');
      const folder = isVideo ? 'providers/videos' : 'providers/photos';

      const extension = file.originalname.split('.').pop();
      const filename = `${folder}/${randomUUID()}.${extension}`;

      cb(null, filename);
    },
  }),

  fileFilter,

  limits: {
    files: 9,
    fileSize: 50 * 1024 * 1024,
  },
}).fields([
  { name: 'gallery', maxCount: 6 },
  { name: 'videos', maxCount: 3 },
]);

export default uploadProviderMedia;