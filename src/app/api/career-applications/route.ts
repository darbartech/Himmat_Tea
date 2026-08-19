import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  createResponse,
  createErrorResponse,
  handleApiError,
} from "@/lib/api-utils";
import { getCurrentAdmin } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/* ─────────────────────────────────────────────
   Resume Upload
───────────────────────────────────────────── */

const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_RESUME_TYPES_HUMAN = "PDF, DOC, DOCX";

function matchesResumeSignature(
  mime: string,
  buf: Buffer
): boolean {
  if (mime === "application/pdf") {
    // PDF: %PDF
    return (
      buf.length >= 4 &&
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46
    );
  }

  if (mime === "application/msword") {
    // Legacy Microsoft Office OLE compound file
    return (
      buf.length >= 8 &&
      buf[0] === 0xd0 &&
      buf[1] === 0xcf &&
      buf[2] === 0x11 &&
      buf[3] === 0xe0 &&
      buf[4] === 0xa1 &&
      buf[5] === 0xb1 &&
      buf[6] === 0x1a &&
      buf[7] === 0xe1
    );
  }

  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // DOCX: ZIP container
    return (
      buf.length >= 4 &&
      buf[0] === 0x50 &&
      buf[1] === 0x4b &&
      buf[2] === 0x03 &&
      buf[3] === 0x04
    );
  }

  return false;
}

async function uploadResume(file: File): Promise<string> {
  if (file.size <= 0) {
    throw new Error(`File "${file.name}" is empty.`);
  }

  if (file.size > MAX_RESUME_SIZE) {
    throw new Error(
      "Resume exceeds the maximum allowed size of 5 MB."
    );
  }

  if (!ALLOWED_RESUME_MIME_TYPES.includes(file.type)) {
    throw new Error(
      `Unsupported file type. Allowed types: ${ALLOWED_RESUME_TYPES_HUMAN}.`
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!buffer.length) {
    throw new Error("Could not read the uploaded file.");
  }

  if (!matchesResumeSignature(file.type, buffer)) {
    throw new Error(
      `File content does not match its declared type. Allowed types: ${ALLOWED_RESUME_TYPES_HUMAN}.`
    );
  }

  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim();

  const apiKey =
    process.env.CLOUDINARY_API_KEY?.trim();

  const apiSecret =
    process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "File storage is not configured. Please try again later."
    );
  }

  const base64 = buffer.toString("base64");

  const dataUri = `data:${file.type};base64,${base64}`;

  const result = await cloudinary.uploader.upload(
    dataUri,
    {
      folder: "himmat-tea/career-resumes",
      resource_type: "raw",
      use_filename: true,
      unique_filename: true,
      overwrite: false,
    }
  );

  return result.secure_url;
}

/* ─────────────────────────────────────────────
   Validation
───────────────────────────────────────────── */

const applicationFieldsSchema = z.object({
  careerJobId: z
    .string()
    .trim()
    .min(1, "Job reference is required"),

  fullName: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(200),

  email: z
    .string()
    .trim()
    .email("A valid email is required")
    .max(320),

  phone: z
    .string()
    .trim()
    .min(1, "Phone number is required")
    .max(50),

  address: z
    .string()
    .trim()
    .min(1, "Address is required")
    .max(500),

  coverLetter: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .default(""),
});

/* ─────────────────────────────────────────────
   POST
   Public career application submission
───────────────────────────────────────────── */

export async function POST(
  request: NextRequest
) {
  try {
    /* Rate limiting */
    const rl = await rateLimit.auth(request);

    if (!rl.allowed) {
      return createErrorResponse(
        rl.error ||
          "Too many requests. Please try again later.",
        429
      );
    }

    /* Parse multipart form */
    const formData = await request.formData();

    /* Validate fields */
    const parsed =
      applicationFieldsSchema.safeParse({
        careerJobId: formData.get("careerJobId"),
        fullName: formData.get("fullName"),
        email: formData.get("email"),
        phone: formData.get("phone"),
        address: formData.get("address"),
        coverLetter:
          formData.get("coverLetter") ?? "",
      });

    if (!parsed.success) {
      return createErrorResponse(
        parsed.error.issues[0]?.message ||
          "Invalid application data",
        400
      );
    }

    const data = parsed.data;

    /* Validate resume */
    const resumeFile = formData.get("resume");

    if (
      !resumeFile ||
      !(resumeFile instanceof File)
    ) {
      return createErrorResponse(
        "Resume/CV file is required",
        400
      );
    }

    /* Find active job */
    const job = await prisma.careerJob.findUnique({
      where: {
        id: data.careerJobId,
      },
      select: {
        id: true,
        title: true,
        isActive: true,
      },
    });

    if (!job || !job.isActive) {
      return createErrorResponse(
        "This role is no longer accepting applications",
        404
      );
    }

    /* Normalize email */
    const normalizedEmail =
      data.email.trim().toLowerCase();

    /* Prevent duplicate application */
    const existing =
      await prisma.careerApplication.findUnique({
        where: {
          careerJobId_email: {
            careerJobId: data.careerJobId,
            email: normalizedEmail,
          },
        },
        select: {
          id: true,
        },
      });

    if (existing) {
      return createErrorResponse(
        "An application from this email already exists for this role. Each email may apply to a given role once.",
        409
      );
    }

    /* Upload resume */
    let resumeUrl: string;

    try {
      resumeUrl = await uploadResume(
        resumeFile
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to upload resume";

      return createErrorResponse(
        message,
        400
      );
    }

    /* Create application */
    try {
      const application =
        await prisma.careerApplication.create({
          data: {
            careerJobId:
              data.careerJobId,

            fullName:
              data.fullName.trim(),

            email:
              normalizedEmail,

            phone:
              data.phone.trim(),

            address:
              data.address.trim(),

            coverLetter:
              data.coverLetter?.trim() || "",

            resumeUrl,

            status: "New",
          },

          select: {
            id: true,
            careerJobId: true,
            fullName: true,
            email: true,
            status: true,
            createdAt: true,
          },
        });

      return createResponse(
        {
          message:
            "Application submitted successfully",

          id: application.id,
        },
        201
      );
    } catch (error: unknown) {
      /*
       * Prisma P2002:
       * Another request may have created the same
       * application between our duplicate check
       * and create().
       */
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code ===
          "P2002"
      ) {
        return createErrorResponse(
          "An application from this email already exists for this role. Each email may apply to a given role once.",
          409
        );
      }

      throw error;
    }
  } catch (error) {
    return handleApiError(error);
  }
}

/* ─────────────────────────────────────────────
   GET
   Admin-only application list
───────────────────────────────────────────── */

export async function GET(
  request: NextRequest
) {
  try {
    /* Admin authentication */
    const adminUser =
      await getCurrentAdmin();

    if (!adminUser) {
      return createErrorResponse(
        "Unauthorized - admin only",
        401
      );
    }

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams
        .get("search")
        ?.trim() || "";

    const status =
      searchParams
        .get("status")
        ?.trim() || "";

    const careerJobId =
      searchParams
        .get("careerJobId")
        ?.trim() || "";

    /*
     * Prisma where object.
     *
     * Using Prisma's generated type is preferable
     * to Record<string, unknown> because it gives
     * proper TypeScript checking.
     */
    const where: {
      status?: string;
      careerJobId?: string;
      OR?: Array<{
        fullName?: {
          contains: string;
          mode: "insensitive";
        };
        email?: {
          contains: string;
          mode: "insensitive";
        };
        phone?: {
          contains: string;
          mode: "insensitive";
        };
      }>;
    } = {};

    if (status && status !== "All") {
      where.status = status;
    }

    if (
      careerJobId &&
      careerJobId !== "All"
    ) {
      where.careerJobId =
        careerJobId;
    }

    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    const applications =
      await prisma.careerApplication.findMany(
        {
          where,

          orderBy: {
            createdAt: "desc",
          },

          include: {
            careerJob: {
              select: {
                id: true,
                title: true,
                department: true,
                location: true,
                employmentType: true,
              },
            },
          },
        }
      );

    return createResponse(
      applications
    );
  } catch (error) {
    return handleApiError(error);
  }
}