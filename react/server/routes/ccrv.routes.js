import express from "express";
import {  ccrvRapidSearchController , ccrvRapidResultController, checkCcrvRapidCacheController, executeCcrvRapidController, gridlinesCcrvCallbackController, getCcrvResultController} from "../controllers/ccrv.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/ccrvRapidSearchController", verifyToken, ccrvRapidSearchController);
// router.post("/ccrvRapidResultController/:transactionId", verifyToken, ccrvRapidResultController);
router.post("/checkCcrvRapidCache", verifyToken, checkCcrvRapidCacheController);
router.post("/executeCcrvRapid", verifyToken, executeCcrvRapidController);
router.get("/getCcrvResult/:transactionId", verifyToken, getCcrvResultController);
router.post(
  "/gridlines/ccrv",
  gridlinesCcrvCallbackController
);

export default router;
