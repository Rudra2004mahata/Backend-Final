import mongoose, { isValidObjectId } from "mongoose";
import { Subscription } from "../models/subscription.model.js";
import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * ============================
 * TOGGLE SUBSCRIPTION
 * ============================
 */
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new apiError("Invalid channel ID", 400);
  }

  if (channelId.toString() === subscriberId.toString()) {
    throw new apiError("You cannot subscribe to yourself", 400);
  }

  const existingSubscription = await Subscription.findOne({
    channel: channelId,
    subscriber: subscriberId,
  });

  if (existingSubscription) {
    await existingSubscription.deleteOne();

    const subscribersCount = await Subscription.countDocuments({
      channel: channelId,
    });

    return res.status(200).json(
      new ApiResponse(
        200,
        { subscribed: false, subscribersCount },
        "Unsubscribed successfully"
      )
    );
  }

  await Subscription.create({
    channel: channelId,
    subscriber: subscriberId,
  });

  const subscribersCount = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { subscribed: true, subscribersCount },
      "Subscribed successfully"
    )
  );
});

/**
 * ============================
 * CHECK SUBSCRIPTION STATUS
 * ============================
 */
const checkSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const subscriberId = req.user._id;

  if (!isValidObjectId(channelId)) {
    throw new apiError("Invalid channel ID", 400);
  }

  const existingSubscription = await Subscription.findOne({
    channel: channelId,
    subscriber: subscriberId,
  });

  const subscribersCount = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        subscribed: !!existingSubscription,
        subscribersCount,
      },
      "Subscription status fetched successfully"
    )
  );
});

/**
 * ============================
 * GET CHANNEL SUBSCRIBERS
 * ============================
 */
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new apiError("Invalid channel ID", 400);
  }

  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        subscriber: { $arrayElemAt: ["$subscriber", 0] },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: subscribers.length,
        subscribers,
      },
      "Channel subscribers fetched successfully"
    )
  );
});

const getChannelSubscriptionStats = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!isValidObjectId(channelId)) {
    throw new apiError("Invalid channel ID", 400);
  }

  const subscribersCount = await Subscription.countDocuments({
    channel: channelId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      { subscribersCount },
      "Channel subscription stats fetched"
    )
  );
});

/**
 * ============================
 * GET SUBSCRIBED CHANNELS
 * ============================
 */
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new apiError("Invalid subscriber ID", 400);
  }

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        channel: { $arrayElemAt: ["$channel", 0] },
      },
    },
    { $sort: { createdAt: -1 } },
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        count: channels.length,
        channels,
      },
      "Subscribed channels fetched successfully"
    )
  );
});

export {
  toggleSubscription,
  checkSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels,
  getChannelSubscriptionStats
};