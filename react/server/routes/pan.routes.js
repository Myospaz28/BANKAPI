import express from "express";
import { fetchPanDetailedController,fetchPanLiteController } from "../controllers/pan.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/pan/fetchDetailed",
  verifyToken,
  fetchPanDetailedController
);

router.post("/fetchLite", verifyToken, fetchPanLiteController);

export default router;
