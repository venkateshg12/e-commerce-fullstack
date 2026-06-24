import { CORS_ORIGIN } from "../constants/env";
import { emailVerificationTemplate, passwordResetTemplate } from "./html_templates";

export const getVerificationEmail = (token: string) => {
    const emailVerificationLink = `${CORS_ORIGIN}/auth/verify/${token}`;

    return {
        subject: "Verify Your Email - ShopyMart",
        text: `Please verify your email by clicking the following link: ${emailVerificationLink}`,
        html: emailVerificationTemplate(emailVerificationLink)
    };
};

// You can easily add more templates here in the future, e.g. Reset Password
export const getPasswordResetEmail = (token: string) => {
    const resetLink = `${CORS_ORIGIN}/password/reset/${token}`;
    return {
        subject: "Reset Your Password - ShopyMart",
        text: `Please reset your password by clicking the following link: ${resetLink}`,
        html: passwordResetTemplate(resetLink)
    };
};
