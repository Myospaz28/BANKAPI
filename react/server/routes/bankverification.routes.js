import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  fetchBankAccountVerifyController,
  fetchBankAccountVerifyHybridController,
  fetchBankAccountVerifyPennilessController,
  fetchBankStatementOCRController,
  fetchBankStatementReportController,
  fetchChequeOcrController,
  fetchSalarySlipOcrController,
  fetchUploadBankStatementController,
  fetchVerifyIfscController,
} from "../controllers/bankverification.controller.js";

const router = express.Router();

router.post(
  "/fetchBankAccountVerifyHybridController",
  verifyToken,
  fetchBankAccountVerifyHybridController,
);

router.post(
  "/fetchBankAccountVerifyPennilessController",
  verifyToken,
  fetchBankAccountVerifyPennilessController,
);

router.post(
  "/fetchVerifyIfscController",
  verifyToken,
  fetchVerifyIfscController,
);

router.post(
  "/fetchUploadBankStatementController",
  verifyToken,
  upload.single("file"),
  fetchUploadBankStatementController,
);

router.get(
  `/fetchBankStatementReportController`,
  verifyToken,
  fetchBankStatementReportController,
);

router.post(
  "/fetchBankAccountVerifyController",
  verifyToken,
  fetchBankAccountVerifyController,
);

router.post(
  "/fetchBankStatementOCRController",
  verifyToken,
  upload.single("file_front"),
  fetchBankStatementOCRController,
);

router.post(
  "/fetchChequeOcrController",
  verifyToken,
  upload.single("file_front"), // 👈 cheque image / pdf
  fetchChequeOcrController,
);

router.post(
  "/fetchSalarySlipOcrController",
  verifyToken,
  upload.single("file_front"), // salary slip pdf / image
  fetchSalarySlipOcrController,
);

export default router;
