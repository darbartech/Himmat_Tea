import { NextRequest } from "next/server";
import cloudinary from "@/lib/cloudinary";
import {
  createResponse,
  createErrorResponse,
  handleApiError,
} from "@/lib/api-utils";
import { getCurrentAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const maxDuration = 120;

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
];

type UploadedFileData = {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  originalName?: string;
  bytes?: number;
};

function humanFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
} 

async function uploadWithOptions(
  file: File,
  folder: string,
  options: Record<string, any>
): Promise<UploadedFileData> {
<<<<<<< HEAD
  // -----------------------------------------
  // Validate file size
  // -----------------------------------------

  if (file.size <= 0) {
    throw new Error(`File "${file.name}" is empty.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" (${humanFileSize(
        file.size
      )}) exceeds the maximum allowed size of ${humanFileSize(
        MAX_FILE_SIZE
      )}.`
    );
  }

  // -----------------------------------------
  // Validate MIME type
  // -----------------------------------------

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported file type "${file.type}". Allowed types: JPG, PNG, WebP, GIF, AVIF, SVG.`
    );
  }

  // -----------------------------------------
  // Convert File -> Buffer
  // -----------------------------------------

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!buffer.length) {
    throw new Error(`Could not read file "${file.name}".`);
  }

  // -----------------------------------------
  // Cloudinary credentials check
  // -----------------------------------------

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
=======
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileSizeKB = file.size / 1024;
  const timeoutMs =
    fileSizeKB > 2048
      ? 120_000
      : fileSizeKB > 1024
      ? 90_000
      : DEFAULT_UPLOAD_TIMEOUT_MS;

  const uploadPromise = new Promise<UploadedFileData>((resolve, reject) => {
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve({
              url: result!.secure_url,
              publicId: result!.public_id,
              width: result!.width,
              height: result!.height,
              format: result!.format,
              originalName: file.name,
              bytes: result!.bytes,
            });
          }
        }
      );
>>>>>>> 06da89314e26d17ea9aedc8f181672a739f869db

  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME is missing.");
  }

  if (!apiKey) {
    throw new Error("CLOUDINARY_API_KEY is missing.");
  }

  if (!apiSecret) {
    throw new Error("CLOUDINARY_API_SECRET is missing.");
  }

  // -----------------------------------------
  // Convert Buffer -> Data URI
  // -----------------------------------------

  const base64 = buffer.toString("base64");

  const dataUri = `data:${file.type};base64,${base64}`;

  // -----------------------------------------
  // Upload to Cloudinary
  // -----------------------------------------

  const result = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });

  // -----------------------------------------
  // Return normalized response
  // -----------------------------------------

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    originalName: file.name,
    bytes: result.bytes,
  };
}

async function uploadSingleFile(
  file: File,
  folder: string
): Promise<UploadedFileData> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" (${humanFileSize(file.size)}) exceeds the ${humanFileSize(
        MAX_FILE_SIZE
      )} size limit. Resize or compress it before uploading.`
    );
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported file type: ${file.type}. Allowed: JPG, PNG, WebP, GIF, AVIF, SVG.`
    );
  }

  const normalizedFolder = folder?.trim() || 'himmat-tea';
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();
  const baseOptions: Record<string, any> = {
    folder: normalizedFolder,
    resource_type: 'auto',
  };

  const primaryOptions = uploadPreset
    ? { ...baseOptions, upload_preset: uploadPreset }
    : { ...baseOptions };

  try {
    return await uploadWithOptions(file, normalizedFolder, primaryOptions);
  } catch (error: any) {
    const message = String(error?.message || error || '');
    const presetProblem = /upload preset|preset.*not configured|preset.*invalid|preset.*missing|invalid.*preset/i.test(message);
    const hasSignedCredentials = !!(
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    );

    if (presetProblem && hasSignedCredentials) {
      const signedOptions = {
        ...baseOptions,
        timestamp: Math.round(Date.now() / 1000),
      };
      return await uploadWithOptions(file, normalizedFolder, signedOptions);
    }

    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // -----------------------------------------
    // Admin authentication
    // -----------------------------------------

    const adminUser = await getCurrentAdmin();

    if (!adminUser) {
      return createErrorResponse(
        "Unauthorized - admin only",
        401
      );
    }

    // -----------------------------------------
    // Read multipart/form-data
    // -----------------------------------------

    const formData = await request.formData();

    const folderValue = formData.get("folder");

    const folder =
      typeof folderValue === "string" && folderValue.trim()
        ? folderValue.trim()
        : "himmat-tea";

    // -----------------------------------------
    // Collect files
    // -----------------------------------------

    const allFiles: File[] = [];

    const singleFile = formData.get("file");

    if (
      singleFile &&
      typeof singleFile === "object" &&
      "arrayBuffer" in singleFile
    ) {
      allFiles.push(singleFile as File);
    }

    const multipleFiles = formData.getAll("files");

    for (const item of multipleFiles) {
      if (
        item &&
        typeof item === "object" &&
        "arrayBuffer" in item
      ) {
        allFiles.push(item as File);
      }
    }

    // -----------------------------------------
    // No files
    // -----------------------------------------

    if (allFiles.length === 0) {
      return createErrorResponse(
        "No file(s) provided.",
        400
      );
    }

    // -----------------------------------------
    // Upload files
    // -----------------------------------------

    const uploaded: UploadedFileData[] = [];
    const errors: string[] = [];

    for (const file of allFiles) {
      try {
        console.log(
          `[Cloudinary] Uploading: ${file.name} (${humanFileSize(
            file.size
          )})`
        );

        const result = await uploadSingleFile(
          file,
          folder
        );

        uploaded.push(result);

        console.log(
          `[Cloudinary] Upload successful: ${file.name}`
        );
      } catch (error: any) {
        const message =
          error?.message ||
          error?.error?.message ||
          String(error);

        console.error(
          `[Cloudinary] Upload failed: ${file.name}`,
          error
        );

        errors.push(
          `${file.name}: ${message}`
        );
      }
    }

    // -----------------------------------------
    // All failed
    // -----------------------------------------

    if (uploaded.length === 0) {
      return createErrorResponse(
        `All uploads failed: ${errors.join("; ")}`,
        400
      );
    }

    // -----------------------------------------
    // Single file response
    // -----------------------------------------

    if (
      singleFile &&
      allFiles.length === 1
    ) {
      return createResponse({
        success: true,
        data: uploaded[0],
        errors:
          errors.length > 0
            ? errors
            : undefined,
      });
    }

    // -----------------------------------------
    // Multiple files response
    // -----------------------------------------

    return createResponse({
      success: true,
      data: {
        uploaded,
        errors:
          errors.length > 0
            ? errors
            : undefined,
      },
    });
  } catch (error) {
    console.error(
      "[Cloudinary Upload API Error]",
      error
    );

    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest
) {
  try {
    // -----------------------------------------
    // Admin authentication
    // -----------------------------------------

    const adminUser = await getCurrentAdmin();

    if (!adminUser) {
      return createErrorResponse(
        "Unauthorized - admin only",
        401
      );
    }

    // -----------------------------------------
    // Get public ID
    // -----------------------------------------

    const { searchParams } =
      new URL(request.url);

    const publicId =
      searchParams.get("publicId");

    if (!publicId) {
      return createErrorResponse(
        "publicId is required.",
        400
      );
    }

    // -----------------------------------------
    // Delete from Cloudinary
    // -----------------------------------------

    const result =
      await cloudinary.uploader.destroy(
        publicId,
        {
          resource_type: "image",
        }
      );

    if (
      result.result !== "ok" &&
      result.result !== "not found"
    ) {
      throw new Error(
        `Cloudinary deletion failed: ${result.result}`
      );
    }

    return createResponse({
      success: true,
      message:
        "Image deleted successfully.",
    });
  } catch (error) {
    console.error(
      "[Cloudinary Delete Error]",
      error
    );

    return handleApiError(error);
  }
}