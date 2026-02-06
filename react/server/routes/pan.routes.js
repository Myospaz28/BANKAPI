import express from "express";
import { fetchPanDetailedController,fetchPanLiteController, fetchPanNameController, verifyBusinessPanController, validatePanController, fetchPanEssentialsController, pullPanDigilockerController } from "../controllers/pan.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/pan/fetchDetailed", verifyToken, fetchPanDetailedController);

router.post("/fetchLite", verifyToken, fetchPanLiteController);

router.post('/fetchName', verifyToken, fetchPanNameController);

router.post('/verifyBusinessPan', verifyToken, verifyBusinessPanController,);

router.post('/validatePan', verifyToken, validatePanController);

router.post(
  '/pan/fetchEssentials',
  verifyToken,
  fetchPanEssentialsController
);

router.post('/pan/digilocker/pull',verifyToken,pullPanDigilockerController,);

export default router;
