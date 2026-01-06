import { Router } from "express";
import {
  toggleSubscription,
  checkSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
  getChannelSubscriptionStats
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

/* ============================
 * PUBLIC ROUTES
 * ============================
 */
// Channel subscriber count (PUBLIC)
router.get(
  "/stats/:channelId",
  getChannelSubscriptionStats
);

// Get subscribers of a channel
router.get("/channel/:channelId", getUserChannelSubscribers);

// Get channels a user has subscribed to
router.get("/user/:subscriberId", getSubscribedChannels);

/* ============================
 * PROTECTED ROUTES
 * ============================
 */

// Check subscription status (for Subscribe button state)
router.get("/check/:channelId", verifyJWT, checkSubscription);

// Subscribe / Unsubscribe
router.patch("/toggle/:channelId", verifyJWT, toggleSubscription);

export default router;