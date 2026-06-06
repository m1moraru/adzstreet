//adminUsersRoutes.js
import express from "express";
import {
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  getReportedAds,
} from "../controllers/adminUsersController.js";
import { requireAdminAuth } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.get("/", getAdminUsers);
router.patch("/:id", updateAdminUser);
router.delete("/:id", deleteAdminUser);
router.get("/ads/reports", requireAdminAuth, getReportedAds);

export default router;