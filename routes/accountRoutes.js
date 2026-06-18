import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  deleteUserAccount,
  deleteProviderAccount,
  updateAccountEmail,
  updateAccountPassword,
} from "../controllers/accountController.js";

const router = express.Router();

router.delete("/user", requireAuth, deleteUserAccount);
router.delete("/provider", requireAuth, deleteProviderAccount);

router.patch("/account/email", updateAccountEmail);
router.patch("/account/password", updateAccountPassword);

export default router;