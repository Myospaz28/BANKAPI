import express from "express";
import {
  fetchPanDetailedController,
  fetchPanLiteController,
  fetchPanNameController,
  verifyBusinessPanController,
  validatePanController,
  fetchPanEssentialsController,
  pullPanDigilockerController,
  checkPanNameCache,
  executePanNameController,
  checkPanDetailedCache,
  executePanDetailedController,
  checkPanEssentialsCache,
  executePanEssentialsController,
  checkPanLiteCache,
  executePanLiteController,
  checkPanValidateCache,
  executePanValidateController,
  checkBusinessPanCache,
  executeBusinessPanController,
} from "../controllers/pan.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/pan/fetchDetailed", verifyToken, fetchPanDetailedController);

router.post("/fetchLite", verifyToken, fetchPanLiteController);

router.post("/fetchName", verifyToken, fetchPanNameController);

router.post("/verifyBusinessPan", verifyToken, verifyBusinessPanController);

router.post("/validatePan", verifyToken, validatePanController);

router.post("/pan/fetchEssentials", verifyToken, fetchPanEssentialsController);

router.post("/pan/digilocker/pull", verifyToken, pullPanDigilockerController);

// new routes can be added here

router.post("/checkPanNameCache", verifyToken, checkPanNameCache);

router.post("/executePanName", verifyToken, executePanNameController);

router.post("/checkPanDetailedCache", verifyToken, checkPanDetailedCache);

router.post("/executePanDetailed", verifyToken, executePanDetailedController);

router.post("/checkPanEssentialsCache", verifyToken, checkPanEssentialsCache);

router.post(
  "/executePanEssentials",
  verifyToken,
  executePanEssentialsController,
);

router.post("/checkPanLiteCache", verifyToken, checkPanLiteCache);

router.post("/executePanLite", verifyToken, executePanLiteController);

router.post("/checkPanValidateCache", verifyToken, checkPanValidateCache);

router.post("/executePanValidate", verifyToken, executePanValidateController);
router.post("/checkBusinessPanCache", verifyToken, checkBusinessPanCache);

router.post("/executeBusinessPan", verifyToken, executeBusinessPanController);

export default router;
