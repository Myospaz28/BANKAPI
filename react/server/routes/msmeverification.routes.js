import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  fetchMSMEByPanController,
  fetchUdyamByMobileController,
  fetchUdyamCertificateOcrController,
  fetchVerifyUdyamAdvancedController,
} from "../controllers/msmeverification.controller.js";

const router = express.Router();

router.post(
  "/fetchUdyamByMobileController",
  verifyToken,
  fetchUdyamByMobileController,
);

router.post("/fetchMSMEByPanController", verifyToken, fetchMSMEByPanController);

router.post(
  "/fetchVerifyUdyamAdvancedController",
  verifyToken,
  fetchVerifyUdyamAdvancedController,
);

router.post(
  "/fetchUdyamCertificateOcrController",
  verifyToken,
  upload.single("file_front"),
  fetchUdyamCertificateOcrController,
);

export default router;
