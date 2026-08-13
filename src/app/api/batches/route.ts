import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    const where: any = {};
    if (productId) {
      where.productId = parseInt(productId);
    }

    const batches = await prisma.batch.findMany({
      where,
      include: { product: { select: { id: true, name: true } } },
      orderBy: [{ productId: 'asc' }, { receivedDate: 'desc' }],
    });
    return createResponse(batches);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const body = await request.json();
    const { productId, batchNumber, quantity, receivedDate, expiryDate, supplier, costPrice } = body;

    if (!productId || !batchNumber || !quantity || !receivedDate) {
      return createErrorResponse('productId, batchNumber, quantity, and receivedDate are required', 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.create({
        data: {
          productId: Number(productId),
          batchNumber: String(batchNumber),
          quantity: Number(quantity),
          receivedDate: String(receivedDate),
          expiryDate: expiryDate ? String(expiryDate) : null,
          supplier: supplier ? String(supplier) : null,
          costPrice: Number(costPrice) || 0,
        },
        include: { product: { select: { id: true, name: true, stock: true } } },
      });

      const qty = Number(quantity) || 0;
      if (qty > 0) {
        const current = await tx.product.findUnique({
          where: { id: Number(productId) },
          select: { stock: true },
        });
        const previousStock = Number(current?.stock) || 0;
        const newStock = previousStock + qty;
        await tx.product.update({
          where: { id: Number(productId) },
          data: { stock: newStock },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: Number(productId),
            type: 'in',
            quantity: qty,
            previousStock,
            newStock,
            reason: `Batch ${batchNumber} received`,
            referenceId: `BATCH-${batch.id}`,
          },
        });
      }

      return batch;
    });

    return createResponse(result, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
