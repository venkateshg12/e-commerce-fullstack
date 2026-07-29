import { Job, UnrecoverableError } from "bullmq";
import { PasswordResetPayload, VerifyEmailPayload } from "../interfaces/jobPayload";
import { getPasswordResetEmail, getVerificationEmail, sendMail } from "../../utils/email";

export async function processVerifyEmail(job: Job<VerifyEmailPayload>) {
    const { userId, email, verificationToken } = job.data;

    job.log(`[Start] Sending Verification Email to ${email} (User ID: ${userId})`);

    if (!email || !email.includes('@')) {
        throw new UnrecoverableError(`Invalid email format: ${email}`);
    }

    const emailTemplate = getVerificationEmail(verificationToken);

    job.log(`[SMTP] Delivering verification email to ${email}`);
    const { data, error } = await sendMail({
        to: email,
        ...emailTemplate,
    });

    if (error) {
        job.log(`[Error] Failed to send email to ${email}: ${error}`);
        throw new Error(`Failed to send email to ${email}: ${error}`);
    }

    job.log(`[Success] Verification email delivered to ${email}`);
    return { status: 'sent', deliveredAt: new Date().toISOString(), info: data };
}

export async function processPasswordReset(job: Job<PasswordResetPayload>) {
    const { userId, email, resetToken } = job.data;

    job.log(`[Start] Sending Password Reset Email to ${email} (User ID: ${userId})`);

    if (!email || !email.includes('@')) {
        throw new UnrecoverableError(`Invalid email format: ${email}`);
    }

    const emailTemplate = getPasswordResetEmail(resetToken);

    job.log(`[SMTP] Delivering password reset email to ${email}`);
    const { data, error } = await sendMail({
        to: email,
        ...emailTemplate,
    });

    if (error) {
        job.log(`[Error] Failed to send password reset email to ${email}: ${error}`);
        throw new Error(`Failed to send password reset email to ${email}: ${error}`);
    }

    job.log(`[Success] Password reset email delivered to ${email}`);
    return { status: 'sent', deliveredAt: new Date().toISOString(), info: data };
}