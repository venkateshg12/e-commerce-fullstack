import mongoose, { Schema } from "mongoose";
import { SubCategoryDocument } from "../types/subCategory.types";

const SubCategorySchema = new mongoose.Schema<SubCategoryDocument>({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        required: true,
    }
}, { timestamps: true });

// A type name is unique within its category ("Shirt" can exist under both Men and Women).
SubCategorySchema.index(
    { category: 1, name: 1 },
    { unique: true, collation: { locale: "en", strength: 2 } }
);

const SubCategoryModel = mongoose.model<SubCategoryDocument>("SubCategory", SubCategorySchema);
export default SubCategoryModel;
