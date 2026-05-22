import express from "express";
import {
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
} from "../controllers/adminUsersController.js";

const router = express.Router();

router.get("/", getAdminUsers);
router.patch("/:id", updateAdminUser);
router.delete("/:id", deleteAdminUser);

export default router;