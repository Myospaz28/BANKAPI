import express from "express";
import { fetchCompanyController, fetchCinByPanController, fetchDirectorController, fetchCompanyByNameController, fetchDinByPanController, fetchTanController, checkCinByPanCacheController, executeCinByPanController, checkCompanyCacheController, executeCompanyController, checkCompanyByNameCacheController, executeCompanyByNameController, checkDinByPanCacheController, executeDinByPanController, checkDirectorCacheController, executeDirectorFetchController, checkTanCacheController, executeTanController } from "../controllers/company.Controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/fetchCompany",
  verifyToken,
  fetchCompanyController
);

router.post("/fetchCinByPan", verifyToken, fetchCinByPanController);

router.post("/fetchDirector", verifyToken, fetchDirectorController);

router.post(
  "/fetchCompanyByName",
  verifyToken,
  fetchCompanyByNameController
);

router.post("/fetchDinByPanController", verifyToken, fetchDinByPanController);

router.post("/fetchTan", verifyToken, fetchTanController);
router.post("/checkCinByPanCache", verifyToken, checkCinByPanCacheController);
router.post("/executeCinByPan", verifyToken, executeCinByPanController);
router.post("/checkCompanyCache", verifyToken, checkCompanyCacheController);
router.post("/executeCompany", verifyToken, executeCompanyController);
router.post("/checkCompanyByNameCache", verifyToken, checkCompanyByNameCacheController);
router.post("/executeCompanyByName", verifyToken, executeCompanyByNameController);
router.post("/checkDinByPanCache", verifyToken, checkDinByPanCacheController);
router.post("/executeDinByPan", verifyToken, executeDinByPanController);
router.post("/checkDirectorCache", verifyToken, checkDirectorCacheController);
router.post("/executeDirectorFetch", verifyToken, executeDirectorFetchController);
router.post("/checkTanCache", verifyToken, checkTanCacheController);
router.post("/executeTan", verifyToken, executeTanController);
export default router;
