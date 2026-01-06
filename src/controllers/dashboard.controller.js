import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * GET CHANNEL STATS
 */
const getChannelStats = asyncHandler(async (req, res) => {
    const channelId = req.user._id;

    /* ---------- TOTAL VIDEOS & VIEWS ---------- */
    const videoStats = await Video.aggregate([
        {
            $match: {
                uploadedBy: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $group: {
                _id: null,
                totalVideos: { $sum: 1 },
                totalViews: { $sum: "$views" }
            }
        }
    ]);

    /* ---------- TOTAL SUBSCRIBERS ---------- */
    const totalSubscribers = await Subscription.countDocuments({
        channel: channelId
    });

    /* ---------- TOTAL LIKES ON CHANNEL VIDEOS ---------- */
    const totalLikes = await Like.aggregate([
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video"
            }
        },
        {
            $unwind: "$video"
        },
        {
            $match: {
                "video.uploadedBy": new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $count: "likes"
        }
    ]);

    const stats = {
        totalVideos: videoStats[0]?.totalVideos || 0,
        totalViews: videoStats[0]?.totalViews || 0,
        totalSubscribers,
        totalLikes: totalLikes[0]?.likes || 0
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                stats,
                "Channel stats fetched successfully"
            )
        );
});

/**
 * GET ALL VIDEOS OF CHANNEL
 */
const getChannelVideos = asyncHandler(async (req, res) => {
    const channelId = req.user._id;

    const videos = await Video.find({
        uploadedBy: channelId
    })
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videos,
                "Channel videos fetched successfully"
            )
        );
});

export {
    getChannelStats,
    getChannelVideos
};
