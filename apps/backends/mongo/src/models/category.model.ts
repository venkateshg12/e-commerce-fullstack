import mongoose from "mongoose";
import { CategoryDocument } from "../types/category.types";

const CategorySchema = new mongoose.Schema<CategoryDocument>({
    name: {
        type: String,
        required: true,
        trim: true,
    }
}, { timestamps: true });

const CategoryModel = mongoose.model<CategoryDocument>("Category", CategorySchema);
export default CategoryModel;