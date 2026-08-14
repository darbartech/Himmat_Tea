import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import { getCurrentAdmin } from '@/lib/auth'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: { product: true },
        },
      },
    })
    if (!purchaseOrder) {
      return createErrorResponse('Purchase order not found', 404)
    }
    return createResponse(purchaseOrder)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const { id } = await params
    const body = await request.json()
    const { items, ...poData } = body ?? {}

    const existing = await prisma.purchaseOrder.findUnique({
      where: { id: parseInt(id) },
      include: { items: true },
    })
    if (!existing) {
      return createErrorResponse('Purchase order not found', 404)
    }

    const result = await prisma.$transaction(async (tx) => {
      const updateData: Record<string, any> = { ...poData }

      if (items && Array.isArray(items)) {
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId: parseInt(id) },
        })
        updateData.items = {
          create: items.map((i: any) => {
            const { id: _itemId, purchaseOrderId, product, ...rest } = i
            return rest
          }),
        }
      }

      const updated = await tx.purchaseOrder.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          items: { include: { product: true } },
        },
      })

      const statusChanged = poData.status && poData.status !== existing.status
      const isReceiving =
        statusChanged &&
        (poData.status === 'Received' ||
          updated.status === 'Received' ||
          (poData.received === true))

      if (isReceiving && updated.items && updated.items.length > 0) {
        for (const line of updated.items) {
          const qty = Number(line.quantity) || 0
          if (qty <= 0) continue
          const productId = Number(line.productId)
          const unitPrice = Number(line.unitPrice) || 0
          const currentProduct = await tx.product.findUnique({
            where: { id: productId },
            select: { id: true, stock: true, name: true },
          })
          if (currentProduct) {
            const currentStock = Number(currentProduct.stock) || 0
            const previousStock = currentStock
            const newStock = currentStock + qty
            await tx.product.update({
              where: { id: productId },
              data: { stock: newStock },
            })
            await tx.inventoryTransaction.create({
              data: {
                productId,
                productName: currentProduct.name,
                type: 'in',
                quantity: qty,
                previousStock,
                newStock,
                reason: `Received PO #${updated.poNumber || updated.id}`,
                referenceId: `PO-${updated.id}`,
              },
            })
          }
        }
      }

      return updated
    })

    return createResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const adminUser = await getCurrentAdmin()
    if (!adminUser) {
      return createErrorResponse('Unauthorized - admin only', 401)
    }
    const { id } = await params
    await prisma.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: parseInt(id) },
    })
    await prisma.purchaseOrder.delete({
      where: { id: parseInt(id) },
    })
    return createResponse({ message: 'Purchase order deleted successfully' })
  } catch (error) {
    return handleApiError(error)
  }
}
