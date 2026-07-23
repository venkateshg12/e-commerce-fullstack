export const QUEUE_NAMES = {
    EMAIL : 'email-queue',
    ORDER : 'order-queue',
    IMAGE : 'image-queue'
} as const;

export const JOB_NAMES = {
    EMAIL : {
        VERIFY_EMAIL : 'send_verify_email',
        RESEND_VERIFY_EMAIL : 'resend_verify_email',
        PASSWORD_RESET : 'send_password_reset'
    },

}as const;

