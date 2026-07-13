import nodemailer from "nodemailer";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } from "../constants/env";

export interface MailOptions {
    to: string;
    subject: string;
    text: string;
    html: string;
}

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
    },
});


export const sendMail = async (options: MailOptions) => {
    // If no SMTP settings are provided, fallback to console logging (helpful for local testing)
    if (!SMTP_USER || !SMTP_PASSWORD) {
        console.log("--- DEVELOPMENT MAIL SEND ---");
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body: ${options.text}`);
        console.log("------------------------------");
        return {
            data: null,
            error: null,
        };
    }

    try {
        const info = await transporter.sendMail({
            from: EMAIL_FROM,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
        });
        return {
            data: info,
            error: null
        }
    } catch (error) {
        console.error("Nodemailer email sending failed:", error);
        return {
            data: null,
            error: error
        }
    }
};
