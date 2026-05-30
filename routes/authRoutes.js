import express from "express";
import {
  login,
  logoutProvider,
  getCurrentProvider,
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", login);
router.post("/logout", requireAuth, logoutProvider);
router.get("/me", requireAuth, getCurrentProvider);

export default router;