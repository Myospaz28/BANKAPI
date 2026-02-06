import express from "express";
import multer from "multer";
import { fetchVoterDetailsController, voterOcrController, voterMesonInitController, voterMesonFetchController} from "../controllers/voter.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";


const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post(
  "/fetchVoterDetails",
  verifyToken,
  fetchVoterDetailsController
);


router.post(
  "/voterOcr",
  verifyToken,
  upload.fields([
    { name: "file_front", maxCount: 1 },
    { name: "file_back", maxCount: 1 },
  ]),
  voterOcrController
);

router.get(
  "/voterMesonInit",
  verifyToken,
  voterMesonInitController
);

router.post(
  "/voterMesonFetch",
  verifyToken,
  voterMesonFetchController
);

export default router;
