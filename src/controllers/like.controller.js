import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * TOGGLE LIKE ON VIDEO
 */
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(videoId)) {
    throw new apiError("Invalid video ID", 400);
  }

  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId, // ✅ FIXED
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Video unliked"));
  }

  await Like.create({
    video: videoId,
    likedBy: userId, // ✅ FIXED
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Video liked"));
});

/**
 * TOGGLE LIKE ON COMMENT
 */
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(commentId)) {
    throw new apiError("Invalid comment ID", 400);
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId, // ✅ FIXED
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Comment unliked"));
  }

  await Like.create({
    comment: commentId,
    likedBy: userId, // ✅ FIXED
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Comment liked"));
});

/**
 * TOGGLE LIKE ON TWEET
 */
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user._id;

  if (!isValidObjectId(tweetId)) {
    throw new apiError("Invalid tweet ID", 400);
  }

  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: userId, // ✅ FIXED
  });

  if (existingLike) {
    await existingLike.deleteOne();
    return res
      .status(200)
      .json(new ApiResponse(200, { liked: false }, "Tweet unliked"));
  }

  await Like.create({
    tweet: tweetId,
    likedBy: userId, // ✅ FIXED
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { liked: true }, "Tweet liked"));
});

/**
 * GET ALL LIKED VIDEOS OF CURRENT USER
 */
const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId), // ✅ FIXED
        video: { $exists: true },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $addFields: {
        video: { $arrayElemAt: ["$video", 0] },
      },
    },
    {
      $project: {
        _id: 0,
        video: 1,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      likedVideos.map((v) => v.video),
      "Liked videos fetched successfully"
    )
  );
});

export {
  toggleVideoLike,
  toggleCommentLike,
  toggleTweetLike,
  getLikedVideos,
};