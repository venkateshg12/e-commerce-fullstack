import { Job, UnrecoverableError } from "bullmq";
import { VerifyEmailPayload } from "../interfaces/jobPayload";
import { getVerificationEmail } from "../../utils/emailTemplates";
import { sendMail } from "../../utils/sendMail";

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