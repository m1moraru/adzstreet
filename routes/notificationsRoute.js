import express from "express";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../controllers/notificationsController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getNotifications);
router.get("/unread-count", requireAuth, getUnreadNotificationCount);
router.patch("/:id/read", requireAuth, markNotificationRead);
router.patch("/read-all", requireAuth, markAllNotificationsRead);
router.delete("/:id", requireAuth, deleteNotification);

export default router;