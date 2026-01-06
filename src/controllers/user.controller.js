import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessandRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new apiError("Error generating tokens", 500);
    }
};

/**
 * ============================
 * REGISTER USER (AVATAR OPTIONAL ✅)
 * ============================
 */
const registerUser = asyncHandler(async (req, res) => {
    const { username, email, fullName, password } = req.body;

    if ([username, email, fullName, password].some((f) => f?.trim() === "")) {
        throw new apiError("All fields are required", 400);
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new apiError(
            "User already exists with this username or email",
            409
        );
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let avatarUrl = "";
    let coverImageUrl = "";

    // ✅ Upload avatar ONLY if provided
    if (avatarLocalPath) {
        const avatarUpload = await uploadOnCloudinary(avatarLocalPath);
        avatarUrl = avatarUpload?.url || "";
    }

    // ✅ Upload cover image ONLY if provided
    if (coverImageLocalPath) {
        const coverUpload = await uploadOnCloudinary(coverImageLocalPath);
        coverImageUrl = coverUpload?.url || "";
    }

    const user = await User.create({
        fullName,
        avatar: avatarUrl,              // ✅ OPTIONAL
        coverImage: coverImageUrl,       // ✅ OPTIONAL
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                createdUser,
                "User registered successfully"
            )
        );
});

/**
 * ============================
 * LOGIN
 * ============================
 */
const loginUser = asyncHandler(async (req, res) => {
    const { username, email, password } = req.body;

    if (!username && !email) {
        throw new apiError("Username or email is required to login", 400);
    }

    const user = await User.findOne({ $or: [{ username }, { email }] });

    if (!user) {
        throw new apiError("User does not exist", 404);
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        throw new apiError("Invalid credentials", 401);
    }

    const { accessToken, refreshToken } =
        await generateAccessandRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );
});

/**
 * ============================
 * LOGOUT
 * ============================
 */
const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, {
        $unset: { refreshToken: 1 },
    });

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, null, "User logged out successfully"));
});

/**
 * ============================
 * REFRESH TOKEN
 * ============================
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
        throw new apiError("Unauthorized access", 401);
    }

    const decoded = jwt.verify(
        incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decoded._id);

    if (!user || user.refreshToken !== incomingRefreshToken) {
        throw new apiError("Invalid refresh token", 401);
    }

    const { accessToken, refreshToken } =
        await generateAccessandRefreshTokens(user._id);

    const options = { httpOnly: true, secure: true };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { accessToken, refreshToken },
                "Token refreshed"
            )
        );
});

/**
 * ============================
 * CHANGE PASSWORD
 * ============================
 */
const chnageCurrentUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isCorrect) {
        throw new apiError("Old password is incorrect", 400);
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.json(
        new ApiResponse(200, null, "Password changed successfully")
    );
});

/**
 * ============================
 * GET CURRENT USER
 * ============================
 */
const getCurrentUserProfile = asyncHandler(async (req, res) => {
    return res.json(
        new ApiResponse(200, req.user, "User profile fetched successfully")
    );
});

/**
 * ============================
 * UPDATE ACCOUNT DETAILS
 * ============================
 */
const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, username, email } = req.body;

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { fullName, username, email } },
        { new: true }
    ).select("-password");

    return res.json(
        new ApiResponse(200, user, "Account updated successfully")
    );
});

/**
 * ============================
 * UPDATE AVATAR
 * ============================
 */
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarUpload = await uploadOnCloudinary(req.file?.path);

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatarUpload?.url || "" } },
        { new: true }
    ).select("-password");

    return res.json(new ApiResponse(200, user, "Avatar updated successfully"));
});

/**
 * ============================
 * UPDATE COVER IMAGE
 * ============================
 */
const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverUpload = await uploadOnCloudinary(req.file?.path);

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverUpload?.url || "" } },
        { new: true }
    ).select("-password");

    return res.json(
        new ApiResponse(200, user, "Cover image updated successfully")
    );
});

/**
 * ============================
 * CHANNEL PROFILE
 * ============================
 */
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const { username } = req.params;

    const channel = await User.aggregate([
        { $match: { username: username.toLowerCase() } },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
                subscribersCount: 1,
                createdAt: 1,
            },
        },
    ]);

    return res.json(
        new ApiResponse(200, channel[0], "Channel profile fetched")
    );
});

/**
 * ============================
 * WATCH HISTORY
 * ============================
 */
const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate(
        "watchHistory.video"
    );

    return res.json(
        new ApiResponse(200, user.watchHistory, "Watch history fetched")
    );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    chnageCurrentUserPassword,
    getCurrentUserProfile,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};