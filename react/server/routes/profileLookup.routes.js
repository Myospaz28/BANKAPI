import express from "express";
import { fetchPersonalProfileController , fetchNationalIdsByPhoneController , fetchAddressByPhoneController , fetchPanByPhoneController , mobileLookupController , mobileNumberAgeController , digitalFootprintController , checkEntityLinkageController , fetchElectricityBillController , fetchMobilePrefillController , fetchMobileNameLookupController , panLookupByMobileController, checkEntityLinkageCacheController, executeEntityLinkageController, checkDigitalFootprintCacheController, executeDigitalFootprintController, checkElectricityBillCacheController, executeElectricityBillController, checkNationalIdsByPhoneCacheController, executeNationalIdsByPhoneController, checkPanByPhoneCacheController, executePanByPhoneController, checkPersonalProfileCacheController, executePersonalProfileController, checkMobileAgeCacheController, executeMobileAgeController, checkMobileLookupCacheController, executeMobileLookupController, checkMobilePrefillCacheController, executeMobilePrefillController, checkMobileNameLookupCacheController, executeMobileNameLookupController, checkPanLookupByMobileCacheController, executePanLookupByMobileController} from "../controllers/profileLookup.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";


const router = express.Router();

router.post("/fetchPersonalProfileController", verifyToken, fetchPersonalProfileController);
router.post("/fetchNationalIdsByPhoneController", verifyToken, fetchNationalIdsByPhoneController);
router.post("/fetchAddressByPhoneController", verifyToken, fetchAddressByPhoneController);
router.post("/fetchPanByPhoneController", verifyToken, fetchPanByPhoneController);
router.post("/mobileLookupController", verifyToken, mobileLookupController);
router.post("/mobileNumberAgeController", verifyToken, mobileNumberAgeController);
router.post("/digitalFootprintController", verifyToken, digitalFootprintController);
router.post("/checkEntityLinkageController", verifyToken, checkEntityLinkageController);
router.post("/fetchElectricityBillController", verifyToken, fetchElectricityBillController);
router.post("/fetchMobilePrefillController", verifyToken, fetchMobilePrefillController);
router.post("/fetchMobileNameLookupController", verifyToken, fetchMobileNameLookupController);
router.post("/panLookupByMobileController", verifyToken, panLookupByMobileController);
router.post("/checkEntityLinkageCache", verifyToken, checkEntityLinkageCacheController);
router.post("/executeEntityLinkage", verifyToken, executeEntityLinkageController);
router.post("/checkDigitalFootprintCache", verifyToken, checkDigitalFootprintCacheController);
router.post("/executeDigitalFootprint", verifyToken, executeDigitalFootprintController);
router.post("/checkElectricityBillCache", verifyToken, checkElectricityBillCacheController);
router.post("/executeElectricityBill", verifyToken, executeElectricityBillController);
router.post("/checkNationalIdsByPhoneCache", verifyToken, checkNationalIdsByPhoneCacheController);
router.post("/executeNationalIdsByPhone", verifyToken, executeNationalIdsByPhoneController);
router.post("/checkPanByPhoneCache", verifyToken, checkPanByPhoneCacheController);
router.post("/executePanByPhone", verifyToken, executePanByPhoneController);
router.post("/checkPersonalProfileCache", verifyToken, checkPersonalProfileCacheController);
router.post("/executePersonalProfile", verifyToken, executePersonalProfileController);
router.post("/checkMobileAgeCache", verifyToken, checkMobileAgeCacheController);
router.post("/executeMobileAge", verifyToken, executeMobileAgeController);
router.post("/checkMobileLookupCache", verifyToken, checkMobileLookupCacheController);
router.post("/executeMobileLookup", verifyToken, executeMobileLookupController);
router.post("/checkMobilePrefillCache", verifyToken, checkMobilePrefillCacheController);
router.post("/executeMobilePrefill", verifyToken, executeMobilePrefillController);
router.post("/checkMobileNameLookupCache", verifyToken, checkMobileNameLookupCacheController);
router.post("/executeMobileNameLookup", verifyToken, executeMobileNameLookupController);
router.post("/checkPanLookupByMobileCache", verifyToken, checkPanLookupByMobileCacheController);
router.post("/executePanLookupByMobile", verifyToken, executePanLookupByMobileController);

export default router;
