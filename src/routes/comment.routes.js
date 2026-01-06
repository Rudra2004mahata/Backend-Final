import { Router } from "express";
import {
  addComment,
  deleteComment,
  getVideoComments,
  updateComment,
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";

const router = Router();

/* ---------- PUBLIC ROUTE ---------- */
// Get all comments of a video
router.route("/:videoId").get(getVideoComments);

/* ---------- PROTECTED ROUTES ---------- */
router.use(verifyJWT);

// Add comment to a video
router.route("/:videoId").post(addComment);

// Update & delete comment
router
  .route("/c/:commentId")
  .patch(updateComment)
  .delete(deleteComment);

export default router;
