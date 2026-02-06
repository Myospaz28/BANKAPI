import express from "express";
import { fetchGstinLiteController , fetchGstinDetailed , fetchGstinByMobileController , fetchGstinContactDetailsController , fetchGstinByPanController , fetchGstinMccCodesController} from "../controllers/gstin.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/fetchGstinLiteController", verifyToken, fetchGstinLiteController);
router.post("/fetchGstinDetailed", verifyToken, fetchGstinDetailed);
router.post("/fetchGstinByMobile", verifyToken, fetchGstinByMobileController);
router.post("/fetchGstinContactDetailsController", verifyToken, fetchGstinContactDetailsController);
router.post("/fetchGstinByPanController", verifyToken, fetchGstinByPanController);
router.post("/fetchGstinMccCodesController", verifyToken, fetchGstinMccCodesController);

export default router;
