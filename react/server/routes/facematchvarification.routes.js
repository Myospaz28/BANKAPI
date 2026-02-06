import express from "express";
import upload from "../middleware/upload.middleware.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { fetchFaceMatchController } from "../controllers/facematchvarification.controller.js";

const router = express.Router();
router.post(
  "/fetchFaceMatchController",
  verifyToken,
  upload.fields([
    { name: "file_1", maxCount: 1 },
    { name: "file_2", maxCount: 1 },
  ]),
  fetchFaceMatchController,
);
export default router;
