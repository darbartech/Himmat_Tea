import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createResponse, createErrorResponse, handleApiError } from '@/lib/api-utils'
import bcrypt from 'bcryptjs'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return createErrorResponse('Not found', 404)
  }
  return POST()
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return createErrorResponse('Not found', 404)
  }

  try {
    const existingAdmin = await prisma.adminUser.findFirst()
    if (existingAdmin) {
      return createResponse({ message: 'Database already seeded' })
    }

    const passwordHash = await bcrypt.hash('admin123', 10)

    await prisma.adminUser.create({
      data: {
        username: 'admin',
        email: 'admin@himmattea.com',
        passwordHash,
        role: 'superadmin',
        isActive: true
      }
    })

    const himmatTea = await prisma.productLine.create({
      data: {
        slug: 'himmat-tea',
        name: 'Himmat Tea',
        description: 'From the misty hills of Ilam to Darjeeling, discover teas that tell a story of soil, altitude, and generations of craftsmanship.',
        heroImage: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop',
        isActive: true,
        sortOrder: 0,
      }
    })

    const godgiftedDal = await prisma.productLine.create({
      data: {
        slug: 'godgifted-dal',
        name: 'Godgifted Dal',
        description: 'Unpolished, nutrient-rich dals that bring authentic flavours to your table.',
        heroImage: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop',
        isActive: true,
        sortOrder: 1,
      }
    })

    const teaProducts = await prisma.product.createMany({
      data: [
        {
          productLineId: himmatTea.id,
          name: 'Premium Green Tea',
          category: 'Green Tea',
          price: 249,
          stock: 145,
          status: 'In Stock',
          description: 'Fresh organic green tea from Assam',
          imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop',
          sku: 'HMT-GRN-001',
          reorderPoint: 50,
          hasVariants: true,
          isBestseller: true,
        },
        {
          productLineId: himmatTea.id,
          name: 'Classic Black Tea',
          category: 'Black Tea',
          price: 229,
          stock: 234,
          status: 'In Stock',
          description: 'Traditional black tea blend',
          imageUrl: 'https://images.unsplash.com/photo-1564890369478-c6b8b91994ed?w=400&h=300&fit=crop',
          sku: 'HMT-BLK-001',
          reorderPoint: 60,
          hasVariants: false,
        },
        {
          productLineId: himmatTea.id,
          name: 'Herbal Collection',
          category: 'Herbal',
          price: 199,
          stock: 25,
          status: 'Low Stock',
          description: 'Natural herbal tea mix',
          imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop',
          sku: 'HMT-HRB-001',
          reorderPoint: 40,
          hasVariants: false,
        },
        {
          productLineId: himmatTea.id,
          name: 'Tea Ceremony Set',
          category: 'Accessories',
          price: 899,
          stock: 12,
          status: 'In Stock',
          description: 'Complete tea ceremony kit',
          imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop',
          sku: 'HMT-ACC-001',
          reorderPoint: 10,
          hasVariants: false,
        },
        {
          productLineId: himmatTea.id,
          name: 'Masala Chai Mix',
          category: 'Spiced',
          price: 299,
          stock: 56,
          status: 'In Stock',
          description: 'Authentic masala chai spice blend',
          imageUrl: 'https://images.unsplash.com/photo-1586374820345-f6339ae67f71?w=400&h=300&fit=crop',
          sku: 'HMT-MSL-001',
          reorderPoint: 35,
          hasVariants: false,
          isBestseller: true,
        }
      ]
    })

    const dalProducts = await prisma.product.createMany({
      data: [
        {
          productLineId: godgiftedDal.id,
          name: 'Premium Toor Dal',
          category: 'Toor',
          price: 189,
          stock: 200,
          status: 'In Stock',
          description: 'Unpolished, stone-ground toor dal from Terai plains',
          imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
          sku: 'GG-DAL-001',
          reorderPoint: 40,
          hasVariants: false,
          isBestseller: true,
        },
        {
          productLineId: godgiftedDal.id,
          name: 'Organic Moong Dal',
          category: 'Moong',
          price: 219,
          stock: 150,
          status: 'In Stock',
          description: 'Green moong dal, hand-sorted and unpolished',
          imageUrl: 'https://images.unsplash.com/photo-1598344084757-b83f2081da8b?w=400&h=300&fit=crop',
          sku: 'GG-DAL-002',
          reorderPoint: 35,
          hasVariants: false,
        }
      ]
    })

    const sampleCustomers = await prisma.customer.createMany({
      data: [
        {
          name: 'Sarah Johnson',
          email: 'sarah@example.com',
          phone: '+91 9876543210',
          address: '123 Tea Street, Mumbai',
          ordersCount: 14,
          totalSpent: 5231,
          loyaltyPoints: 523,
          tier: 'Silver'
        },
        {
          name: 'Michael Chen',
          email: 'michael@example.com',
          phone: '+91 9876543211',
          address: '456 Herbal Lane, Delhi',
          ordersCount: 9,
          totalSpent: 3499,
          loyaltyPoints: 350,
          tier: 'Bronze'
        },
        {
          name: 'Emma Williams',
          email: 'emma@example.com',
          phone: '+91 9876543212',
          address: '789 Green Tea Road, Bangalore',
          ordersCount: 23,
          totalSpent: 8921,
          loyaltyPoints: 892,
          tier: 'Gold'
        }
      ]
    })

    await prisma.settings.create({
      data: {
        taxRate: 18,
        currency: '₹',
        storeName: 'Himmat Tea',
        storeEmail: 'support@himmattea.com',
        storePhone: '+91 9876543210',
        notificationsEnabled: true,
        lowStockThreshold: 30,
        gstNumber: '27AABCU9603R1ZX'
      }
    })

    return createResponse({
      message: 'Database seeded successfully!',
      productLines: 2,
      products: teaProducts.count + dalProducts.count,
      customers: sampleCustomers.count
    }, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
