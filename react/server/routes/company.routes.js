import express from "express";
import { fetchCompanyController, fetchCinByPanController, fetchDirectorController, fetchCompanyByNameController, fetchDinByPanController, fetchTanController } from "../controllers/company.Controller.js";
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
export default router;
