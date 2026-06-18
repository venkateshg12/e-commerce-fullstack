import mongoose from "mongoose";

export interface AddressDocument extends mongoose.Document {
    fullName: string,
    address: string,
    state: string,
    postalCode: string,
    isDefault: boolean,
}


export interface UserDocument extends mongoose.Document {
    name: string,
    email: string,
    password: string,
    role: "user" | "admin",
    points: number,
    address: AddressDocument[],
    verified: boolean,
    createdAt: Date,
    updatedAt: Date,
    comparePassword(val: string): Promise<boolean>
}