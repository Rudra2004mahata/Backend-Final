import { Router } from "express";
import {
  addVideoToPlaylist,
  createPlaylist,
  deletePlaylist,
  getPlaylistById,
  getUserPlaylists,
  removeVideoFromPlaylist,
  updatePlaylist,
} from "../controllers/playlist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

/* ---------- PUBLIC ROUTES ---------- */

// Get playlist by ID
router.route("/:playlistId").get(getPlaylistById);

// Get all playlists of a user
router.route("/user/:userId").get(getUserPlaylists);

/* ---------- PROTECTED ROUTES ---------- */
router.use(verifyJWT);

// Create playlist
router.route("/").post(createPlaylist);

// Update / delete playlist
router
  .route("/:playlistId")
  .patch(updatePlaylist)
  .delete(deletePlaylist);

// Add / remove video from playlist
router
  .route("/:playlistId/video/:videoId")
  .patch(addVideoToPlaylist)
  .delete(removeVideoFromPlaylist);

export default router;
