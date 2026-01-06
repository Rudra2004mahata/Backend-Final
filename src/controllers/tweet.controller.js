import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * CREATE TWEET
 */
const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;

    if (!content?.trim()) {
        throw new apiError("Tweet content is required", 400);
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user._id
    });

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                tweet,
                "Tweet created successfully"
            )
        );
});

/**
 * GET TWEETS OF A USER
 */
const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
        throw new apiError("Invalid user ID", 400);
    }

    const tweets = await Tweet.find({ owner: userId })
        .populate("owner", "username avatar")
        .sort({ createdAt: -1 });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tweets,
                "User tweets fetched successfully"
            )
        );
});

/**
 * UPDATE TWEET
 */
const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new apiError("Invalid tweet ID", 400);
    }

    if (!content?.trim()) {
        throw new apiError("Updated content is required", 400);
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiError("Tweet not found", 404);
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new apiError("Unauthorized action", 403);
    }

    tweet.content = content;
    await tweet.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                tweet,
                "Tweet updated successfully"
            )
        );
});

/**
 * DELETE TWEET
 */
const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    if (!isValidObjectId(tweetId)) {
        throw new apiError("Invalid tweet ID", 400);
    }

    const tweet = await Tweet.findById(tweetId);

    if (!tweet) {
        throw new apiError("Tweet not found", 404);
    }

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new apiError("Unauthorized action", 403);
    }

    await tweet.deleteOne();

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "Tweet deleted successfully"
            )
        );
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
};
