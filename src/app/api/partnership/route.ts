import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, createResponse, handleApiError } from '@/lib/api-utils';
import { sendPartnershipEnquiryAlertEmail } from '@/lib/email';
import { rateLimitAuth } from '@/lib/rate-limit';

const partnershipSchema = z.object({
  business: z.string().min(1, 'Business name is required'),
  contact: z.string().min(1, 'Contact name is required'),
  type: z.string().min(1, 'Business type is required'),
  country: z.string().min(1, 'Country is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional().or(z.literal('')),
  volume: z.string().optional().or(z.literal('')),
  productLines: z.array(z.string()).default([]),
  message: z.string().optional().or(z.literal('')),
}).strip();

function normalizeEnquiryValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function buildEnquiryFingerprint(data: {
  business: string;
  contact: string;
  email: string;
  type: string;
  country: string;
  productLines: string[];
  message?: string;
}) {
  return [
    normalizeEnquiryValue(data.business),
    normalizeEnquiryValue(data.contact),
    normalizeEnquiryValue(data.email),
    normalizeEnquiryValue(data.type),
    normalizeEnquiryValue(data.country),
    data.productLines.map((line) => normalizeEnquiryValue(line)).sort().join('|'),
    normalizeEnquiryValue(data.message || ''),
  ].join('|');
}

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitAuth(request)
    if (!rl.allowed) {
      return createErrorResponse(rl.error || 'Too many requests. Please try again later.', 429)
    }

    const body = await request.json();
    const parsed = partnershipSchema.safeParse(body);

    if (!parsed.success) {
      return createErrorResponse(parsed.error.issues[0]?.message || 'Invalid partnership enquiry data', 400);
    }

    const data = parsed.data;
    const fingerprint = buildEnquiryFingerprint(data);
    const windowStart = new Date(Date.now() - 1000 * 60 * 60 * 24);

    const recentNotifications = await prisma.notification.findMany({
      where: {
        title: 'New partnership enquiry',
        timestamp: { gte: windowStart },
      },
      select: { message: true },
      take: 100,
    });

    const duplicate = recentNotifications.some((notification) => {
      const message = notification.message || '';
      const candidate = message.toLowerCase();
      return candidate.includes(normalizeEnquiryValue(data.email)) && candidate.includes(normalizeEnquiryValue(data.business));
    });

    if (duplicate) {
      return createResponse({ success: true, duplicate: true, message: 'Duplicate enquiry already submitted.' }, 200);
    }

    await prisma.notification.create({
      data: {
        title: 'New partnership enquiry',
        message: `${data.contact} from ${data.business} requested a wholesale partnership. Email: ${data.email}. Fingerprint: ${fingerprint}`,
      },
    });

    await sendPartnershipEnquiryAlertEmail({
      business: data.business,
      contact: data.contact,
      type: data.type,
      country: data.country,
      email: data.email,
      phone: data.phone || '',
      volume: data.volume || '',
      productLines: data.productLines,
      message: data.message || '',
    });

    return createResponse({ success: true, duplicate: false, message: 'Partnership enquiry submitted successfully.' }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
