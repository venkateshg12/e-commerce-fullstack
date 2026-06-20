import { CORS_ORIGIN } from "../constants/env";

export const getVerificationEmail = (token: string) => {
    const verificationLink = `${CORS_ORIGIN}/auth/verify/${token}`;

    return {
        subject: "Verify Your Email - E-Commerce App",
        text: `Please verify your email by clicking the following link: ${verificationLink}`,
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #333;">Welcome to our E-Commerce Store!</h2>
                <p>Thank you for registering. Please click the button below to verify your email address:</p>
                <a href="${verificationLink}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 10px;">Verify Email</a>
                <p style="margin-top: 20px; font-size: 12px; color: #777;">If the button above does not work, copy and paste this URL into your browser:</p>
                <p style="font-size: 12px; color: #0066cc;">${verificationLink}</p>
            </div>
        `
    };
};

// You can easily add more templates here in the future, e.g. Reset Password
export const getPasswordResetEmail = (token: string) => {
    const resetLink = `${CORS_ORIGIN}/auth/reset-password/${token}`;
    return {
        subject: "Reset Your Password - E-Commerce App",
        text: `Please reset your password by clicking the following link: ${resetLink}`,
        html: `...`
    };
};
