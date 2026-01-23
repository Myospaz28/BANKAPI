import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import {
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

export default router;
