import multer from "multer";

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
]);

/*
Multer receives the uploaded files from the frontend, parses the multipart/form-data request, 
and because you're using memoryStorage(), it stores each uploaded file as a Buffer in 
RAM and attaches them to req.files.
 */

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit per file
        files: 10,                  // Maximum 10 files
    },
    fileFilter: (_req, file, cb) => {
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type "${file.mimetype}" for "${file.originalname}". Only image files (JPEG, PNG, WebP, GIF) are allowed.`));
        }
    },
});
