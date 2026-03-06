import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";
import {
  checkBankAccountVerify,
  checkBankAccountVerifyCacheController,
  checkBankAccountVerifyPennilessCacheController,
  checkVerifyIfscCacheController,
  executeBankAccountVerifyController,
  executeBankAccountVerifyHybridController,
  executeBankAccountVerifyPennilessController,
  executeVerifyIfscController,
  fetchBankStatementOCRController,
  fetchBankStatementReportController,
  fetchChequeOcrController,
  fetchSalarySlipOcrController,
  fetchUploadBankStatementController,
} from "../controllers/bankverification.controller.js";

const router = express.Router();

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

// new routes to be added here

router.post(
  "/executeBankAccountVerifyHybrid",
  verifyToken,
  executeBankAccountVerifyHybridController,
);
router.post(
  "/checkBankAccountVerifyCache",
  verifyToken,
  checkBankAccountVerifyCacheController,
);

router.post(
  "/checkBankAccountVerifyPennilessCache",
  verifyToken,
  checkBankAccountVerifyPennilessCacheController,
);

router.post(
  "/executeBankAccountVerifyPenniless",
  verifyToken,
  executeBankAccountVerifyPennilessController,
);

router.post(
  "/checkVerifyIfscCache",
  verifyToken,
  checkVerifyIfscCacheController,
);

router.post("/executeVerifyIfsc", verifyToken, executeVerifyIfscController);

router.post(
  "/checkBankAccountVerifyCache",
  verifyToken,
  checkBankAccountVerify,
);

router.post(
  "/executeBankAccountVerify",
  verifyToken,
  executeBankAccountVerifyController,
);

export default router;
