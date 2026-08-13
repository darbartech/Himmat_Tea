import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const transactions = await prisma.inventoryTransaction.findMany({
      include: { product: true },
      orderBy: { timestamp: 'desc' }
    })
    return createResponse(transactions)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getCurrentAdmin();
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401);
    }

    const body = await request.json();
    const { productId, type = 'adjustment', quantity, reason, referenceId } = body;

    if (!productId || quantity === undefined || quantity === null || !reason) {
      return createErrorResponse('productId, quantity, and reason are required', 400);
    }

    if (typeof quantity !== 'number' || isNaN(quantity)) {
      return createErrorResponse('quantity must be a valid number', 400);
    }

    const validTypes = ['in', 'out', 'adjustment'];
    if (!validTypes.includes(type)) {
      return createErrorResponse(`type must be one of: ${validTypes.join(', ')}`, 400);
    }

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: Number(productId) },
        select: { id: true, stock: true, name: true }
      });

      if (!product) {
        throw new Error(`Product with id ${productId} not found`);
      }

      const previousStock = Number(product.stock) || 0;
      const stockDelta = type === 'out' ? -Math.abs(quantity) : quantity;
      const newStock = previousStock + stockDelta;

      if (newStock < 0) {
        throw new Error(
          `Insufficient stock for ${product.name}. Current: ${previousStock}, requested change: ${stockDelta}, would result in: ${newStock}`
        );
      }

      const transaction = await tx.inventoryTransaction.create({
        data: {
          productId: Number(productId),
          type,
          quantity: Math.abs(quantity),
          previousStock,
          newStock,
          reason,
          referenceId: referenceId || null
        },
        include: { product: true }
      });

      await tx.product.update({
        where: { id: Number(productId) },
        data: { stock: newStock }
      });

      return transaction;
    });

    return createResponse(result, 201);
  } catch (error) {
    if (error instanceof Error) {
      return createErrorResponse(error.message, 400);
    }
    return handleApiError(error);
  }
}
