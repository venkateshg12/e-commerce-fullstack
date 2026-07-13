import API from "@/lib/api";
import type { LoginResponse, RegisterResponse, SuccessResponse, VerifiedResponse } from "@/lib/types";
import type { LoginInSchema, RegisterSchema, ResetPasswordSchema } from "@repo/types";


export const register = async (data: RegisterSchema): Promise<SuccessResponse<RegisterResponse>> => {
    const response = await API.post<SuccessResponse<RegisterResponse>>("/auth/register", data);
    console.log(response);
    return response.data;
}

export const login = async (data: LoginInSchema): Promise<SuccessResponse<LoginResponse>> => {
    const response = await API.post<SuccessResponse<LoginResponse>>("/auth/login", data);
    return response.data;
}

export const logout = async (): Promise<SuccessResponse<VerifiedResponse>> => {
    const response = await API.get<SuccessResponse<VerifiedResponse>>("/auth/logout");
    return response.data;
}

export const verifyEmail = async (token: string): Promise<SuccessResponse<VerifiedResponse>> => {
    const response = await API.get<SuccessResponse<VerifiedResponse>>(`/auth/verify/${token}`);
    return response.data;
}

export const resendVerificationEmail = async (email: string): Promise<SuccessResponse<VerifiedResponse>> => {
    const response = await API.post<SuccessResponse<VerifiedResponse>>("/auth/verify/resend", { email });
    return response.data;
}

export const forgotPassword = async (email: string): Promise<SuccessResponse<VerifiedResponse>> => {
    const response = await API.post<SuccessResponse<VerifiedResponse>>("/auth/password/forgot", { email });
    return response.data;
}

export const resetPassword = async (data: ResetPasswordSchema & { token: string }): Promise<SuccessResponse<VerifiedResponse>> => {
    const { token, password, confirmPassword } = data;
    const response = await API.post<SuccessResponse<VerifiedResponse>>(`/auth/password/reset/${token}`, { password, confirmPassword });
    return response.data;
}

export const googleLogin = async (idToken: string): Promise<SuccessResponse<LoginResponse>> => {
    const response = await API.post<SuccessResponse<LoginResponse>>("/auth/google", { idToken });
    return response.data;
}
