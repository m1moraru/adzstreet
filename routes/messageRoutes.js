import express from "express";
import {
  startConversation,
  getMyConversations,
  getConversationMessages,
  sendMessage,
} from "../controllers/messageController.js";

import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/start", requireAuth, startConversation);
router.get("/", requireAuth, getMyConversations);
router.get("/:conversationId", requireAuth, getConversationMessages);
router.post("/:conversationId", requireAuth, sendMessage);

export default router;