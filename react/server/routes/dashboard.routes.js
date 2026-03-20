import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getTodayCreditsUsedController, getTodayServicesUsedCountController, getTopApiUsersController, getTotalActiveServicesController, getTotalCreditsUsedController, getUsersCountController, getUserServiceLogsCountController } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/getUserServiceLogsCount", verifyToken, getUserServiceLogsCountController);
router.get("/getUsersCount", verifyToken, getUsersCountController);
router.get("/getTodayCreditsUsed", verifyToken, getTodayCreditsUsedController);
router.get("/getTopApiUsers", verifyToken, getTopApiUsersController);
router.get("/getTotalActiveServices", verifyToken, getTotalActiveServicesController);
router.get("/getTodayServicesUsedCount", verifyToken, getTodayServicesUsedCountController);
router.get("/getTotalCreditsUsed", verifyToken, getTotalCreditsUsedController);

export default router;