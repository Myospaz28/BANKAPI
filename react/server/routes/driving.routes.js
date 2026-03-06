import express from "express";
import multer from "multer";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  fetchDrivingLicenseController,
  drivingLicenseOcrController,
  checkDrivingLicenseCache,
  executeDrivingLicenseController,
} from "../controllers/driving.controller.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/fetchDrivingLicense", verifyToken, fetchDrivingLicenseController);

router.post(
  "/drivingLicenseOcr",
  verifyToken,
  upload.fields([
    { name: "file_front", maxCount: 1 },
    { name: "file_back", maxCount: 1 },
  ]),
  drivingLicenseOcrController,
);

// new routes can be added here

router.post("/checkDrivingLicenseCache", verifyToken, checkDrivingLicenseCache);

router.post(
  "/executeDrivingLicense",
  verifyToken,
  executeDrivingLicenseController,
);

export default router;
