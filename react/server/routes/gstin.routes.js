import express from "express";
import { fetchGstinLiteController , fetchGstinDetailed , fetchGstinByMobileController , fetchGstinContactDetailsController , fetchGstinByPanController , fetchGstinMccCodesController , checkGstinByMobileCacheController , executeGstinByMobileController, executeGstinByPanController, checkGstinByPanCacheController, executeGstinContactController, checkGstinContactCacheController, checkGstinDetailedCacheController, executeGstinDetailedController, checkGstinLiteCacheController, executeGstinLiteController, checkGstinMccCacheController, executeGstinMccController} from "../controllers/gstin.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/fetchGstinLiteController", verifyToken, fetchGstinLiteController);
router.post("/fetchGstinDetailed", verifyToken, fetchGstinDetailed);
router.post("/fetchGstinByMobile", verifyToken, fetchGstinByMobileController);
router.post("/fetchGstinContactDetailsController", verifyToken, fetchGstinContactDetailsController);
router.post("/fetchGstinByPanController", verifyToken, fetchGstinByPanController);
router.post("/fetchGstinMccCodesController", verifyToken, fetchGstinMccCodesController);


//new routes 
router.post("/checkGstinByMobileCache", verifyToken, checkGstinByMobileCacheController);
router.post("/executeGstinByMobile", verifyToken, executeGstinByMobileController);
router.post("/checkGstinByPanCache", verifyToken, checkGstinByPanCacheController);
router.post("/executeGstinByPan", verifyToken, executeGstinByPanController);
router.post("/checkGstinContactCache", verifyToken, checkGstinContactCacheController);
router.post("/executeGstinContact", verifyToken, executeGstinContactController);
router.post("/checkGstinDetailedCache", verifyToken, checkGstinDetailedCacheController);
router.post("/executeGstinDetailed", verifyToken, executeGstinDetailedController);
router.post("/checkGstinLiteCache", verifyToken, checkGstinLiteCacheController);
router.post("/executeGstinLite", verifyToken, executeGstinLiteController);
router.post("/checkGstinMccCache", verifyToken, checkGstinMccCacheController);
router.post("/executeGstinMcc", verifyToken, executeGstinMccController);

export default router;
