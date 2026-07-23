import { JOB_NAMES } from "../../constants/queue";
import { VerifyEmailPayload } from "../interfaces/jobPayload";
import { emailQueue } from "../queues/email.queue";

export class EmailProducer {
    static async sendVerifyEmail(payload: VerifyEmailPayload) {
        return await emailQueue.add(JOB_NAMES.EMAIL.VERIFY_EMAIL, payload, {
            jobId: `verify:${payload.userId}:${Date.now()}`,
        });
    }
}