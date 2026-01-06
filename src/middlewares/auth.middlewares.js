import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // ✅ Allow preflight requests
  if (req.method === "OPTIONS") {
    return next();
  }

   console.log("🔍 Headers:", req.headers);
  console.log("🔍 Authorization header:", req.headers.authorization);
  console.log("🔍 Cookies:", req.cookies);

  const authHeader = req.headers.authorization;
  const token =
    req.cookies?.accessToken ||
    (authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null);

  if (!token) {
    throw new apiError(401, "Unauthorized access, no token provided");
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new apiError(401, "Unauthorized access, user not found");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new apiError(401, "Unauthorized access, invalid token");
  }
});