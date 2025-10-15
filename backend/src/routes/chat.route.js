import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getStreamToken, ensureStreamUsers } from "../controllers/chat.controller.js";

const router = express.Router();

router.get("/token", protectRoute, getStreamToken);
router.post("/ensure-users", protectRoute, ensureStreamUsers);

export default router;
