import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError, SAFE_CUSTOMER_SELECT } from '@/lib/api-utils'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { sendAdminOrderAlertEmail } from '@/lib/email'
import { getWeightAdjustedPrice, VALID_WEIGHTS } from '@/lib/pricing'
import { BASE_CURRENCY, SUPPORTED_CURRENCIES, roundForCurrency } from '@/lib/currency'
import { resolveRate } from '@/lib/exchange-rates'
import { z } from 'zod'

const ORDER_STATUSES = ['AWAITING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'] as const
const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] as const
const VALID_PAYMENT_METHODS = ['MANUAL_QR', 'ESEWA', 'KHALTI', 'FONEPAY', 'CARD', 'COD'] as const

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive().optional().nullable(),
  productName: z.string().min(1).optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  weight: z.enum(VALID_WEIGHTS as [string, ...string[]]).optional(),
})

const createOrderSchema = z.object({
  customerId: z.number().int().positive().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerEmail: z.string().email('Valid email is required'),
  customerPhone: z.string().min(1, 'Phone number is required'),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  shippingAddress: z.string().min(1, 'Shipping address is required'),
  idempotencyKey: z.string().min(1, 'Idempotency key is required'),
  orderNumber: z.string().min(1).optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  couponCode: z.string().max(50).optional().nullable(),
  // Customer's selected display currency at checkout. The actual accounting
  // math above is always done in NPR — this only controls which currency
  // snapshot gets stored alongside the order. `clientExchangeRate` is
  // accepted but never trusted for the stored number; the server always
  // re-resolves the authoritative rate itself (see resolveRate()).
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  clientExchangeRate: z.number().positive().optional(),
}).strip()

function round2(n: number): number {
  return Number((Math.round(n * 100) / 100).toFixed(2))
}

async function validateCouponForOrder(
  tx: Prisma.TransactionClient | typeof prisma,
  code: string,
  subtotal: number
): Promise<{ ok: true; couponId: string; couponCode: string; discountAmount: number } | { ok: false; error: string }> {
  const coupon = await tx.coupon.findUnique({ where: { code } })
  if (!coupon || !coupon.isActive) {
    return { ok: false, error: 'Coupon code is invalid or no longer active.' }
  }
  try {
    const validFrom = new Date(coupon.validFrom)
    const validTo = new Date(coupon.validTo)
    const startOk = isNaN(validFrom.getTime()) || validFrom.getTime() <= Date.now()
    const endOk = isNaN(validTo.getTime()) || validTo.getTime() + 24 * 60 * 60 * 1000 >= Date.now()
    if (!startOk || !endOk) {
      return { ok: false, error: 'This coupon has expired or is not yet valid.' }
    }
  } catch {
    return { ok: false, error: 'This coupon has expired or is not yet valid.' }
  }
  if (coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: 'This coupon has reached its usage limit.' }
  }
  if (coupon.minOrderAmount > 0 && subtotal < coupon.minOrderAmount) {
    return { ok: false, error: `Minimum order amount of ${coupon.minOrderAmount.toFixed(2)} required for this coupon.` }
  }
  const dt = String(coupon.discountType).toLowerCase()
  let raw = 0
  if (dt === 'percent' || dt === 'percentage') {
    raw = Math.max(0, (subtotal * coupon.discountValue) / 100)
    if (coupon.maxDiscount > 0 && raw > coupon.maxDiscount) raw = coupon.maxDiscount
  } else {
    raw = Math.max(0, coupon.discountValue)
  }
  if (raw > subtotal) raw = subtotal
  const discountAmount = round2(raw)
  return {
    ok: true,
    couponId: coupon.id,
    couponCode: coupon.code,
    discountAmount,
  }
}

async function generateOrderNumber(date: Date): Promise<string> {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const prefix = `HT-${y}${m}${d}-`

  const latest = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
    select: { orderNumber: true }
  })

  let seq = 1
  if (latest?.orderNumber) {
    const match = latest.orderNumber.match(/-(\d{4,})$/)
    if (match) {
      seq = parseInt(match[1], 10) + 1
    }
  }
  return `${prefix}${String(seq).padStart(4, '0')}`
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
      baseCurrency: 'baseCurrency' in order ? order.baseCurrency : undefined,
      customerCurrency: 'customerCurrency' in order ? order.customerCurrency : undefined,
      exchangeRate: 'exchangeRate' in order ? order.exchangeRate : undefined,
      convertedTotal: 'convertedTotal' in order ? order.convertedTotal : undefined,
      convertedTax: 'convertedTax' in order ? order.convertedTax : undefined,
      convertedShippingCost: 'convertedShippingCost' in order ? order.convertedShippingCost : undefined,
      convertedDiscountAmount: 'convertedDiscountAmount' in order ? order.convertedDiscountAmount : undefined,
      convertedGrandTotal: 'convertedGrandTotal' in order ? order.convertedGrandTotal : undefined,
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
    const rl = await rateLimit.orderCreate(request)
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

    // Re-price every line item server-side using the same weight multiplier
    // the client used to compute the price it displayed and had the customer
    // confirm at checkout (see src/lib/pricing.ts). Previously this always
    // charged the flat, weight-blind product.price — silently undercharging
    // 100g orders and, worse, charging 25g orders MORE than what checkout
    // showed the customer. Never trust a client-supplied price.
    const lineItems = data.items.map(item => {
      const product = productMap.get(item.productId)!
      return {
        productId: item.productId,
        variantId: item.variantId,
        name: item.productName || product.name,
        quantity: item.quantity,
        price: getWeightAdjustedPrice(product.price, item.weight),
        weight: item.weight,
      }
    })

    const subtotal = round2(lineItems.reduce((s, i) => s + i.price * i.quantity, 0))

    // --- Server-side coupon re-validation (never trust client-calculated discount) ---
    let appliedCouponCode: string | null = null
    let discountAmount = 0
    let couponToIncrement: string | null = null

    if (data.couponCode) {
      const couponValidation = await validateCouponForOrder(prisma, data.couponCode, subtotal)
      if (!couponValidation.ok) {
        return createErrorResponse(`Coupon: ${couponValidation.error}`, 400)
      }
      discountAmount = couponValidation.discountAmount
      appliedCouponCode = couponValidation.couponCode
      couponToIncrement = couponValidation.couponId
    }

    const settings = await prisma.settings.findFirst({
      select: { taxRate: true, shippingFlatRate: true }
    })
    const taxRate = settings?.taxRate ?? 0
    const shippingCost = settings?.shippingFlatRate ?? 0
    const taxable = Math.max(0, round2(subtotal - discountAmount))
    const tax = round2(taxable * (taxRate / 100))
    const total = subtotal
    const grandTotal = round2(taxable + tax + shippingCost)

    // --- Multi-currency snapshot ---------------------------------------
    // Resolve the customer's selected display currency and the
    // authoritative NPR exchange rate for it (never trust the client's
    // `clientExchangeRate` for the stored figure — always re-derive from
    // the same cached rate source the storefront itself reads from, so a
    // tampered client value can't produce a misleading order record).
    const customerCurrency = data.currency && data.currency !== BASE_CURRENCY ? data.currency : BASE_CURRENCY
    const exchangeRate = await resolveRate(customerCurrency)
    const convertedTotal = roundForCurrency(subtotal * exchangeRate, customerCurrency)
    const convertedTax = roundForCurrency(tax * exchangeRate, customerCurrency)
    const convertedShippingCost = roundForCurrency(shippingCost * exchangeRate, customerCurrency)
    const convertedDiscountAmount = roundForCurrency(discountAmount * exchangeRate, customerCurrency)
    const convertedGrandTotal = roundForCurrency(grandTotal * exchangeRate, customerCurrency)

    const now = new Date()
    let orderNumber = data.orderNumber || await generateOrderNumber(now)
    let orderUniqAttempts = 0
    while (orderUniqAttempts < 5) {
      const taken = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true } })
      if (!taken) break
      orderNumber = await generateOrderNumber(now)
      orderUniqAttempts++
    }
    if (orderUniqAttempts >= 5) {
      return createErrorResponse('Unable to generate unique order number. Please refresh and try again.', 409)
    }

    const initialStatus = isAdmin && data.status ? data.status : 'AWAITING_PAYMENT'

    let createdOrderId: string | undefined
    let createdOrderItems: { productId: number; quantity: number; name: string }[] | undefined

    try {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // --- Atomically increment coupon.usedCount BEFORE order.create so
        // --- if transaction rolls back, the count is also rolled back.
        if (couponToIncrement) {
          const coupon = await tx.coupon.findUnique({
            where: { id: couponToIncrement },
            select: { usedCount: true, usageLimit: true },
          })
          if (!coupon || coupon.usedCount >= coupon.usageLimit) {
            throw new Error(
              `COUPON_RACE:This coupon has reached its usage limit since you applied it.`
            )
          }
          await tx.coupon.update({
            where: { id: couponToIncrement },
            data: { usedCount: { increment: 1 } },
          })
        }

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

        const orderData: Record<string, any> = {
          orderNumber,
          customerId,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          shippingAddress: data.shippingAddress,
          total: subtotal,
          shippingCost,
          tax,
          discountAmount,
          grandTotal,
          baseCurrency: BASE_CURRENCY,
          customerCurrency,
          exchangeRate,
          convertedTotal,
          convertedTax,
          convertedShippingCost,
          convertedDiscountAmount,
          convertedGrandTotal,
          status: initialStatus,
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
        }
        if (appliedCouponCode) {
          orderData.couponCode = appliedCouponCode
        }

        const order = await tx.order.create({
          data: orderData as any,
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
      }, { timeout: 60_000, maxWait: 10_000 })

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

        if (!isAdmin) {
          prisma.notification.create({
            data: {
              title: 'New order awaiting payment',
              message: `${data.customerName} placed order ${orderNumber} — ₹${grandTotal} — awaiting QR payment verification.`,
              orderId: createdOrderId,
            }
          }).catch(() => {})

          sendAdminOrderAlertEmail({
            orderNumber,
            customerName: data.customerName,
            customerEmail: data.customerEmail,
            grandTotal,
          }).catch(err => console.error('[order] admin alert email failed', err))
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
