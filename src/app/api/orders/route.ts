import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError, SAFE_CUSTOMER_SELECT } from '@/lib/api-utils'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth'
import { rateLimitOrderCreate } from '@/lib/rate-limit'
import { z } from 'zod'

const ORDER_STATUSES = ['AWAITING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const
const VALID_PAYMENT_METHODS = ['MANUAL_QR', 'ESEWA', 'KHALTI', 'FONEPAY', 'CARD', 'COD'] as const

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().optional().nullable(),
  productName: z.string().min(1).optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  weight: z.string().optional(),
})

const createOrderSchema = z.object({
  customerId: z.number().int().positive().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(1, 'Phone number is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
}).strip()

function generateOrderNumber(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 900000) + 100000)
  return `HT-${y}${m}${d}-${rand}`
}

function isMissingColumnError(error: any, column: string) {
  return !!(
    error?.code === 'P2021' ||
    error?.message?.includes(`column \"${column}\"`) ||
    error?.message?.includes(`column \"${column}\" of relation`) ||
    error?.message?.includes(`column ${column}`)
  )
}

async function findAdminOrders() {
  try {
    return await prisma.order.findMany({
      include: {
        customer: { select: SAFE_CUSTOMER_SELECT },
        items: true,
        payment: true,
      },
      orderBy: { orderDate: 'desc' }
    })
  } catch (error) {
    if (isMissingColumnError(error, 'orderNumber')) {
      return await prisma.order.findMany({
        select: {
          id: true,
          customerId: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          shippingAddress: true,
          total: true,
          shippingCost: true,
          tax: true,
          grandTotal: true,
          status: true,
          orderDate: true,
          trackingNumber: true,
          courierPartner: true,
          createdAt: true,
          updatedAt: true,
          customer: { select: SAFE_CUSTOMER_SELECT },
          items: true,
          payment: {
            select: {
              method: true,
              status: true,
              amount: true,
              transactionReference: true,
            }
          }
        },
        orderBy: { orderDate: 'desc' }
      })
    }
    throw error
  }
}

async function findCustomerOrders(customerId: number) {
  try {
    return await prisma.order.findMany({
      where: { customerId },
      include: {
        items: true,
        payment: true,
      },
      orderBy: { orderDate: 'desc' }
    })
  } catch (error) {
    if (isMissingColumnError(error, 'orderNumber')) {
      return await prisma.order.findMany({
        where: { customerId },
        select: {
          id: true,
          customerId: true,
          customerName: true,
          customerEmail: true,
          customerPhone: true,
          shippingAddress: true,
          total: true,
          shippingCost: true,
          tax: true,
          grandTotal: true,
          status: true,
          orderDate: true,
          trackingNumber: true,
          courierPartner: true,
          createdAt: true,
          updatedAt: true,
          items: true,
          payment: {
            select: {
              method: true,
              status: true,
              amount: true,
              transactionReference: true,
            }
          }
        },
        orderBy: { orderDate: 'desc' }
      })
    }
    throw error
  }
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    const isAdmin = currentUser.type === 'admin'

    if (isAdmin) {
      const adminUser = await getCurrentAdmin()
      if (!adminUser) {
        return createErrorResponse('Forbidden', 403)
      }

      const orders = await findAdminOrders()
      return createResponse({ success: true, data: orders })
    }

    const orders = await findCustomerOrders(currentUser.id)

    const sanitizedOrders = orders.map(order => ({
      id: order.id,
      orderNumber: 'orderNumber' in order ? order.orderNumber : undefined,
      customerId: order.customerId,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      total: order.total,
      shippingCost: order.shippingCost,
      tax: order.tax,
      grandTotal: order.grandTotal,
      status: order.status,
      orderDate: order.orderDate,
      trackingNumber: order.trackingNumber,
      courierPartner: order.courierPartner,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items,
      payment: order.payment ? {
        method: order.payment.method,
        status: order.payment.status,
        amount: order.payment.amount,
        transactionReference: order.payment.transactionReference,
      } : null,
    }))

    return createResponse({ success: true, data: sanitizedOrders })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitOrderCreate(request)
    if (!rl.allowed) {
      return createErrorResponse(rl.error || 'Too many requests. Please try again later.', 429)
    }

    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return createErrorResponse('Unauthorized', 401)
    }

    const isAdmin = 'username' in currentUser

    const body = await request.json()
    const parsed = createOrderSchema.safeParse(body)

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]
      const field = firstError.path.join('.') || 'request'
      return createErrorResponse(`${field}: ${firstError.message}`, 400)
    }

    const data = parsed.data

    let customerId: number
    if (isAdmin) {
      if (!data.customerId) {
        return createErrorResponse('customerId is required when creating orders as admin', 400)
      }
      customerId = data.customerId
    } else {
      customerId = currentUser.id
    }

    const customerExists = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true }
    })
    if (!customerExists) {
      return createErrorResponse('Customer not found', 404)
    }

    const existingIdempotent = await prisma.order.findFirst({
      where: {
        customerId,
        idempotencyKey: data.idempotencyKey,
      },
      include: { items: true, payment: true, customer: { select: SAFE_CUSTOMER_SELECT } }
    })
    if (existingIdempotent) {
      return createResponse({ success: true, data: existingIdempotent, duplicate: true }, 200)
    }

    const productIds = data.items.map(i => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, price: true, stock: true, name: true, isActive: true }
    })

    const productMap = new Map(products.map(p => [p.id, p]))
    for (const item of data.items) {
      const product = productMap.get(item.productId)
      if (!product) {
        return createErrorResponse(`Product not found: ID ${item.productId}`, 400)
      }
      if (!product.isActive) {
        return createErrorResponse(`Product "${product.name}" is not available for purchase`, 400)
      }
      if (product.stock < item.quantity) {
        return createErrorResponse(
          `Sorry, "${product.name}" is no longer available in the requested quantity.`,
          409
        )
      }
    }

    const lineItems = data.items.map(item => {
      const product = productMap.get(item.productId)!
      return {
        productId: item.productId,
        variantId: item.variantId,
        name: item.productName || product.name,
        quantity: item.quantity,
        price: product.price,
        weight: item.weight,
      }
    })

    const subtotal = lineItems.reduce((s, i) => s + i.price * i.quantity, 0)

    const settings = await prisma.settings.findFirst({
      select: { taxRate: true, shippingFlatRate: true }
    })
    const taxRate = settings?.taxRate ?? 0
    const shippingCost = settings?.shippingFlatRate ?? 0
    const tax = Number((subtotal * (taxRate / 100)).toFixed(2))
    const total = subtotal
    const grandTotal = Number((total + shippingCost + tax).toFixed(2))

    const now = new Date()
    let orderNumber = generateOrderNumber(now)
    let orderUniqAttempts = 0
    while (orderUniqAttempts < 5) {
      const taken = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } })
      if (!taken) break
      orderNumber = generateOrderNumber(now)
      orderUniqAttempts++
    }

    let createdOrderId: string | undefined
    let createdOrderItems: { productId: number; quantity: number; name: string }[] | undefined

    try {
      await prisma.$transaction(async (tx) => {
        for (const item of lineItems) {
          const updated = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity }
            },
            data: {
              stock: { decrement: item.quantity }
            }
          })
          if (updated.count === 0) {
            const product = productMap.get(item.productId)!
            throw new Error(
              `STOCK_RACE:Sorry, "${product.name}" is no longer available in the requested quantity. Please refresh and try again.`
            )
          }
        }

        const order = await tx.order.create({
          data: {
            orderNumber,
            customerId,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            customerPhone: data.customerPhone,
            shippingAddress: data.shippingAddress,
            total: subtotal,
            shippingCost,
            tax,
            grandTotal,
            status: 'AWAITING_PAYMENT',
            idempotencyKey: data.idempotencyKey,
            items: {
              create: lineItems.map(li => ({
                productId: li.productId,
                name: li.name,
                quantity: li.quantity,
                price: li.price,
                weight: li.weight,
              }))
            }
          },
          select: { id: true, items: { select: { productId: true, quantity: true, name: true } } }
        })

        await tx.payment.create({
          data: {
            orderId: order.id,
            method: 'MANUAL_QR',
            status: 'PENDING',
            amount: grandTotal,
          }
        })

        createdOrderId = order.id
        createdOrderItems = order.items
      }, { timeout: 15_000, maxWait: 15_000 })

      if (createdOrderId && createdOrderItems) {
        const refreshed = await prisma.product.findMany({
          where: { id: { in: createdOrderItems.map(i => i.productId) } },
          select: { id: true, stock: true, name: true }
        })
        const refreshedMap = new Map(refreshed.map(p => [p.id, p]))
        await prisma.inventoryTransaction.createMany({
          data: createdOrderItems
            .map(i => {
              const p = refreshedMap.get(i.productId)
              if (!p) return null
              return {
                productId: i.productId,
                productName: p.name,
                type: 'ORDER_RESERVED' as const,
                quantity: i.quantity,
                previousStock: p.stock + i.quantity,
                newStock: p.stock,
                reason: `Order reserved at checkout`,
              }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
        }).catch(() => {})

        prisma.customer.update({
          where: { id: customerId },
          data: {
            ordersCount: { increment: 1 },
            totalSpent: { increment: grandTotal },
          }
        }).catch(() => {})

        if (isAdmin) {
          const adminForNote = currentUser as { id: number; username: string; email: string; type: 'admin' }
          prisma.internalNote.create({
            data: {
              orderId: createdOrderId,
              text: `Order created manually by admin ${adminForNote.username}`,
              adminId: String(adminForNote.id),
              adminName: adminForNote.username,
            }
          }).catch(() => {})
        }
      }

      const finalOrder = createdOrderId ? await prisma.order.findUnique({
        where: { id: createdOrderId },
        include: {
          customer: { select: SAFE_CUSTOMER_SELECT },
          items: true,
          payment: true,
        }
      }) : null

      return createResponse({ success: true, data: finalOrder }, 201)
    } catch (txErr: any) {
      if (txErr?.code === 'P2002' && Array.isArray(txErr.meta?.target)) {
        const target = txErr.meta.target.join(',')
        if (target.includes('idempotencyKey') && target.includes('customerId')) {
          const existing = await prisma.order.findFirst({
            where: { customerId, idempotencyKey: data.idempotencyKey },
            include: { items: true, payment: true, customer: { select: SAFE_CUSTOMER_SELECT } }
          })
          if (existing) {
            return createResponse({ success: true, data: existing, duplicate: true }, 200)
          }
        }
        if (target.includes('orderNumber')) {
          return createErrorResponse('Order number conflict, please retry.', 409)
        }
      }
      if (txErr?.message?.startsWith('STOCK_RACE:')) {
        return createErrorResponse(txErr.message.replace('STOCK_RACE:', ''), 409)
      }
      throw txErr
    }
  } catch (error: any) {
    if (error?.message?.startsWith('STOCK_RACE:')) {
      return createErrorResponse(error.message.replace('STOCK_RACE:', ''), 409)
    }
    return handleApiError(error)
  }
}
