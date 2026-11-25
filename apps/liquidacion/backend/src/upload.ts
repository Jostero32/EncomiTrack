import { randomUUID } from 'crypto';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { badRequest } from './errors';

export const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const ALLOWED_EXT = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

export function ensureUploadsRoot(): void {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const dir = path.join(UPLOADS_DIR, String(req.params.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME.has(file.mimetype) || !ALLOWED_EXT.has(ext)) {
    cb(badRequest('Solo se permiten archivos PDF, JPG o PNG'));
    return;
  }
  cb(null, true);
}

export const uploadDocumento = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
});
