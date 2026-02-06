import express from "express";
import { fetchPersonalProfileController , fetchNationalIdsByPhoneController , fetchAddressByPhoneController , fetchPanByPhoneController , mobileLookupController , mobileNumberAgeController , digitalFootprintController , checkEntityLinkageController , fetchElectricityBillController , fetchMobilePrefillController , fetchMobileNameLookupController , panLookupByMobileController} from "../controllers/profileLookup.controller.js";
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

export default router;
