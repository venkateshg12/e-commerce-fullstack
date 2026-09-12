import mongoose, { Schema } from "mongoose";
import { ProductDocument, ProductImage } from "../types/product.types";



const ProductImageSchema = new mongoose.Schema<ProductImage>({
    url: {
        type: String,
        required: true,
        trim: true,
    },
    publicId: {
        type: String,
        required: true,
        trim: true,
    },
    isCover: {
        type: Boolean,
        default: false,
    },
    // Which colour this photo shows. Optional: images uploaded before this field existed
    // have none, and every read path tolerates that.
    color: {
        type: String,
        trim: true,
    }
}, { _id: false });

const ProductSchema = new mongoose.Schema<ProductDocument>({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true
    },
    brand: {
        type: String,
        required: true,
        trim: true,
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
    },
    images: {
        type: [ProductImageSchema],
        default: []
    },
    colors: {
        type: [String],
        default: [],
    },
    sizes: {
        type: [{
            type: String,
            enum: ["S", "M", "L", "XL", "XXL"]
        }],
        default: [],
    },
    price: {
        type: Number,
        required: true
    },
    salesPercentage: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    uploadStatus: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'READY', 'FAILED'],
        default: 'PENDING',
    },
    uploadError: {
        type: String,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

const ProductModel = mongoose.model<ProductDocument>("Product", ProductSchema);
export default ProductModel;