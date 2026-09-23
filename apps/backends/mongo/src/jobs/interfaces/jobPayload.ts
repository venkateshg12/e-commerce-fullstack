export interface VerifyEmailPayload {
  userId: string;
  email: string;
  verificationToken: string;
}

export interface PasswordResetPayload {
  userId: string;
  email: string;
  resetToken: string;
}

export interface ProcessProductImageJobPayload {
  productId: string;
  files: Array<{
    bufferBase64: string;
    originalName: string;
    mimeType: string;
    // Which colour this photo shows, chosen per-file by the admin at upload time.
    color?: string;
  }>;
  // Insert index for this batch; undefined appends to the end.
  position?: number;
}

export interface ProcessBannerImageJobPayload {
  userId: string;
  files: Array<{
    bufferBase64: string;
    originalName: string;
    mimeType: string;
  }>;
}


export interface DeleteCloudinaryAssetsJobPayload {
  publicIds: string[];
  // Context for logging only — the assets may outlive the product that owned them.
  productId?: string;
}
