import  {asyncHandler} from '../utils/asyncHandler.js';
import {apiError} from '../utils/apiError.js';
import {User} from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { apiResponce } from '../utils/apiResponce.js';


const registerUser = asyncHandler(async (req, res)=>{
    
    
     
    
    
    
    
    

    // get user details from frontend

    const {username, email, fullname, password} = req.body;

    //validate user data - not empty 

    if (
        [username, email, fullname, password].some((field)=>
        field?.trim()==="")
    ) {
        throw new apiError("All fields are required", 400);
    }

    // check if user already exsists : username , email

    const ExistedUser = User.findOne({
        $or : [{ username },{ email }]
    })
    
    if(ExistedUser){
        throw new apiError("User already exsists with this username or email", 409);
    }

    // check for images , avatar chechk once

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new apiError("Avatar image is required", 400);
    }

    //upload them in cloudinary , avatar 

    const avatar = await uploadOnCloudinary(avatarLocalPath) ;
    const CoverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new apiError("Error uploading avatar image", 400);
    }

    //create user object - create entry in db 

    const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase(),
    })

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







export{ 
    registerUser
}