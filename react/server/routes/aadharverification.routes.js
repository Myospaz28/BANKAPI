import express from "express";
import upload from "../middleware/upload.middleware.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  fetchAadhaarOcrV2Controller,
  fetchAadhaarUidMaskingController,
} from "../controllers/aadharverification.controller.js";

const router = express.Router();

router.post(
  "/fetchAadhaarUidMaskingController",
  verifyToken,
  upload.single("file_front"),
  fetchAadhaarUidMaskingController,
);

router.post(
  "/fetchAadhaarOcrV2Controller",
  verifyToken,
  upload.fields([
    { name: "file_front", maxCount: 1 },
    { name: "file_back", maxCount: 1 },
  ]),
  fetchAadhaarOcrV2Controller,
);

export default router;
