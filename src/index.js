import dotenv from "dotenv";
dotenv.config({
    path: "./.env"
});



import connectDB from "./db/index.js";


connectDB();



















// const connectDB = async ()=> {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`,)
//         console.log("Connected to the database successfully");
        
//     } catch (error) {
//         console.error("Error connecting to the database:", error);
//         throw error;
//     }
// }