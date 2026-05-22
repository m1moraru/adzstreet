import express from "express";
import { signupUser } from "../controllers/usersController.js";

const router = express.Router();

router.post("/signup", signupUser);

export default router;