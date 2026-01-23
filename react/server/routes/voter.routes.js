import express from "express";
import { fetchVoterDetailsController, fetchMesonVoterController, generateMesonCaptcha } from "../controllers/voter.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/fetchVoterDetails",
  verifyToken,
  fetchVoterDetailsController
);

router.post('/meson/captcha', verifyToken, generateMesonCaptcha);
router.post("/fetchMeson", verifyToken, fetchMesonVoterController);

export default router;
