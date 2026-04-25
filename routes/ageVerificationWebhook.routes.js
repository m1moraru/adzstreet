import express from "express";
import { stripeIdentityWebhook } from "../controllers/ageVerificationWebhook.controller.js";

const router = express.Router();

router.post(
  "/webhooks/stripe-identity",
  express.raw({ type: "application/json" }),
  stripeIdentityWebhook
);

export default router;