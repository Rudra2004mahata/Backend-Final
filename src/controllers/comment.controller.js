import mongoose, { isValidObjectId } from "mongoose";
import { Comment } from "../models/comment.model.js";
import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * ============================
 * GET COMMENTS (PAGINATED + REPLIES)
 * ============================
 */
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 5 } = req.query;

  if (!isValidObjectId(videoId)) {
    throw new apiError("Invalid video ID", 400);
  }

  const userId = req.user?._id
    ? new mongoose.Types.ObjectId(req.user._id)
    : null;

  const aggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
        parentComment: null,
      },
    },

    /* OWNER */
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [{ $project: { username: 1, avatar: 1 } }],
      },
    },
    { $addFields: { owner: { $arrayElemAt: ["$owner", 0] } } },

    /* COMMENT LIKES */
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: { $size: "$likes" },
        isLikedByCurrentUser: userId
          ? { $in: [userId, "$likes.LikedBy"] }
          : false,
      },
    },

    /* REPLIES */
    {
      $lookup: {
        from: "comments",
        let: { commentId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$parentComment", "$$commentId"] },
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [{ $project: { username: 1 } }],
            },
          },
          { $addFields: { owner: { $arrayElemAt: ["$owner", 0] } } },
        ],
        as: "replies",
      },
    },

    { $project: { likes: 0 } },
    { $sort: { createdAt: -1 } },
  ]);

  const comments = await Comment.aggregatePaginate(aggregate, {
    page: Number(page),
    limit: Number(limit),
  });

  return res.status(200).json(
    new ApiResponse(200, comments, "Comments fetched successfully")
  );
});

/**
 * ============================
 * ADD COMMENT / REPLY
 * ============================
 */
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content, parentComment } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new apiError("Invalid video ID", 400);
  }

  if (!content?.trim()) {
    throw new apiError("Comment content is required", 400);
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
    parentComment: parentComment || null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

/**
 * ============================
 * UPDATE COMMENT
 * ============================
 */
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!isValidObjectId(commentId)) {
    throw new apiError("Invalid comment ID", 400);
  }

  if (!content?.trim()) {
    throw new apiError("Updated content is required", 400);
  }

  const comment = await Comment.findById(commentId);
  if (!comment) throw new apiError("Comment not found", 404);

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new apiError("Unauthorized action", 403);
  }

  comment.content = content;
  await comment.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(200, comment, "Comment updated successfully")
  );
});

/**
 * ============================
 * DELETE COMMENT
 * ============================
 */
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  if (!isValidObjectId(commentId)) {
    throw new apiError("Invalid comment ID", 400);
  }

  const comment = await Comment.findById(commentId);
  if (!comment) throw new apiError("Comment not found", 404);

  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new apiError("Unauthorized action", 403);
  }

  await comment.deleteOne();

  return res.status(200).json(
    new ApiResponse(200, null, "Comment deleted successfully")
  );
});

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
};