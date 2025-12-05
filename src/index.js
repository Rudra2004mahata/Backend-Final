import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});

import connectDB from "./db/index.js";
import { app } from "./app.js";

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is running on port ${process.env.PORT || 8000}`);
    });
})
.catch((error) => {
    console.log("mongo connection failed", error);
});
















// const connectDB = async ()=> {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`,)
//         console.log("Connected to the database successfully");
        
//     } catch (error) {
//         console.error("Error connecting to the database:", error);
//         throw error;
//     }
// }