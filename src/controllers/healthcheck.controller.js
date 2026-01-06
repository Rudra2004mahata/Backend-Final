import { apiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {
                    status: "OK",
                    uptime: process.uptime(),
                    timestamp: new Date().toISOString()
                },
                "Server is healthy"
            )
        );
});

export {
    healthcheck
};

    