import express from "express";
import {  ccrvRapidSearchController , ccrvRapidResultController} from "../controllers/ccrv.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/ccrvRapidSearchController", verifyToken, ccrvRapidSearchController);
router.post("/ccrvRapidResultController/:transactionId", verifyToken, ccrvRapidResultController);

export default router;
