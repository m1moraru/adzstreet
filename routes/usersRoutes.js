import express from "express";
import {
  signupUser,
  startIdentityVerification,
} from "../controllers/usersController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signupUser);

router.post(
  "/identity-verification/start",
  requireAuth,
  startIdentityVerification
);

export default router;