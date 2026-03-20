import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import {
  checkEmployerVerifyCache,
  checkEmploymentHistoryCache,
  checkLatestEmploymentCache,
  checkLatestPassbookCache,
  checkUanMobileCache,
  checkUanPanCache,
  checkUanProfileCache,
  executeEmployerVerifyController,
  executeEmploymentHistoryController,
  executeLatestEmploymentController,
  executeLatestPassbookController,
  executeUanMobileController,
  executeUanPanController,
  executeUanProfileController,
  fetchEmployerVerifyController,
  fetchEmploymentHistoryByUanController,
  fetchLatestEmploymentByMobileController,
  fetchLatestPassbookByMobileController,
  fetchUanProfileDetailsController,
} from "../controllers/employeservice.controller.js";

const router = express.Router();

router.post(
  "/fetchEmploymentHistoryByUanController",
  verifyToken,
  fetchEmploymentHistoryByUanController,
);

router.post(
  "/fetchLatestEmploymentByMobileController",
  verifyToken,
  fetchLatestEmploymentByMobileController,
);

router.post(
  "/fetchLatestPassbookByMobileController",
  verifyToken,
  fetchLatestPassbookByMobileController,
);

router.post(
  "/fetchUanProfileDetailsController",
  verifyToken,
  fetchUanProfileDetailsController,
);

router.post(
  "/fetchEmployerVerifyController",
  verifyToken,
  fetchEmployerVerifyController,
);

// new routes can be added here
/* ===== EXECUTE FETCH ===== */
router.post(
  "/checkEmploymentHistoryCache",
  verifyToken,
  checkEmploymentHistoryCache,
);

router.post(
  "/executeEmploymentHistory",
  verifyToken,
  executeEmploymentHistoryController,
);

/* ===== EXECUTE SERVICE ===== */

router.post(
  "/checkLatestEmploymentCache",
  verifyToken,
  checkLatestEmploymentCache,
);

router.post(
  "/executeLatestEmployment",
  verifyToken,
  executeLatestEmploymentController,
);

/* ================= EXECUTE SERVICE ================= */

router.post("/checkLatestPassbookCache", verifyToken, checkLatestPassbookCache);

router.post(
  "/executeLatestPassbook",
  verifyToken,
  executeLatestPassbookController,
);

/* ================= EXECUTE UAN PROFILE ================= */
router.post("/checkUanProfileCache", verifyToken, checkUanProfileCache);

router.post("/executeUanProfile", verifyToken, executeUanProfileController);

/* ================= EMPLOYER VERIFY CACHE ================= */
router.post("/checkEmployerVerifyCache", verifyToken, checkEmployerVerifyCache);

router.post(
  "/executeEmployerVerify",
  verifyToken,
  executeEmployerVerifyController,
);


router.post("/checkUanMobileCache", verifyToken, checkUanMobileCache);
router.post("/executeUanMobile", verifyToken, executeUanMobileController);

router.post("/checkUanPanCache", verifyToken, checkUanPanCache);
router.post("/executeUanPan", verifyToken, executeUanPanController);

export default router;
