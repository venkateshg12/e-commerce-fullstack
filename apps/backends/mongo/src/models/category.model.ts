import mongoose from "mongoose";
import { CategoryDocument } from "../types/category.types";

const CategorySchema = new mongoose.Schema<CategoryDocument>({
    name: {
        type: String,
        required: true,
        trim: true,
    }
}, { timestamps: true });

// "Men" and "men" are the same category, as for brands and sub-categories. The controller's
// findOne check only narrows the window; this is what actually stops two concurrent creates.
CategorySchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

const CategoryModel = mongoose.model<CategoryDocument>("Category", CategorySchema);
export default CategoryModel;