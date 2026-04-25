import express from "express";
import { sendVerificationLink } from "../controllers/ageVerificationController.js";

const router = express.Router();

router.post(
  "/admin/providers/:id/send-verification-link",
  sendVerificationLink
);

export default router;