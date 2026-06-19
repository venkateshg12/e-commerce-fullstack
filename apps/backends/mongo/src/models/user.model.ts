import mongoose from "mongoose";
import { AddressDocument, UserDocument } from "../types/user.types";
import { compareValue, hashValue } from "../utils/bcrypt";

const addressSchema = new mongoose.Schema<AddressDocument>({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    address: {
        type: String,
        required: true,
        trim: true
    },
    state: {
        type: String,
        required: true,
        trim: true
    },
    postalCode: {
        type: String,
        required: true,
        trim: true
    },
    isDefault: {
        type: Boolean,
        default: false
    },
},
    {
        timestamps: false,
    }
);


const userSchema = new mongoose.Schema<UserDocument>({
    name: {
        type: String,
        required: false,
    },
    email: {
        type: String,
        required: false
    },
    password: {
        type: String,
        required: true,
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
    if (!this.isModified("password")) {
        return;
    }
    this.password = await hashValue(this.password);
})

userSchema.methods.comparePassword = async function (val: string) {
    return compareValue(val, this.password);
}

userSchema.methods.omitPassword = function () {
    const user = this.toObject();
    delete user.password;
    return user;
}

const UserModel = mongoose.model<UserDocument>("User", userSchema);
export default UserModel;