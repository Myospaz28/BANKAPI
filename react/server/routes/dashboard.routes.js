import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getUserServiceLogsCountController } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/getUserServiceLogsCount", verifyToken, getUserServiceLogsCountController);


export default router;