import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import {
  fetchBankAccountVerifyHybridController,
  fetchBankAccountVerifyPennilessController,
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

export default router;
