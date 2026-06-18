import mongoose from "mongoose";
import { MONGO_URI } from "../constants/env";

export async function connectDB() {
    await mongoose.connect(MONGO_URI);
    console.log("Mongodb connected successfully!");
}