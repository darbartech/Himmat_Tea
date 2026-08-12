import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils';
import { getCurrentAdmin } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'himmat-tea';

    if (!file) {
      return createErrorResponse('No file provided', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET || undefined,
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return createResponse({
      success: true,
      data: {
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
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
