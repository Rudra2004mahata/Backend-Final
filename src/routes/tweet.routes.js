import { Router } from "express";
import {
  createTweet,
  deleteTweet,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/* ---------- PUBLIC ROUTES ---------- */

// Get tweets of a user
router.route("/user/:userId").get(getUserTweets);

/* ---------- PROTECTED ROUTES ---------- */

// Create tweet
router.route("/")
  .post(verifyJWT, createTweet);

// Update & delete tweet
router.route("/:tweetId")
  .patch(verifyJWT, updateTweet)
  .delete(verifyJWT, deleteTweet);

export default router;
