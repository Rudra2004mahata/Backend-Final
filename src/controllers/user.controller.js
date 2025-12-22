import  {asyncHandler} from '../utils/asyncHandler.js';
import {apiError} from '../utils/apiError.js';
import {User} from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { apiResponce } from '../utils/apiResponce.js';
import jwt from 'jsonwebtoken';

const generateAccessandRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };

    } catch (error) {
        throw new apiError("Error generating tokens", 500);
    }
}

const registerUser = asyncHandler(async (req, res)=>{
    
    // get user details from frontend

    const {username, email, fullName, password} = req.body;

    //validate user data - not empty 

    if (
        [username, email, fullName, password].some((field)=>
        field?.trim()==="")
    ) {
        throw new apiError("All fields are required", 400);
    }

    // check if user already exsists : username , email

    const ExistedUser = await User.findOne({
        $or : [{ username },{ email }]
    })
    
    if(ExistedUser){
        throw new apiError("User already exsists with this username or email", 409);
    }

    // check for images , avatar chechk once

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new apiError("Avatar image is required", 400);
    }

    // upload images to cloudinary
const avatar = await uploadOnCloudinary(avatarLocalPath);
const coverImage = await uploadOnCloudinary(coverImageLocalPath);

if (!avatar) {
    throw new apiError("Error uploading avatar image", 400);
}

// create user
const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
});


    //remove password  and refresh token field from response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //check  for user creation success / failure
    if (!createdUser) {
        throw new apiError("Error creating user account, please try again", 500);
    }

    //return resonse

    return res.status(201).json(
        new apiResponce(200, createdUser, "User registered successfully")
    )

    
})

const loginUser = asyncHandler(async (req, res)=>{
    //req bdoy theke username email , password niye asbo
    const{username,email,password} = req.body;

    if(!username && !email){
        throw new apiError("Username or email is required to login",400);
    }

    //find the user
    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new apiError("User doesnot exist", 404);
    }
    
    //password chdeck
    const isPasswordvalid = await user.isPasswordCorrect(password)
    if(!isPasswordvalid){
        throw new apiError("Invalid credentials", 401);
    }

    //access token generate
    //referesh token generate
    const {accessToken , refreshToken} = await generateAccessandRefreshTokens(user._id)

   

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken");
    //send response back to frontend
    //send cookies 
    const options ={
        httpOnly: true,
        secure: true
    } 

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponce(200, {
            user: loggedInUser,
             accessToken, 
             refreshToken}, "User logged in successfully")
    )

})

const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new apiResponce(200, null, "User logged out successfully")
        );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new apiError(401, "Unauthorized access, no token provided");
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,)
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new apiError(401, "invalid refresh token");
        }
    
        if (user?.refreshToken !== incomingRefreshToken) {
            throw new apiError(401, "Refresh token is expired or used ");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken , newRefreshToken }= await generateAccessandRefreshTokens(user._id)
    
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new apiResponce(200, { accessToken, newRefreshToken }, "Access token refreshed successfully")
            );
    } catch (error) {
        throw new apiError(401, "Unauthorized access, invalid token");
    }


})

const chnageCurrentUserPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new apiError("Old password is incorrect", 400);
    }
    
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });
    
    return res
    .status(200)
    .json(new apiResponce(200, null, "Password changed successfully"));
});

const getCurrentUserProfile = asyncHandler(async (req, res) => {
    return res
    .status(200)
    .json(new apiResponce(200, req.user, "User profile fetched successfully"));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, username, email } = req.body;
    if (!fullName || !username || !email) {
        throw new apiError("All fields (fullName, username, email) are required to update", 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { fullName, username, email } },
        { new: true, }
    ).select("-password");

    return res
        .status(200)
        .json(new apiResponce(200, user, "Account details updated successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;
    if (!avatarLocalPath) {
        throw new apiError("Avatar image is required", 400);
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar.url) {
        throw new apiError("Error uploading avatar image", 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { avatar: avatar.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new apiResponce(200, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new apiError("cover image is missing", 400);
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverImage.url) {
        throw new apiError("Error uploading avatar image", 400);
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { coverImage: coverImage.url } },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new apiResponce(200, user, "Cover image updated successfully"));
});





export{ 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    chnageCurrentUserPassword,
    getCurrentUserProfile,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}