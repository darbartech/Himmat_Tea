import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, createResponse, handleApiError } from '@/lib/api-utils';
import { sendContactFormAlertEmail } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
}).strip();

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildFingerprint(data: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  return [
    normalizeValue(data.name),
    normalizeValue(data.email),
    normalizeValue(data.subject),
    normalizeValue(data.message),
  ].join('|');
}

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimit.auth(request);
    if (!rl.allowed) {
      return createErrorResponse(rl.error || 'Too many requests. Please try again later.', 429);
    }

    const body = await request.json();
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0]?.message || 'Invalid contact form data', 400);
    }

    const data = parsed.data;
    const fingerprint = buildFingerprint(data);
    const windowStart = new Date(Date.now() - 1000 * 60 * 60 * 24);

    const recentNotifications = await prisma.notification.findMany({
      where: {
        title: 'New contact form submission',
        timestamp: { gte: windowStart },
      },
      select: { message: true },
      take: 100,
    });

    const duplicate = recentNotifications.some((notification) => {
      const message = notification.message || '';
      const candidate = message.toLowerCase();
      return candidate.includes(normalizeValue(data.email)) && candidate.includes(normalizeValue(data.message));
    });

    if (duplicate) {
      return createResponse({ success: true, duplicate: true, message: 'Duplicate submission already sent.' }, 200);
    }

    await prisma.notification.create({
      data: {
        title: 'New contact form submission',
        message: `${data.name} submitted a contact form. Email: ${data.email}. Subject: ${data.subject}. Fingerprint: ${fingerprint}`,
      },
    });

    await sendContactFormAlertEmail({
      name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    });

    return createResponse({ success: true, duplicate: false, message: 'Message submitted successfully.' }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
