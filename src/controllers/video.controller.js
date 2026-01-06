import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

/**
 * ============================
 * GET ALL VIDEOS (HOME FEED)
 * ============================
 */
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const matchStage = { isPublished: true };

  if (query) {
    matchStage.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  if (userId && isValidObjectId(userId)) {
    matchStage.uploadedBy = new mongoose.Types.ObjectId(userId);
  }

  const aggregate = Video.aggregate([
    { $match: matchStage },

    {
      $lookup: {
        from: "users",
        localField: "uploadedBy",
        foreignField: "_id",
        as: "uploadedBy",
        pipeline: [
          { $project: { username: 1, fullName: 1, avatar: 1 } },
        ],
      },
    },
    { $addFields: { uploadedBy: { $arrayElemAt: ["$uploadedBy", 0] } } },

    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    { $project: { likes: 0 } },

    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
  ]);

  const videos = await Video.aggregatePaginate(aggregate, {
    page: Number(page),
    limit: Number(limit),
  });

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

/**
 * ============================
 * GET CHANNEL VIDEOS
 * ============================
 */
const getChannelVideos = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new apiError("Invalid channel ID", 400);
  }

  const aggregate = Video.aggregate([
    {
      $match: {
        uploadedBy: new mongoose.Types.ObjectId(channelId),
        isPublished: true,
      },
    },

    {
      $lookup: {
        from: "users",
        localField: "uploadedBy",
        foreignField: "_id",
        as: "uploadedBy",
        pipeline: [{ $project: { username: 1, avatar: 1 } }],
      },
    },
    { $addFields: { uploadedBy: { $arrayElemAt: ["$uploadedBy", 0] } } },

    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
      },
    },
    { $project: { likes: 0 } },

    { $sort: { createdAt: -1 } },
  ]);

  const videos = await Video.aggregatePaginate(aggregate, {
    page: 1,
    limit: 10,
  });

  return res.status(200).json(
    new ApiResponse(200, videos, "Channel videos fetched successfully")
  );
});

/**
 * ============================
 * PUBLISH VIDEO (FIXED)
 * ============================
 */
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title || !description) {
    throw new apiError("Title and description are required", 400);
  }

  const videoFile = req.files?.videoFile?.[0];
  const thumbnailFile = req.files?.thumbnail?.[0];

  if (!videoFile?.path || !thumbnailFile?.path) {
    throw new apiError("Video and thumbnail are required", 400);
  }

  const videoUpload = await uploadOnCloudinary(videoFile.path);
  const thumbnailUpload = await uploadOnCloudinary(thumbnailFile.path);

  if (!videoUpload?.url || !thumbnailUpload?.url) {
    throw new apiError("Media upload failed", 500);
  }

  const video = await Video.create({
    title,
    description,
    videoFile: videoUpload.url,
    thumbnail: thumbnailUpload.url,
    duration: videoUpload.duration || 0,
    uploadedBy: req.user._id,
    isPublished: true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

/**
 * ============================
 * GET VIDEO BY ID
 * ============================
 */
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new apiError("Invalid video ID", 400);
  }

  const video = await Video.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(videoId), isPublished: true } },

    {
      $lookup: {
        from: "users",
        localField: "uploadedBy",
        foreignField: "_id",
        as: "uploadedBy",
        pipeline: [
          { $project: { username: 1, fullName: 1, avatar: 1 } },
        ],
      },
    },
    { $addFields: { uploadedBy: { $arrayElemAt: ["$uploadedBy", 0] } } },

    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    { $addFields: { likesCount: { $size: "$likes" } } },
    { $project: { likes: 0 } },
  ]);

  if (!video.length) {
    throw new apiError("Video not found", 404);
  }

  await Video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "Video fetched successfully"));
});

/**
 * ============================
 * UPDATE VIDEO
 * ============================
 */
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new apiError("Invalid video ID", 400);
  }

  const video = await Video.findById(videoId);
  if (!video) throw new apiError("Video not found", 404);

  if (video.uploadedBy.toString() !== req.user._id.toString()) {
    throw new apiError("Unauthorized action", 403);
  }

  let thumbnailUrl = video.thumbnail;

  if (req.files?.thumbnail?.[0]?.path) {
    const upload = await uploadOnCloudinary(
      req.files.thumbnail[0].path
    );
    if (upload?.url) thumbnailUrl = upload.url;
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title: title ?? video.title,
        description: description ?? video.description,
        thumbnail: thumbnailUrl,
      },
    },
    { new: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

/**
 * ============================
 * DELETE VIDEO
 * ============================
 */
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) throw new apiError("Video not found", 404);

  if (video.uploadedBy.toString() !== req.user._id.toString()) {
    throw new apiError("Unauthorized action", 403);
  }

  await video.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Video deleted successfully"));
});

/**
 * ============================
 * TOGGLE PUBLISH STATUS
 * ============================
 */
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) throw new apiError("Video not found", 404);

  if (video.uploadedBy.toString() !== req.user._id.toString()) {
    throw new apiError("Unauthorized action", 403);
  }

  video.isPublished = !video.isPublished;
  await video.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      { isPublished: video.isPublished },
      "Publish status updated"
    )
  );
});

export {
  getAllVideos,
  getChannelVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};