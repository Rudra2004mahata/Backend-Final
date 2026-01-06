import { Router } from "express";
import {
  deleteVideo,
  getAllVideos,
  getVideoById,
  publishAVideo,
  togglePublishStatus,
  updateVideo,
} from "../controllers/video.controller.js";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

/* ================= PUBLIC ROUTES ================= */
// 🔥 Home feed (all videos)
router.get("/", getAllVideos);

// 🔥 Channel videos
router.get("/channel/:channelId", (req, res, next) => {
  req.query.userId = req.params.channelId;
  next();
}, getAllVideos);

// 🔥 Watch single video
router.get("/:videoId", getVideoById);

/* ================= PROTECTED ROUTES ================= */

// 🔥 Publish video - verifyJWT MUST come BEFORE upload middleware
router.post(
  "/",
  verifyJWT,  // ✅ Auth check FIRST
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);

// 🔥 Update video
router.patch(
  "/:videoId",
  verifyJWT,  // ✅ Auth check FIRST
  upload.fields([
    { name: "videoFile", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  updateVideo
);

// 🔥 Delete video
router.delete("/:videoId", verifyJWT, deleteVideo);

// 🔥 Toggle publish status
router.patch("/toggle/publish/:videoId", verifyJWT, togglePublishStatus);

export default router;