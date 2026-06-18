import { CredentialSchema } from "@repo/types";
import UserModel from "../models/user.model";
import appAssert from "../utils/appAssert";
import { CONFLICT } from "../constants/https";



export const createAccount = async (data: CredentialSchema) => {

    //verify existing user doesn't exist
    try {

        const existingUser = await UserModel.exists({ email: data.email });
        appAssert(!existingUser, CONFLICT, "User already exists!");
        
        // create user
        const user = await UserModel.create({
            email: data.email,
            password: data.password
        })
        return { user };
    }catch(next) {
        return next;
        
    }
    // send a verification email
    // create session
    // sign access token & refresh token
    // return user & tokens
}