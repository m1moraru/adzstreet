import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  deleteUserAccount,
  deleteProviderAccount,
} from "../controllers/accountController.js";

const router = express.Router();

router.delete("/user", requireAuth, deleteUserAccount);
router.delete("/provider", requireAuth, deleteProviderAccount);

export default router;