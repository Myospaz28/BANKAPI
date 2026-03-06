import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  checkMSMEPanCache,
  checkUdyamMobileCache,
  checkVerifyUdyamAdvancedCache,
  executeMSMEPanController,
  executeUdyamMobileController,
  executeVerifyUdyamAdvancedController,
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

// new routes can be added here

/* ===== EXECUTE UDYAM ===== */
router.post("/checkUdyamMobileCache", verifyToken, checkUdyamMobileCache);

router.post("/executeUdyamMobile", verifyToken, executeUdyamMobileController);

router.post("/checkMSMEPanCache", verifyToken, checkMSMEPanCache);
router.post("/executeMSMEPan", verifyToken, executeMSMEPanController);

router.post(
  "/checkVerifyUdyamAdvancedCache",
  verifyToken,
  checkVerifyUdyamAdvancedCache,
);

router.post(
  "/executeVerifyUdyamAdvanced",
  verifyToken,
  executeVerifyUdyamAdvancedController,
);

export default router;
