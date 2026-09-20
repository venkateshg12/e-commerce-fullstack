export const QUEUE_NAMES = {
    EMAIL : 'email-queue',
    ORDER : 'order-queue',
    IMAGE : 'image-queue'
} as const;

export const JOB_NAMES = {
    EMAIL : {
        VERIFY_EMAIL : 'send_verify_email',
        PASSWORD_RESET : 'send_password_reset'
    },
    IMAGE : {
        PROCESS_PRODUCT_IMAGES : 'process_product_images',
        PROCESS_BANNER_IMAGES : 'process_banner_images',
        DELETE_CLOUDINARY_ASSETS : 'delete_cloudinary_assets'
    }
}as const;

