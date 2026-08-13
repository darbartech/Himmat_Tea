import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils';
import { getCurrentAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const maxDuration = 120;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_UPLOAD_TIMEOUT_MS = 90_000;
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
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

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET?.trim();
  const uploadOptions: Record<string, any> = {
    folder,
    resource_type: 'auto',
  };
  if (uploadPreset) {
    uploadOptions.upload_preset = uploadPreset;
  }

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
        uploadOptions,
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

      uploadStream.on('error', (err) => {
        reject(err);
      });

      try {
        uploadStream.end(buffer);
      } catch (err) {
        reject(err);
      }
    } catch (err) {
      reject(err);
    }
  });

  return withTimeout(
    uploadPromise,
    timeoutMs,
    `Request Timeout after ${Math.round(
      timeoutMs / 1000
    )}s while uploading "${file.name}" (${humanFileSize(
      file.size
    )}). Try compressing the image (reduce resolution/quality, or convert to WebP) and try again. If the issue persists, check your network connection or increase the upload timeout.`
  );
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const singleFile = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'himmat-tea';

    const allFiles: File[] = [];
    if (singleFile) allFiles.push(singleFile);
    files.forEach((f) => allFiles.push(f));

    if (allFiles.length === 0) {
      return createErrorResponse('No file(s) provided', 400);
    }

    const results: UploadedFileData[] = [];
    const errors: string[] = [];

    for (const file of allFiles) {
      try {
        const data = await uploadSingleFile(file, folder);
        results.push(data);
      } catch (err: any) {
        const msg = err?.message || String(err);
        errors.push(`${file.name}: ${msg}`);
      }
    }

    if (results.length === 0) {
      return createErrorResponse(
        `All uploads failed: ${errors.join('; ')}`,
        400
      );
    }

    if (singleFile && allFiles.length === 1) {
      return createResponse({
        success: true,
        data: results[0],
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    return createResponse({
      success: true,
      data: {
        uploaded: results,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return createErrorResponse('publicId is required', 400);
    }

    await cloudinary.uploader.destroy(publicId);

    return createResponse({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
