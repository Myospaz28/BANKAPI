import express from "express";
import multer from "multer";

import { verifyToken } from "../middleware/auth.middleware.js";
import {
  fetchGenerateMrzController,
  fetchPassportDetailsController,
  fetchPassportOcrController,
  fetchPassportVerifyController,
  fetchVerifyMrzController,
} from "../controllers/passverification.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post(
  "/fetchGenerateMrzController",
  verifyToken,
  fetchGenerateMrzController,
);

router.post(
  "/fetchPassportOcrController",
  verifyToken,
  upload.fields([
    { name: "file_front", maxCount: 1 },
    { name: "file_back", maxCount: 1 },
  ]),
  fetchPassportOcrController,
);

router.post(
  "/fetchPassportDetailsController",
  verifyToken,
  fetchPassportDetailsController,
);

router.post("/fetchVerifyMrzController", verifyToken, fetchVerifyMrzController);

router.post(
  "/fetchPassportVerifyController",
  verifyToken,
  fetchPassportVerifyController,
);

export default router;
