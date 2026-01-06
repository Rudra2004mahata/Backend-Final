import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * CREATE PLAYLIST
 */
const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        throw new apiError("Name and description are required", 400);
    }

    const playlist = await Playlist.create({
        name,
        description,
        createdBy: req.user._id
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                playlist,
                "Playlist created successfully"
            )
        );
});

/**
 * GET ALL PLAYLISTS OF A USER
 */
const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new apiError("Invalid user ID", 400);
    }

    const playlists = await Playlist.find({ createdBy: userId })
        .populate("videos", "title thubnail duration views")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlists,
                "User playlists fetched successfully"
            )
        );
});

/**
 * GET PLAYLIST BY ID
 */
const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError("Invalid playlist ID", 400);
    }

    const playlist = await Playlist.findById(playlistId)
        .populate("videos")
        .populate("createdBy", "username avatar");

    if (!playlist) {
        throw new apiError("Playlist not found", 404);
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Playlist fetched successfully"
            )
        );
});

/**
 * ADD VIDEO TO PLAYLIST
 */
const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError("Invalid ID provided", 400);
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiError("Playlist not found", 404);
    }

    if (playlist.createdBy.toString() !== req.user._id.toString()) {
        throw new apiError("Unauthorized action", 403);
    }

    if (playlist.videos.includes(videoId)) {
        throw new apiError("Video already exists in playlist", 400);
    }

    playlist.videos.push(videoId);
    await playlist.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Video added to playlist successfully"
            )
        );
});

/**
 * REMOVE VIDEO FROM PLAYLIST
 */
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new apiError("Invalid ID provided", 400);
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiError("Playlist not found", 404);
    }

    if (playlist.createdBy.toString() !== req.user._id.toString()) {
        throw new apiError("Unauthorized action", 403);
    }

    playlist.videos.pull(videoId);
    await playlist.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Video removed from playlist successfully"
            )
        );
});

/**
 * DELETE PLAYLIST
 */
const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!isValidObjectId(playlistId)) {
        throw new apiError("Invalid playlist ID", 400);
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiError("Playlist not found", 404);
    }

    if (playlist.createdBy.toString() !== req.user._id.toString()) {
        throw new apiError("Unauthorized action", 403);
    }

    await playlist.deleteOne();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Playlist deleted successfully"
            )
        );
});

/**
 * UPDATE PLAYLIST (Name / Description)
 */
const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;

    if (!isValidObjectId(playlistId)) {
        throw new apiError("Invalid playlist ID", 400);
    }

    if (!name && !description) {
        throw new apiError("Nothing to update", 400);
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new apiError("Playlist not found", 404);
    }

    if (playlist.createdBy.toString() !== req.user._id.toString()) {
        throw new apiError("Unauthorized action", 403);
    }

    playlist.name = name ?? playlist.name;
    playlist.description = description ?? playlist.description;
    await playlist.save();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Playlist updated successfully"
            )
        );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
};
