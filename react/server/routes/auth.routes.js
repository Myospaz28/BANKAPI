import express from "express";
import { login, signup,changePassword , updateUserController} from "../controllers/auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/signin", login);
router.post("/signup", signup);
router.post("/change-password", verifyToken, changePassword);
router.put("/update-user", updateUserController);

export default router;
