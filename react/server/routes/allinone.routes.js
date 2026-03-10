import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import { checkUnifiedMobileLookupCacheController, executeUnifiedMobileLookupController } from "../controllers/allinone.controller.js";

const router = express.Router();



router.post("/checkUnifiedMobileLookupCache", verifyToken, checkUnifiedMobileLookupCacheController);
router.post("/executeUnifiedMobileLookup",  verifyToken,   executeUnifiedMobileLookupController);


export default router;