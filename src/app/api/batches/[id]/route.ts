import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export const maxDuration = 120;

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const { id } = await params;
    const batch = await prisma.batch.findUnique({
      where: { id: parseInt(id) },
      include: { product: { select: { id: true, name: true } } },
    });
    if (!batch) {
      return createErrorResponse('Batch not found', 404);
    }
    return createResponse(batch);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.batch.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, quantity: true, productId: true },
    });
    if (!existing) {
      return createErrorResponse('Batch not found', 404);
    }

    const safeData: Record<string, any> = {};
    if (typeof body.batchNumber === 'string') safeData.batchNumber = body.batchNumber;
    if (typeof body.receivedDate === 'string') safeData.receivedDate = body.receivedDate;
    if (body.expiryDate !== undefined) safeData.expiryDate = body.expiryDate || null;
    if (body.supplier !== undefined) safeData.supplier = body.supplier || null;
    if (typeof body.costPrice === 'number') safeData.costPrice = body.costPrice;

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let updated = await tx.batch.update({
        where: { id: parseInt(id) },
        data: safeData,
        include: { product: { select: { id: true, name: true } } },
      });

      if (typeof body.quantity === 'number' && Number(body.quantity) !== Number(existing.quantity)) {
        const oldQty = Number(existing.quantity) || 0;
        const newQty = Number(body.quantity) || 0;
        const delta = newQty - oldQty;

        const productCurrent = await tx.product.findUnique({
          where: { id: existing.productId },
          select: { stock: true, name: true },
        });
        const previousStock = Number(productCurrent?.stock) || 0;
        const newStock = previousStock + delta;

        if (newStock < 0) {
          throw new Error(`Insufficient stock: decreasing by ${Math.abs(delta)} would result in ${newStock}`);
        }

        updated = await tx.batch.update({
          where: { id: parseInt(id) },
          data: { quantity: newQty },
          include: { product: { select: { id: true, name: true } } },
        });

        await tx.product.update({
          where: { id: existing.productId },
          data: { stock: newStock },
        });

        await tx.inventoryTransaction.create({
          data: {
            productId: existing.productId,
            productName: productCurrent?.name || `Product ${existing.productId}`,
            type: 'adjustment',
            quantity: Math.abs(delta),
            previousStock,
            newStock,
            reason: `Batch ${existing.id} quantity adjusted (${delta > 0 ? '+' : ''}${delta})`,
            referenceId: `BATCH-EDIT-${existing.id}`,
          },
        });
      }

      return updated;
    });

    return createResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 400);
    }
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }
    const { id } = await params;

    const existing = await prisma.batch.findUnique({
      where: { id: parseInt(id) },
      select: { id: true, quantity: true, productId: true, batchNumber: true },
    });
    if (!existing) {
      return createErrorResponse('Batch not found', 404);
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const qty = Number(existing.quantity) || 0;
      if (qty > 0) {
        const productCurrent = await tx.product.findUnique({
          where: { id: existing.productId },
          select: { stock: true, name: true },
        });
        const previousStock = Number(productCurrent?.stock) || 0;
        const newStock = Math.max(0, previousStock - qty);
        await tx.product.update({
          where: { id: existing.productId },
          data: { stock: newStock },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: existing.productId,
            productName: productCurrent?.name || `Product ${existing.productId}`,
            type: 'out',
            quantity: qty,
            previousStock,
            newStock,
            reason: `Batch ${existing.batchNumber} deleted`,
            referenceId: `BATCH-DEL-${existing.id}`,
          },
        });
      }
      await tx.batch.delete({ where: { id: parseInt(id) } });
    });

    return createResponse({ message: 'Batch deleted successfully' });
  } catch (error) {
    return handleApiError(error);
  }
}
