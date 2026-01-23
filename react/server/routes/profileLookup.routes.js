import express from "express";
import { fetchPersonalProfileController , fetchNationalIdsByPhoneController , fetchAddressByPhoneController , fetchPanByPhoneController} from "../controllers/profileLookup.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";


const router = express.Router();

router.post("/fetchPersonalProfileController", verifyToken, fetchPersonalProfileController);
router.post("/fetchNationalIdsByPhoneController", verifyToken, fetchNationalIdsByPhoneController);
router.post("/fetchAddressByPhoneController", verifyToken, fetchAddressByPhoneController);
router.post("/fetchPanByPhoneController", verifyToken, fetchPanByPhoneController);

export default router;
