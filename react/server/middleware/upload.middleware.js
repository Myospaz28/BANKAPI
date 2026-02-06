import multer from "multer";
import path from "path";
import fs from "fs";

/* ================= ENSURE UPLOAD DIR ================= */
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

/* ================= STORAGE ================= */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = Date.now() + "-" + file.fieldname + ext.toLowerCase();
    cb(null, safeName);
  },
});

/* ================= FILE FILTER ================= */
const allowedMimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff",
  "image/tif",
];

const fileFilter = (req, file, cb) => {
  console.log("📎 Incoming file:", file.originalname);
  console.log("📎 MIME type:", file.mimetype);

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error("Invalid file type. Allowed: PDF, PNG, JPG, JPEG, TIFF"),
      false,
    );
  }

  cb(null, true);
};

/* ================= MULTER INSTANCE ================= */
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // ✅ 15 MB (Gridlines max)
  },
  fileFilter,
});

export default upload;
