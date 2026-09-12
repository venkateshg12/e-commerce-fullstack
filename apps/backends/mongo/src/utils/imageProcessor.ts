import sharp from "sharp";

/*
  Magic Bytes are the first few bytes of a file that uniquely identify 
  its actual file format, regardless of its filename or extension.
 */
const ALLOWED_MAGIC_BYTES = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46] }, 
  { mime: "image/avif", bytes: [0x00, 0x00, 0x00] }, 
];

const MAX_PIXEL_DIMENSION = 8000; 

export function validateImageMagicBytes(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;

  return ALLOWED_MAGIC_BYTES.some(({ bytes }) =>
    bytes.every((byte, index) => buffer[index] === byte)
  );
}

export interface ProcessedImage {
  buffer: Buffer;
  format: "webp";
  width: number;
  height: number;
  sizeInBytes: number;
}


// Strips EXIF metadata, resizes to max 1000x1000, and encodes to WebP format

export async function processProductImage(buffer: Buffer): Promise<ProcessedImage> {
  // Step 1: Magic byte validation
  if (!validateImageMagicBytes(buffer)) {
    throw new Error("Invalid image format or corrupted file signature.");
  }

  //It is an object that represents the input image and a pipeline of image-processing operations 
  // that will be executed later.
  const sharpInstance = sharp(buffer, { failOn: "none" });
  const metadata = await sharpInstance.metadata();

  // Step 2: Pixel Bomb / Decompression Bomb Guard
  if (
    (metadata.width && metadata.width > MAX_PIXEL_DIMENSION) ||
    (metadata.height && metadata.height > MAX_PIXEL_DIMENSION)
  ) {
    throw new Error(`Image dimensions exceed safety limit of ${MAX_PIXEL_DIMENSION}px.`);
  }

  // Step 3: Sharp Transformation Pipeline
  // - rotate(): Auto-orients based on EXIF before stripping metadata
  // - strip EXIF: default behavior when metadata() isn't explicitly piped with .withMetadata()
  // - resize: Fits inside 1000x1000 without enlarging smaller images
  // - webp: Lossy compression quality 80

  const processedPipeline = sharpInstance
    .rotate()
    .resize({
      width: 1000,
      height: 1000,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 80,
      effort: 4,
    });
/*
  Allow the WebP encoder to discard enough visually insignificant information to produce 
  a much smaller file while keeping the image visually high quality for users."
 */

  const { data, info } = await processedPipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    format: "webp",
    width: info.width,
    height: info.height,
    sizeInBytes: info.size,
  };
}
