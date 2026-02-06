import express from "express";
import {  getActiveMasterServicesByCategory , getAllUserRoles , getUsersController , getUserServicesByUserId , getAvailableMasterServicesByCategoryForUser , addUserServicesBulk , deactivateUserService , updateUserServiceCredits ,addUserWalletAmount , getUserWallet , getUserActiveCategories ,getLoggedInUserWallet , getUserActiveServicesByCategory , fetchRcDetailedController , fetchRcLookupByMobileController , fetchRcLiteController , fetchRcContactController , getUserWalletCreditHistory , getUserWalletStatementController , fetchVehicleRegByChassisController , fetchFastagDetailedController , fetchRcEchallanController , fetchRcDetailedByChassisController , getUserSessionTimesController , getLoggedInUserController , getUserAccessDetailsController} from "../controllers/services.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import { accessWindowMiddleware } from "../middleware/checkAccessWindow.middleware.js";


const router = express.Router();

router.get("/getActiveMasterServicesByCategory", getActiveMasterServicesByCategory);
router.get("/getAllUserRoles", getAllUserRoles);
router.get("/getUsersController",verifyToken, getUsersController);
// router.get("/getUserServicesByUserId/:userId", getUserServicesByUserId);
router.get("/getUserServicesByUserId/:userId", getUserServicesByUserId);
router.get("/getAvailableMasterServicesByCategoryForUser/:userId", getAvailableMasterServicesByCategoryForUser);
router.post("/addUserServicesBulk",verifyToken, addUserServicesBulk);
router.put("/deactivateUserService/:usr_ser_id", verifyToken , deactivateUserService);
router.put("/updateUserServiceCredits",verifyToken, updateUserServiceCredits);
router.get("/getUserWallet/:userId", verifyToken, getUserWallet);
router.post("/addUserWalletAmount", verifyToken, addUserWalletAmount);
router.get("/getUserActiveCategories", verifyToken ,getUserActiveCategories);
router.get("/getLoggedInUserWallet", verifyToken, getLoggedInUserWallet);
router.get("/getUserActiveServicesByCategory/:mas_cat_id", verifyToken, getUserActiveServicesByCategory);
router.post("/fetchRcDetailed", verifyToken, fetchRcDetailedController);
router.post("/fetchRcLookupByMobileController", verifyToken, fetchRcLookupByMobileController);
router.post("/fetchRcLiteController", verifyToken, fetchRcLiteController);
router.post("/fetchRcContactController", verifyToken, fetchRcContactController);
router.get("/getUserWalletCreditHistory/:userId", verifyToken, getUserWalletCreditHistory);
router.get("/getUserWalletStatement/:userId", verifyToken, getUserWalletStatementController);
router.post("/fetchVehicleRegByChassisController", verifyToken, fetchVehicleRegByChassisController);
router.post("/fetchFastagDetailedController", verifyToken, fetchFastagDetailedController);
router.post("/fetchRcEchallanController", verifyToken, fetchRcEchallanController);
router.post("/fetchRcDetailedByChassisController", verifyToken, fetchRcDetailedByChassisController);
router.post("/getUserSessionTimesController", verifyToken, getUserSessionTimesController);
router.get("/getLoggedInUserController", verifyToken, getLoggedInUserController);
router.get("/getUserAccessDetailsController", verifyToken, getUserAccessDetailsController);


export default router;
