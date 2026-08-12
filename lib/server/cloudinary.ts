import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary using environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Uploads an image buffer to Cloudinary.
 * @param buffer The image buffer
 * @param userId The user's ID
 * @param folder The target folder (e.g. "sticky-ai/profiles")
 * @returns The secure URL and public_id
 */
export async function uploadToCloudinary(buffer: Buffer, userId: string, folder: string) {
  return new Promise<{ url: string; public_id: string }>((resolve, reject) => {
    // Generate a stable public_id based on user ID and timestamp to ensure cache busting
    // but keep it namespaced securely.
    const publicId = `${userId}_${Date.now()}`;
    
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        overwrite: true,
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        if (!result) return reject(new Error("Cloudinary upload failed: no result"));
        
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Deletes an image from Cloudinary given its public_id.
 * @param publicId The full public_id of the image in Cloudinary
 */
export async function deleteFromCloudinary(publicId: string) {
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    console.error(`Failed to delete Cloudinary resource ${publicId}:`, error);
  }
}
