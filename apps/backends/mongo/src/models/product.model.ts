import mongoose, { Schema } from "mongoose";
import { ProductDocument, ProductImage, ProductVariant } from "../types/product.types";



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

/*
  A sellable combination and its count. Stock is per variant rather than per product, so green/L
  can run out while green/M is still on the shelf; `color` and `size` are omitted for a product
  that has no colours or no sizes.
*/
const ProductVariantSchema = new mongoose.Schema<ProductVariant>({
    color: {
        type: String,
        trim: true,
    },
    size: {
        type: String,
        enum: ["S", "M", "L", "XL", "XXL"],
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
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
        type: Schema.Types.ObjectId,
        ref: 'Brand',
        required: true,
    },
    images: {
        type: [ProductImageSchema],
        default: []
    },
    variants: {
        type: [ProductVariantSchema],
        default: [],
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
    // The product's type (Shirt, Jeans…), always one of its category's sub-categories.
    subCategory: {
        type: Schema.Types.ObjectId,
        ref: 'SubCategory',
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

/*
  The storefront's queries, which had no index at all behind them: every filter and sort was a full
  collection scan. `status` leads each compound index because every customer-facing query pins it to
  "active", so the index stays selective whichever filter is combined with it.
 */
ProductSchema.index({ status: 1, createdAt: -1 });   // default listing, newest first
ProductSchema.index({ status: 1, price: 1 });        // sort by price, both directions
ProductSchema.index({ category: 1, status: 1 });
ProductSchema.index({ brand: 1, status: 1 });
ProductSchema.index({ subCategory: 1, status: 1 });
ProductSchema.index({ colors: 1 });                  // multikey: filter by one colour
ProductSchema.index({ sizes: 1 });                   // multikey: filter by one size

// Title search stays a scan — a substring `$regex` can't use an index. It is bounded by the filters
// above, by the 100-character cap on the term and by pagination; a catalogue large enough to feel it
// wants MongoDB text search or Atlas Search, which is a change of behaviour, not just an index.

const ProductModel = mongoose.model<ProductDocument>("Product", ProductSchema);
export default ProductModel;