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
];

const FILE_SIGNATURES: Array<{ mime: string; match: (buf: Buffer) => boolean }> = [
  {
    mime: "image/jpeg",
    match: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: "image/png",
    match: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    mime: "image/gif",
    match: (b) =>
      b.length >= 6 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38 &&
      (b[4] === 0x37 || b[4] === 0x39) &&
      b[5] === 0x61,
  },
  {
    mime: "image/webp",
    match: (b) =>
      b.length >= 12 &&
      b[0] === 0x52 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x46 &&
      b[8] === 0x57 &&
      b[9] === 0x45 &&
      b[10] === 0x42 &&
      b[11] === 0x50,
  },
  {
    mime: "image/avif",
    match: (b) =>
      b.length >= 12 &&
      b[4] === 0x66 &&
      b[5] === 0x74 &&
      b[6] === 0x79 &&
      b[7] === 0x70,
  },
];

const ALLOWED_TYPES_HUMAN = "JPG, PNG, WebP, GIF, AVIF";

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

function validateFileForUpload(file: File, buffer?: Buffer) {
  if (file.size <= 0) {
    throw new Error(`File "${file.name}" is empty.`);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File "${file.name}" (${humanFileSize(
        file.size
      )}) exceeds the maximum allowed size of ${humanFileSize(MAX_FILE_SIZE)}.`
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported file type "${file.type}". Allowed types: ${ALLOWED_TYPES_HUMAN}.`
    );
  }

  if (buffer) {
    const sigMatch = FILE_SIGNATURES.find((s) => s.mime === file.type && s.match(buffer));
    if (!sigMatch) {
      throw new Error(
        `File "${file.name}" content does not match its declared type "${file.type}". Allowed types: ${ALLOWED_TYPES_HUMAN}.`
      );
    }
  }
}

async function readFileBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) {
    throw new Error(`Could not read file "${file.name}".`);
  }
  return buffer;
}

async function uploadWithOptions(
  file: File,
  folder: string,
  options: Record<string, any>
): Promise<UploadedFileData> {
  const buffer = await readFileBuffer(file);
  validateFileForUpload(file, buffer);

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName) {
    throw new Error("CLOUDINARY_CLOUD_NAME is missing.");
  }

  if (!apiKey) {
    throw new Error("CLOUDINARY_API_KEY is missing.");
  }

  if (!apiSecret) {
    throw new Error("CLOUDINARY_API_SECRET is missing.");
  }

  const base64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  const mergedOptions: Record<string, any> = {
    folder,
    resource_type: "image",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    ...(options || {}),
  };

  const result = await cloudinary.uploader.upload(dataUri, mergedOptions);

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
  validateFileForUpload(file);

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
    const adminUser = await getCurrentAdmin();

    if (!adminUser) {
      return createErrorResponse(
        "Unauthorized - admin only",
        401
      );
    }

    const formData = await request.formData();

    const folderValue = formData.get("folder");

    const folder =
      typeof folderValue === "string" && folderValue.trim()
        ? folderValue.trim()
        : "himmat-tea";

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

    if (allFiles.length === 0) {
      return createErrorResponse(
        "No file(s) provided.",
        400
      );
    }

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

    if (uploaded.length === 0) {
      return createErrorResponse(
        `All uploads failed: ${errors.join("; ")}`,
        400
      );
    }

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
    const adminUser = await getCurrentAdmin();

    if (!adminUser) {
      return createErrorResponse(
        "Unauthorized - admin only",
        401
      );
    }

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
