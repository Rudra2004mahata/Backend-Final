import { Router } from "express";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleVideoLike,
  toggleTweetLike,
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

/* ---------- PROTECTED ROUTES ---------- */
router.use(verifyJWT);

// Toggle likes
router.route("/video/:videoId").patch(toggleVideoLike);
router.route("/comment/:commentId").patch(toggleCommentLike);
router.route("/tweet/:tweetId").patch(toggleTweetLike);

// Get liked videos of current user
router.route("/videos").get(getLikedVideos);

export default router;
