import mongoose from "mongoose";
import { AddressDocument, UserDocument } from "../types/user.types";
import { compareValue, hashValue } from "../utils/auth";

export const addressSchema = new mongoose.Schema<AddressDocument>({
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    state: {
        type: String,
        required: true,
        trim: true,
    },
    city: {
        type: String,
        required: true,
        trim: true,
    },
    country: {
        type: String,
        default: "India",
        trim: true,
    },
    postalCode: {
        type: String,
        required: true,
        trim: true,
    },
    isDefault: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: false,
});



const userSchema = new mongoose.Schema<UserDocument>({
    name: {
        type: String,
        required: false,
    },
    // Normalised on write so "Foo@x.com" and "foo@x.com" can't become two accounts; the shared Zod
    // schema normalises lookups the same way.
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: function (this: any) {
            return this.authProvider === "local";
        }
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    authProvider: {
        type: String,
        enum: ["local", "google"],
        default: "local"
    },
    avatar: {
        type: String
    },
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    points: {
        type: Number,
        default: 0,
    },
    address: {
        type: [addressSchema],
        default: []
    },
    verified: {
        type: Boolean,
        default: false
    }

},
    {
        timestamps: true,
    }
)

userSchema.pre("save", async function () {
    if (!this.password || !this.isModified("password")) {
        return;
    }
    this.password = await hashValue(this.password);
})

userSchema.methods.comparePassword = async function (val: string) {
    if (!this.password) {
        return false;
    }
    return compareValue(val, this.password);
}

userSchema.methods.omitPassword = function () {
    const user = this.toObject();
    delete user.password;
    return user;
}

const UserModel = mongoose.model<UserDocument>("User", userSchema);
export default UserModel;