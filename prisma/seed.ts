import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // First, delete all existing data to avoid duplicates
  await prisma.review.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.internalNote.deleteMany()
  await prisma.order.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.batch.deleteMany()
  await prisma.productVariant.deleteMany()
  await prisma.collectionItem.deleteMany()
  await prisma.collection.deleteMany()
  await prisma.product.deleteMany()
  await prisma.blogPost.deleteMany()
  await prisma.fAQ.deleteMany()
  await prisma.brewingGuide.deleteMany()
  await prisma.coupon.deleteMany()
  await prisma.adminUser.deleteMany()
  await prisma.inventoryTransaction.deleteMany()
  await prisma.purchaseOrderItem.deleteMany()
  await prisma.purchaseOrder.deleteMany()
  await prisma.settings.deleteMany()
  await prisma.loyaltyProgram.deleteMany()
  await prisma.notification.deleteMany()

  // Create products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: "Dragon Well Longjing",
        category: "green",
        price: 1850,
        stock: 100,
        status: "In Stock",
        description: "Dragon Well Longjing is one of China's most celebrated green teas, grown in the hills around Hangzhou's West Lake. Its flat, jade-green leaves unfurl in hot water to release a sweet, chestnut-like fragrance with a lingering vegetal freshness.",
        imageUrl: "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=800&h=800&fit=crop&q=80",
        sku: "GREEN-001",
        reorderPoint: 20,
        hasVariants: false,
        isActive: true,
        sortOrder: 1,
        isBestseller: true
      }
    }),
    prisma.product.create({
      data: {
        name: "First Flush Darjeeling",
        category: "black",
        price: 2200,
        stock: 50,
        status: "In Stock",
        description: "Harvested in the first weeks of spring from Darjeeling's misty gardens, this First Flush tea captures the season's most delicate essence. Light amber in the cup with a muscatel grape character and floral notes.",
        imageUrl: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&h=800&fit=crop&q=80",
        sku: "BLACK-001",
        reorderPoint: 15,
        hasVariants: false,
        isActive: true,
        sortOrder: 2,
        isBestseller: true
      }
    }),
    prisma.product.create({
      data: {
        name: "Himalayan Herbal Blend",
        category: "herbal",
        price: 1400,
        stock: 200,
        status: "In Stock",
        description: "A soothing blend of wild Himalayan herbs, lemongrass, and chamomile from the organic farms of Ilam. Naturally caffeine-free, this herbal infusion calms the mind and warms the spirit.",
        imageUrl: "https://images.unsplash.com/photo-1596344084757-b83f2081da8b?w=800&h=800&fit=crop&q=80",
        sku: "HERBAL-001",
        reorderPoint: 30,
        hasVariants: false,
        isActive: true,
        sortOrder: 3
      }
    }),
    prisma.product.create({
      data: {
        name: "Wuyi Rock Oolong",
        category: "oolong",
        price: 2600,
        stock: 40,
        status: "In Stock",
        description: "Grown on the rocky cliffs of the Wuyi Mountains, this exceptional oolong carries a distinctive mineral 'rock rhyme' known as yangyun. Roasted over charcoal to perfection.",
        imageUrl: "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=800&h=800&fit=crop&q=80",
        sku: "OOLONG-001",
        reorderPoint: 10,
        hasVariants: false,
        isActive: true,
        sortOrder: 4
      }
    }),
    prisma.product.create({
      data: {
        name: "Silver Needle White Tea",
        category: "white",
        price: 3200,
        stock: 30,
        status: "In Stock",
        description: "Silver Needle (Bai Hao Yin Zhen) is the most prized white tea in the world, made exclusively from unopened spring buds with their silver-white down still intact.",
        imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&h=800&fit=crop&q=80",
        sku: "WHITE-001",
        reorderPoint: 8,
        hasVariants: false,
        isActive: true,
        sortOrder: 5,
        isBestseller: true
      }
    }),
    prisma.product.create({
      data: {
        name: "Nepal Green Ilam",
        category: "green",
        price: 1200,
        stock: 150,
        status: "In Stock",
        description: "Grown at 1,800 metres above sea level in Nepal's Ilam district, this green tea benefits from cool mountain air and rich volcanic soil.",
        imageUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=800&fit=crop&q=80",
        sku: "GREEN-002",
        reorderPoint: 25,
        hasVariants: false,
        isActive: true,
        sortOrder: 6
      }
    }),
    prisma.product.create({
      data: {
        name: "Assam CTC Breakfast",
        category: "black",
        price: 950,
        stock: 300,
        status: "In Stock",
        description: "A robust, full-bodied breakfast tea from the lush Assam valley. CTC processing creates small, uniform pellets that brew into a malty, strong cup perfect for mornings.",
        imageUrl: "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&h=800&fit=crop&q=80",
        sku: "BLACK-002",
        reorderPoint: 50,
        hasVariants: false,
        isActive: true,
        sortOrder: 7
      }
    }),
    prisma.product.create({
      data: {
        name: "Chamomile Calm",
        category: "herbal",
        price: 1100,
        stock: 180,
        status: "In Stock",
        description: "Whole chamomile flowers hand-harvested from the fertile Nile Delta, prized for their large size and intensely apple-like aroma.",
        imageUrl: "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=800&h=800&fit=crop&q=80",
        sku: "HERBAL-002",
        reorderPoint: 25,
        hasVariants: false,
        isActive: true,
        sortOrder: 8
      }
    })
  ])

  // Create reviews
  const reviews = [
    { productId: products[0].id, name: "Priya S.", initials: "PS", rating: 5, date: "June 2026", comment: "Absolutely exquisite. The aroma is unlike anything I've tasted before. Worth every rupee.", status: "Approved" },
    { productId: products[0].id, name: "David K.", initials: "DK", rating: 5, date: "May 2026", comment: "I order this every month. My morning ritual is incomplete without it. Top quality packaging too.", status: "Approved" },
    { productId: products[0].id, name: "Meera R.", initials: "MR", rating: 4, date: "April 2026", comment: "Lovely tea, smooth and fragrant. Delivery was fast. Will definitely order again!", status: "Approved" },
    { productId: products[1].id, name: "Anita P.", initials: "AP", rating: 5, date: "June 2026", comment: "This is the best Darjeeling I've had in years! The muscatel notes are so clear and bright.", status: "Approved" },
    { productId: products[2].id, name: "Ravi M.", initials: "RM", rating: 4, date: "May 2026", comment: "Perfect evening tea. Very calming after a long day at work.", status: "Approved" }
  ]

  for (const review of reviews) {
    await prisma.review.create({
      data: review
    })
  }

  // Create FAQs
  const faqs = [
    { question: "How long does domestic shipping take in Nepal?", answer: "Orders within Nepal are delivered in 3–5 business days. We ship from Kathmandu and cover all major cities and towns. Remote areas may take an additional 1–2 days.", category: "Orders & Shipping", order: 1, isActive: true },
    { question: "Do you ship internationally?", answer: "Yes! We ship worldwide. International delivery typically takes 10–14 business days depending on your location and local customs processing. You will receive a tracking number once your order is dispatched.", category: "Orders & Shipping", order: 2, isActive: true },
    { question: "Is there a free shipping threshold?", answer: "Domestic orders over Rs. 3,000 qualify for free standard shipping within Nepal. International orders do not currently qualify for free shipping, but we offer competitive flat rates by region.", category: "Orders & Shipping", order: 3, isActive: true },
    { question: "What is the shelf life of your teas?", answer: "All our teas have a shelf life of 2 years when stored sealed and away from direct sunlight, heat, and moisture. Once opened, we recommend consuming within 6 months for the best flavour and aroma.", category: "Products & Brewing", order: 1, isActive: true },
    { question: "Are your teas organically certified?", answer: "Many of our single-origin teas are sourced from certified organic estates in the Ilam and Kanchanjangha regions of Nepal. Products with organic certification are clearly labelled on their product pages.", category: "Products & Brewing", order: 2, isActive: true },
    { question: "What is the correct brewing temperature for different teas?", answer: "Temperature varies by tea type: Green tea brews best at 70–80°C, White tea at 75–85°C, Oolong at 85–95°C, Black tea at 95–100°C, and Herbal tisanes at 100°C.", category: "Products & Brewing", order: 3, isActive: true }
  ]

  for (const faq of faqs) {
    await prisma.fAQ.create({
      data: faq
    })
  }

  // Create brewing guides
  const brewingGuides = [
    { title: "Green Tea Brewing Guide", slug: "green", teaType: "green", description: "Perfect for delicate green teas like Dragon Well Longjing", waterTemp: "70-80°C", steepingTime: "2-3 minutes", leafQuantity: "1 tsp per 150ml", image: "https://images.unsplash.com/photo-1514733670139-4d87a1941d55?w=800&h=800&fit=crop&q=80", isActive: true },
    { title: "Black Tea Brewing Guide", slug: "black", teaType: "black", description: "Ideal for bold black teas like Assam and Darjeeling", waterTemp: "95-100°C", steepingTime: "3-4 minutes", leafQuantity: "1 tsp per 150ml", image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=800&h=800&fit=crop&q=80", isActive: true }
  ]

  for (const guide of brewingGuides) {
    await prisma.brewingGuide.create({
      data: guide
    })
  }

  // Create settings
  await prisma.settings.create({
    data: {
      taxRate: 13,
      currency: "Rs.",
      storeName: "Himmat Tea",
      storeEmail: "support@himmattea.com",
      storePhone: "+977 9876543210",
      notificationsEnabled: true,
      lowStockThreshold: 20
    }
  })

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
