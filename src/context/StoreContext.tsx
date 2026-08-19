"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

export interface Variant {
  id: number;
  name: string;
  value: string;
  priceModifier: number;
}

export interface ProductVariant {
  id: number;
  sku: string;
  variants: Variant[];
  price: number;
  stock: number;
  imageUrl?: string;
}

export interface Batch {
  id: number;
  batchNumber: string;
  quantity: number;
  receivedDate: string;
  expiryDate?: string;
  supplier?: string;
  costPrice: number;
}

export interface ProductLine {
  id: number | string;
  slug: string;
  name: string;
  description: string;
  heroHeadline?: string;
  heroImage?: string;
  color: string;
  categories?: Array<{
    id: string;
    name: string;
    description: string;
    image: string;
  }> | any;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaLinkText?: string;
  ctaLink?: string;
  isActive: boolean;
  sortOrder: number;
  products?: Product[];
  createdAt?: string;
  updatedAt?: string;
}

export interface HeroVisual {
  id: string;
  imageUrl: string;
  title?: string;
  subtitle?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: number;
  productId: number;
  name: string;
  initials: string;
  rating: number;
  date: string;
  comment: string;
  status: "Approved" | "Pending" | "Rejected";
}

export interface Product {
  id: number;
  productLineId?: number | string | null;
  productLine?: ProductLine;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: "In Stock" | "Low Stock" | "Out of Stock";
  description: string;
  imageUrl: string;
  reviewsEnabled: boolean;
  batches: Batch[];
  sku?: string;
  reorderPoint?: number;
  hasVariants: boolean;
  productVariants: ProductVariant[];
  variantOptions: string[];
  isBestseller: boolean;
  isActive?: boolean;
  reviews: Review[];
  createdAt?: string;
  updatedAt?: string;
  sortOrder?: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  ordersCount: number;
  totalSpent: number;
  loyaltyPoints: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  createdAt: string;
}

interface LoyaltyProgram {
  pointsPerRupee: number;
  tiers: {
    name: string;
    minPoints: number;
    discountPercentage: number;
  }[];
}

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  date: string;
  category: string;
  excerpt: string;
  image: string;
  readTime: string;
  body: {
    type: "p" | "h2";
    text: string;
  }[];
}

interface Coupon {
  id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  validFrom: string;
  validTo: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

interface Collection {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  productIds: number[];
  isActive: boolean;
}

interface BrewingGuide {
  id: string;
  title: string;
  slug: string;
  teaType: string;
  description: string;
  waterTemp: string;
  steepingTime: string;
  leafQuantity: string;
  image: string;
  isActive: boolean;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  isActive: boolean;
  order: number;
}

interface AboutPage {
  heroTitle: string;
  heroSubtitle: string;
  missionTitle: string;
  missionText: string;
  storyTitle: string;
  storyText: string;
  values: {
    title: string;
    description: string;
    icon: string;
  }[];
}

interface OrderItem {
  id: number;
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

interface InternalNote {
  id: string;
  text: string;
  adminId: string;
  adminName: string;
  timestamp: string;
}

interface Order {
  id: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: OrderItem[];
  total: number;
  tax: number;
  grandTotal: number;
  status: "Pending" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded";
  paymentStatus: "Paid" | "Unpaid" | "Refunded";
  orderDate: string;
  shippingAddress: string;
  trackingNumber?: string;
  courierPartner?: string;
  internalNotes: InternalNote[];
  refundReason?: string;
  refundAmount?: number;
}

interface InventoryTransaction {
  id: number;
  productId: number;
  productName: string;
  type: "in" | "out" | "adjustment";
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId?: string;
  timestamp: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  orderId: string;
  timestamp: string;
  read: boolean;
}

interface PurchaseOrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplier: string;
  items: PurchaseOrderItem[];
  total: number;
  status: "Draft" | "Sent" | "Received" | "Cancelled";
  orderDate: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: "admin" | "superadmin";
  isActive: boolean;
  createdAt: string;
  passwordHash: string;
}

interface StoreContextType {
  adminUsers: AdminUser[];
  addAdminUser: (user: Omit<AdminUser, "id" | "createdAt" | "passwordHash"> & { password: string }) => void;
  updateAdminUser: (id: number, user: Partial<AdminUser> & { password?: string }) => void;
  deleteAdminUser: (id: number) => void;
  verifyAdminCredentials: (username: string, password: string) => Promise<AdminUser | null>;
  productLines: ProductLine[];
  isCatalogLoading: boolean;
  addProductLine: (productLine: Omit<ProductLine, "id" | "createdAt" | "updatedAt">) => void;
  updateProductLine: (id: number | string, productLine: Partial<ProductLine>) => void;
  deleteProductLine: (id: number | string) => void;
  heroVisuals: HeroVisual[];
  addHeroVisual: (heroVisual: Omit<HeroVisual, "id" | "createdAt" | "updatedAt">) => void;
  updateHeroVisual: (id: string, heroVisual: Partial<HeroVisual>) => void;
  deleteHeroVisual: (id: string) => void;
  products: Product[];
  orders: Order[];
  customers: Customer[];
  notifications: Notification[];
  blogPosts: BlogPost[];
  reviews: Review[];
  coupons: Coupon[];
  collections: Collection[];
  brewingGuides: BrewingGuide[];
  faqs: FAQ[];
  aboutPage: AboutPage;
  inventoryTransactions: InventoryTransaction[];
  purchaseOrders: PurchaseOrder[];
  addProduct: (product: Omit<Product, "id">) => void;
  updateProduct: (id: number, product: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  addBatch: (productId: number, batch: Omit<Batch, "id">) => void;
  updateBatch: (productId: number, batchId: number, batch: Partial<Batch>) => void;
  deleteBatch: (productId: number, batchId: number) => void;
  addProductVariant: (productId: number, variant: Omit<ProductVariant, "id">) => void;
  updateProductVariant: (productId: number, variantId: number, variant: Partial<ProductVariant>) => void;
  deleteProductVariant: (productId: number, variantId: number) => void;
  addOrder: (order: Omit<Order, "id" | "orderDate" | "internalNotes">) => void;
  updateOrder: (id: string, order: Partial<Order>) => void;
  deleteOrder: (id: string) => void;
  refundOrder: (id: string, reason: string, amount?: number) => void;
  addInternalNote: (orderId: string, text: string, adminId: string, adminName: string) => void;
  updateTrackingInfo: (orderId: string, trackingNumber?: string, courierPartner?: string) => void;
  bulkUpdateOrderStatus: (orderIds: string[], status: Order["status"]) => void;
  addCustomer: (customer: Omit<Customer, "id" | "ordersCount" | "totalSpent" | "loyaltyPoints" | "tier" | "createdAt">) => void;
  updateCustomer: (id: number, customer: Partial<Customer>) => void;
  deleteCustomer: (id: number) => void;
  getCustomerOrders: (customerId: number) => Order[];
  addLoyaltyPoints: (customerId: number, points: number, reason: string) => void;
  redeemLoyaltyPoints: (customerId: number, points: number) => void;
  addPurchaseOrder: (po: Omit<PurchaseOrder, "id">) => void;
  updatePurchaseOrder: (id: number, po: Partial<PurchaseOrder>) => void;
  receivePurchaseOrder: (id: number) => void;
  deletePurchaseOrder: (id: number) => void;
  addBlogPost: (post: Omit<BlogPost, "id">) => void;
  updateBlogPost: (id: string, post: Partial<BlogPost>) => void;
  deleteBlogPost: (id: string) => void;
  addReview: (review: Omit<Review, "id">) => void;
  updateReview: (id: number, review: Partial<Review>) => void;
  deleteReview: (id: number) => void;
  getProductReviews: (productId: number) => Review[];
  addCoupon: (coupon: Omit<Coupon, "id" | "usedCount">) => void;
  updateCoupon: (id: string, coupon: Partial<Coupon>) => void;
  deleteCoupon: (id: string) => void;
  addCollection: (collection: Omit<Collection, "id">) => void;
  updateCollection: (id: string, collection: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;
  addBrewingGuide: (guide: Omit<BrewingGuide, "id">) => void;
  updateBrewingGuide: (id: string, guide: Partial<BrewingGuide>) => void;
  deleteBrewingGuide: (id: string) => void;
  addFAQ: (faq: Omit<FAQ, "id">) => void;
  updateFAQ: (id: string, faq: Partial<FAQ>) => void;
  deleteFAQ: (id: string) => void;
  updateAboutPage: (about: Partial<AboutPage>) => void;
  markNotificationRead: (id: number) => void;
  clearNotifications: () => void;
  adjustStock: (productId: number, quantity: number, reason: string, referenceId?: string) => void;
  getProductInventoryTransactions: (productId: number) => InventoryTransaction[];
  getInventoryValue: () => number;
  getLowStockProducts: () => Product[];
  getExpiringBatches: (days?: number) => { product: Product; batch: Batch }[];
  loyaltyProgram: LoyaltyProgram;
  settings: {
    taxRate: number;
    shippingFlatRate: number;
    currency: string;
    storeName: string;
    storeEmail: string;
    storePhone: string;
    notificationsEnabled: boolean;
    lowStockThreshold: number;
    gstNumber?: string;
    qrImageUrl?: string | null;
  };
  updateSettings: (settings: Partial<StoreContextType["settings"]>) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const sampleHeroVisuals: HeroVisual[] = [
    {
      id: "hv-1",
      imageUrl: "/Hero%20section.png",
      title: "Premium Tea Collection",
      subtitle: "Hand-picked, slow-dried, small-batch blends",
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

const sampleProductLines: ProductLine[] = [
  {
    id: "pl-1",
    slug: "himmat-tea",
    name: "Himmat Tea",
    description: "From the misty hills of Ilam to Darjeeling, discover teas that tell a story of soil, altitude, and generations of craftsmanship.",
    heroHeadline: "Hand-sourced tea from the Himalayan foothills",
    heroImage: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&h=600&fit=crop",
    color: "#2d5a3d",
    categories: [
      { id: "green", name: "Green Tea", description: "Fresh & delicate", image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop" },
      { id: "black", name: "Black Tea", description: "Bold & robust", image: "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=400&h=300&fit=crop" },
      { id: "oolong", name: "Oolong Tea", description: "Complex & fragrant", image: "https://images.unsplash.com/photo-1563822249548-9a72b6353cd1?w=400&h=300&fit=crop" },
      { id: "white", name: "White Tea", description: "Subtle & elegant", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop" },
      { id: "herbal", name: "Herbal Infusions", description: "Caffeine-free & soothing", image: "https://images.unsplash.com/photo-1596344084757-b83f2081da8b?w=400&h=300&fit=crop" },
      { id: "tea-sets", name: "Tea Sets", description: "The perfect gift", image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop" },
    ],
    ctaTitle: "New to tea?",
    ctaDescription: "Learn how to brew the perfect cup with our detailed brewing guides.",
    ctaLinkText: "View brewing guides",
    ctaLink: "/brewing-guides",
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "pl-2",
    slug: "godgifted-dal",
    name: "Godgifted Dal",
    description: "Unpolished, nutrient-rich dals that bring authentic flavours to your table.",
    heroHeadline: "Stone-ground pulses from the Terai plains",
    heroImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
    color: "#b8862f",
    categories: [
      { id: "toor", name: "Toor Dal", description: "Protein-rich & versatile", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop" },
      { id: "moong", name: "Moong Dal", description: "Light & easy to digest", image: "https://images.unsplash.com/photo-1598344084757-b83f2081da8b?w=400&h=300&fit=crop" },
      { id: "chana", name: "Chana Dal", description: "Nutty & wholesome", image: "https://images.unsplash.com/photo-1598387993441-a360f544a835?w=400&h=300&fit=crop" },
      { id: "masoor", name: "Masoor Dal", description: "Quick-cooking & vibrant", image: "https://images.unsplash.com/photo-1598344084757-b83f2081da8b?w=400&h=300&fit=crop" },
      { id: "urad", name: "Urad Dal", description: "Creamy & comforting", image: "https://images.unsplash.com/photo-1598344084757-b83f2081da8b?w=400&h=300&fit=crop" },
      { id: "gift-hampers", name: "Gift Hampers", description: "Perfect for gifting", image: "https://images.unsplash.com/photo-1598344084757-b83f2081da8b?w=400&h=300&fit=crop" },
    ],
    ctaTitle: "Our sourcing story",
    ctaDescription: "We partner directly with farmers in the Terai region to bring you unpolished, stone-ground dals that retain all their natural nutrition and flavour.",
    ctaLinkText: "Learn more",
    ctaLink: "/about/sourcing",
    isActive: true,
    sortOrder: 1,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const sampleReviews: Review[] = [
  { id: 1, productId: 1, name: "Priya S.", initials: "PS", rating: 5, date: "June 2026", comment: "Absolutely exquisite. The aroma is unlike anything I've tasted before. Worth every rupee.", status: "Approved" },
  { id: 2, productId: 1, name: "David K.", initials: "DK", rating: 5, date: "May 2026", comment: "I order this every month. My morning ritual is incomplete without it. Top quality packaging too.", status: "Approved" },
  { id: 3, productId: 1, name: "Meera R.", initials: "MR", rating: 4, date: "April 2026", comment: "Lovely tea, smooth and fragrant. Delivery was fast. Will definitely order again!", status: "Pending" },
];

const sampleProducts: Product[] = [
  { id: 1, productLineId: "pl-1", name: "Premium Green Tea", category: "Green Tea", price: 249, stock: 145, status: "In Stock", description: "Fresh organic green tea from Assam", imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=300&fit=crop", reviewsEnabled: true, sku: "HMT-GRN-001", reorderPoint: 50, hasVariants: true, variantOptions: ["Size", "Packaging"], productVariants: [
    { id: 101, sku: "HMT-GRN-001-100G", variants: [{ id: 1001, name: "Size", value: "100g", priceModifier: 0 }, { id: 1002, name: "Packaging", value: "Standard", priceModifier: 0 }], price: 249, stock: 50 },
    { id: 102, sku: "HMT-GRN-001-250G", variants: [{ id: 1003, name: "Size", value: "250g", priceModifier: 150 }, { id: 1004, name: "Packaging", value: "Premium", priceModifier: 50 }], price: 449, stock: 75 },
    { id: 103, sku: "HMT-GRN-001-500G", variants: [{ id: 1005, name: "Size", value: "500g", priceModifier: 350 }, { id: 1006, name: "Packaging", value: "Premium", priceModifier: 50 }], price: 649, stock: 20 },
  ], batches: [
    { id: 1, batchNumber: "BATCH-2024-001", quantity: 100, receivedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Assam Tea Estates", costPrice: 120 },
    { id: 2, batchNumber: "BATCH-2024-002", quantity: 45, receivedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Darjeeling Farms", costPrice: 115 },
  ], reviews: sampleReviews.filter(r => r.productId === 1), isBestseller: true },
  { id: 2, productLineId: "pl-1", name: "Classic Black Tea", category: "Black Tea", price: 229, stock: 234, status: "In Stock", description: "Traditional black tea blend", imageUrl: "https://images.unsplash.com/photo-1564890369478-c6b8b91994ed?w=400&h=300&fit=crop", reviewsEnabled: true, sku: "HMT-BLK-001", reorderPoint: 60, hasVariants: false, productVariants: [], variantOptions: [], batches: [
    { id: 3, batchNumber: "BATCH-2024-003", quantity: 150, receivedDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Nilgiri Plantations", costPrice: 100 },
    { id: 4, batchNumber: "BATCH-2024-004", quantity: 84, receivedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Nilgiri Plantations", costPrice: 100 },
  ], reviews: [], isBestseller: false },
  { id: 3, productLineId: "pl-1", name: "Herbal Collection", category: "Herbal", price: 199, stock: 25, status: "Low Stock", description: "Natural herbal tea mix", imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=300&fit=crop", reviewsEnabled: true, sku: "HMT-HRB-001", reorderPoint: 40, hasVariants: false, productVariants: [], variantOptions: [], batches: [
    { id: 5, batchNumber: "BATCH-2024-005", quantity: 25, receivedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Ayurveda Farms", costPrice: 85 },
  ], reviews: [], isBestseller: false },
  { id: 4, productLineId: "pl-1", name: "Tea Ceremony Set", category: "Accessories", price: 899, stock: 12, status: "In Stock", description: "Complete tea ceremony kit", imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop", reviewsEnabled: false, sku: "HMT-ACC-001", reorderPoint: 10, hasVariants: false, productVariants: [], variantOptions: [], batches: [
    { id: 6, batchNumber: "BATCH-2024-006", quantity: 12, receivedDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Ceramic Crafts", costPrice: 450 },
  ], reviews: [], isBestseller: false },
  { id: 5, productLineId: "pl-1", name: "Masala Chai Mix", category: "Spiced", price: 299, stock: 56, status: "In Stock", description: "Authentic masala chai spice blend", imageUrl: "https://images.unsplash.com/photo-1586374820345-f6339ae67f71?w=400&h=300&fit=crop", reviewsEnabled: true, sku: "HMT-MSL-001", reorderPoint: 35, hasVariants: false, productVariants: [], variantOptions: [], batches: [
    { id: 7, batchNumber: "BATCH-2024-007", quantity: 56, receivedDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Spice Traders Co", costPrice: 140 },
  ], reviews: [], isBestseller: true },
  { id: 6, productLineId: "pl-2", name: "Premium Toor Dal", category: "Toor", price: 189, stock: 200, status: "In Stock", description: "Unpolished, stone-ground toor dal from Terai plains", imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop", reviewsEnabled: true, sku: "GG-DAL-001", reorderPoint: 40, hasVariants: false, productVariants: [], variantOptions: [], batches: [
    { id: 8, batchNumber: "BATCH-2024-008", quantity: 200, receivedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Terai Farmer Coop", costPrice: 90 },
  ], reviews: [], isBestseller: true },
  { id: 7, productLineId: "pl-2", name: "Organic Moong Dal", category: "Moong", price: 219, stock: 150, status: "In Stock", description: "Green moong dal, hand-sorted and unpolished", imageUrl: "https://images.unsplash.com/photo-1598387993441-a360f544a835?w=400&h=300&fit=crop", reviewsEnabled: true, sku: "GG-DAL-002", reorderPoint: 35, hasVariants: false, productVariants: [], variantOptions: [], batches: [
    { id: 9, batchNumber: "BATCH-2024-009", quantity: 150, receivedDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(), expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(), supplier: "Organic Pulse Farms", costPrice: 105 },
  ], reviews: [], isBestseller: false },
];

const sampleCustomers: Customer[] = [
  { id: 1, name: "Sarah Johnson", email: "sarah@example.com", phone: "+91 9876543210", address: "123 Tea Street, Mumbai", ordersCount: 14, totalSpent: 5231, loyaltyPoints: 523, tier: "Silver", createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 2, name: "Michael Chen", email: "michael@example.com", phone: "+91 9876543211", address: "456 Herbal Lane, Delhi", ordersCount: 9, totalSpent: 3499, loyaltyPoints: 350, tier: "Bronze", createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 3, name: "Emma Williams", email: "emma@example.com", phone: "+91 9876543212", address: "789 Green Tea Road, Bangalore", ordersCount: 23, totalSpent: 8921, loyaltyPoints: 892, tier: "Gold", createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
];

const sampleBlogPosts: BlogPost[] = [
  {
    id: "1",
    slug: "1",
    title: "How to Brew the Perfect Cup",
    date: "June 15, 2026",
    category: "Brewing",
    excerpt: "Master water temperature, steeping time, and leaf ratio to unlock every tea's full potential.",
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop",
    readTime: "5 min read",
    body: [
      { type: "p", text: "Brewing tea is deceptively simple — hot water, dry leaves, a moment of patience. But mastering the craft opens a world of nuance that can elevate an ordinary cup into something transcendent." },
      { type: "h2", text: "Step 1: Start With Good Water" },
      { type: "p", text: "Tea is over 99% water. Filtered water at a neutral pH (around 7) brings out the cleanest, brightest flavours. Avoid distilled water, which tastes flat, and heavily chlorinated tap water, which can mask delicate aromas." },
      { type: "h2", text: "Step 2: Heat to the Right Temperature" },
      { type: "p", text: "Different teas need different temperatures. Green teas and white teas flourish between 70–80°C — boiling water will scorch the leaves and produce bitterness. Black teas and pu-erh welcome a full 95–100°C. Oolongs sit in between at 85–90°C." },
    ],
  },
  {
    id: "2",
    slug: "2",
    title: "Nepal's Tea Regions: Ilam vs Dhankuta",
    date: "June 8, 2026",
    category: "Origins",
    excerpt: "Explore the distinct terroir of Nepal's two premier tea-growing districts.",
    image: "https://images.unsplash.com/photo-1464890369478-c6b8b91994ed?w=600&h=400&fit=crop",
    readTime: "7 min read",
    body: [
      { type: "p", text: "Nepal has been growing tea for over 150 years, yet it remains one of the world's best-kept secrets. Two districts dominate production: Ilam in the east, and Dhankuta to the north." },
      { type: "h2", text: "Ilam: Nepal's First Tea Country" },
      { type: "p", text: "Tea cultivation in Nepal began in Ilam in the 1860s, introduced by the Rana rulers returning from Darjeeling. The climate here is temperate and humid, producing teas with floral character and a gentle body." },
    ],
  },
];

const sampleCoupons: Coupon[] = [
  {
    id: "1",
    code: "WELCOME10",
    discountType: "percentage",
    discountValue: 10,
    minOrderAmount: 500,
    maxDiscount: 200,
    validFrom: "2026-06-01",
    validTo: "2026-12-31",
    usageLimit: 100,
    usedCount: 45,
    isActive: true,
  },
  {
    id: "2",
    code: "FLAT50",
    discountType: "fixed",
    discountValue: 50,
    minOrderAmount: 300,
    maxDiscount: 50,
    validFrom: "2026-06-15",
    validTo: "2026-07-15",
    usageLimit: 50,
    usedCount: 22,
    isActive: true,
  },
];

const sampleCollections: Collection[] = [
  {
    id: "1",
    title: "Best Sellers",
    slug: "best-sellers",
    description: "Our most-loved teas, handpicked by customers",
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop",
    productIds: [1, 2, 5],
    isActive: true,
  },
  {
    id: "2",
    title: "Wellness Blends",
    slug: "wellness-blends",
    description: "Natural teas for a healthier you",
    image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&h=400&fit=crop",
    productIds: [3],
    isActive: true,
  },
];

const sampleBrewingGuides: BrewingGuide[] = [
  {
    id: "1",
    title: "Perfect Green Tea",
    slug: "perfect-green-tea",
    teaType: "Green Tea",
    description: "Brew delicate green tea without bitterness",
    waterTemp: "75-80°C",
    steepingTime: "2-3 minutes",
    leafQuantity: "1 tsp per cup",
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&h=400&fit=crop",
    isActive: true,
  },
];

const sampleFAQs: FAQ[] = [
  {
    id: "1",
    question: "How long does shipping take?",
    answer: "We offer free shipping on orders over ₹500. For orders below ₹500, shipping charges are ₹50. Delivery takes 3-5 business days across India.",
    category: "Shipping",
    isActive: true,
    order: 1,
  },
  {
    id: "2",
    question: "What is your return policy?",
    answer: "We accept returns within 7 days of delivery if the product is unused and in its original packaging. Please contact our support team to initiate a return.",
    category: "Returns",
    isActive: true,
    order: 2,
  },
];

const defaultAboutPage: AboutPage = {
  heroTitle: "Our Story",
  heroSubtitle: "Brewing traditions since 1985",
  missionTitle: "Our Mission",
  missionText: "To bring the finest quality teas from Nepal's best gardens to tea lovers everywhere, while supporting sustainable farming practices and fair trade.",
  storyTitle: "How It All Began",
  storyText: "Himmat Tea was founded in 1985 with a simple mission: to share the authentic taste of Nepalese tea with the world. Our journey started in the rolling hills of Ilam, where our founder, Mr. Raj Kumar Sharma, discovered the perfect terroir for growing exceptional tea. Today, we work directly with over 500 small-scale farmers across Nepal to bring you teas that are as ethical as they are delicious.",
  values: [
    { title: "Quality First", description: "We never compromise on quality. Every tea is carefully selected and tested to ensure it meets our high standards.", icon: "🍵" },
    { title: "Sustainable", description: "We support organic farming practices and fair trade, ensuring our farmers get the recognition they deserve.", icon: "🌱" },
    { title: "Community Focused", description: "We believe in giving back. A portion of every sale goes towards supporting education and healthcare in tea-growing communities.", icon: "❤️" },
  ],
};



const sampleOrders: Order[] = [
  { 
    id: "#1234", 
    customerId: 1, 
    customerName: "Sarah Johnson", 
    customerEmail: "sarah@example.com", 
    customerPhone: "+91 9876543210", 
    items: [{ id: 1, productId: 1, name: "Premium Green Tea", price: 249, quantity: 1 }],
    total: 249, 
    tax: 24.9, 
    grandTotal: 273.9, 
    status: "Delivered", 
    paymentStatus: "Paid", 
    orderDate: new Date(Date.now() - 86400000).toISOString(),
    shippingAddress: "123 Tea Street, Mumbai",
    trackingNumber: "DEL123456789IN",
    courierPartner: "Delhivery",
    internalNotes: []
  },
  { 
    id: "#1233", 
    customerId: 2, 
    customerName: "Michael Chen", 
    customerEmail: "michael@example.com", 
    customerPhone: "+91 9876543211", 
    items: [{ id: 2, productId: 3, name: "Herbal Collection", price: 199, quantity: 1 }],
    total: 199, 
    tax: 19.9, 
    grandTotal: 218.9, 
    status: "Processing", 
    paymentStatus: "Paid", 
    orderDate: new Date(Date.now() - 172800000).toISOString(),
    shippingAddress: "456 Herbal Lane, Delhi",
    internalNotes: [
      {
        id: "note-1",
        text: "Customer called, requested to leave package at front desk",
        adminId: "1",
        adminName: "Admin",
        timestamp: new Date(Date.now() - 3600000).toISOString()
      }
    ]
  },
];

const defaultSettings = {
  taxRate: 18,
  shippingFlatRate: 0,
  currency: "₹",
  storeName: "Godgifted",
  storeEmail: "support@godgifted.com",
  storePhone: "+91 9876543210",
  notificationsEnabled: true,
  lowStockThreshold: 30,
  gstNumber: "27AABCU9603R1ZX",
  qrImageUrl: null,
};

const loyaltyProgramConfig: LoyaltyProgram = {
  pointsPerRupee: 1,
  tiers: [
    { name: "Bronze", minPoints: 0, discountPercentage: 2 },
    { name: "Silver", minPoints: 500, discountPercentage: 5 },
    { name: "Gold", minPoints: 1000, discountPercentage: 8 },
    { name: "Platinum", minPoints: 2000, discountPercentage: 12 },
  ],
};

const samplePurchaseOrders: PurchaseOrder[] = [
  {
    id: 1,
    poNumber: "PO-2024-001",
    supplier: "Assam Tea Estates",
    orderDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Sent",
    items: [
      { id: 1001, productId: 1, productName: "Premium Green Tea", quantity: 100, unitPrice: 120, total: 12000 },
    ],
    total: 12000,
  },
  {
    id: 2,
    poNumber: "PO-2024-002",
    supplier: "Nilgiri Plantations",
    orderDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    receivedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    status: "Received",
    items: [
      { id: 1002, productId: 2, productName: "Classic Black Tea", quantity: 150, unitPrice: 100, total: 15000 },
    ],
    total: 15000,
  },
];

// Password hash for "admin123" using SHA-256 via crypto.subtle
// Note: This is a simplified approach for client-side storage
// Actual hash computed as:
// Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("admin123"))))
//   .map(b => b.toString(16).padStart(2, "0")).join("")
const ADMIN_PASSWORD_HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";

const sampleAdminUsers: AdminUser[] = [
  {
    id: 1,
    username: "admin",
    email: "admin@godgifted.com",
    role: "superadmin",
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    passwordHash: ADMIN_PASSWORD_HASH,
  },
];

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [heroVisuals, setHeroVisuals] = useState<HeroVisual[]>(sampleHeroVisuals);
  const [products, setProducts] = useState<Product[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(true);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [orders, setOrders] = useState<Order[]>(sampleOrders);
  const [customers, setCustomers] = useState<Customer[]>(sampleCustomers);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(sampleBlogPosts);
  const [reviews, setReviews] = useState<Review[]>(sampleReviews);
  const [coupons, setCoupons] = useState<Coupon[]>(sampleCoupons);
  const [collections, setCollections] = useState<Collection[]>(sampleCollections);
  const [brewingGuides, setBrewingGuides] = useState<BrewingGuide[]>(sampleBrewingGuides);
  const [faqs, setFaqs] = useState<FAQ[]>(sampleFAQs);
  const [aboutPage, setAboutPage] = useState<AboutPage>(defaultAboutPage);
  const [settings, setSettings] = useState<StoreContextType["settings"]>(defaultSettings);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(samplePurchaseOrders);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(sampleAdminUsers);

  // Purge any stale StoreContext content that older versions of the app may have
  // left in localStorage. PII keys (orders, customers, admin_users, notifications,
  // settings, purchase_orders, inventory_transactions) were never persisted by
  // the current StoreContext, but we wipe them too for belt-and-suspenders safety.
  useEffect(() => {
    if (typeof window === "undefined") return;
    queueMicrotask(() => {
      const keysToRemove = [
        "godgifted_product_lines",
        "godgifted_hero_visuals",
        "godgifted_products",
        "godgifted_blog_posts",
        "godgifted_reviews",
        "godgifted_coupons",
        "godgifted_collections",
        "godgifted_brewing_guides",
        "godgifted_faqs",
        "godgifted_about_page",
        "godgifted_orders",
        "godgifted_customers",
        "godgifted_admin_users",
        "godgifted_settings",
        "godgifted_notifications",
        "godgifted_purchase_orders",
        "godgifted_inventory_transactions",
      ];
      for (const k of keysToRemove) {
        try {
          localStorage.removeItem(k);
        } catch { /* noop — private mode etc. */ }
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [linesRes, productsRes] = await Promise.all([
          fetch('/api/product-lines').then(r => r.json()).catch(() => []),
          fetch('/api/products').then(r => r.json()).catch(() => []),
        ]);
        if (!cancelled) {
          const rawLines = Array.isArray(linesRes) ? linesRes : Array.isArray((linesRes as any)?.data) ? (linesRes as any).data : [];
          const rawProducts = Array.isArray(productsRes) ? productsRes : Array.isArray((productsRes as any)?.data) ? (productsRes as any).data : [];
          setProductLines(rawLines.map((pl: any) => {
            let cats: any = pl.categories;
            if (typeof cats === 'string') {
              try { cats = JSON.parse(cats); } catch { cats = []; }
            }
            if (!Array.isArray(cats)) cats = [];
            const nestedProducts: Product[] = Array.isArray(pl.products) ? pl.products : [];
            return {
              ...pl,
              color: pl.color || '#2d5a3d',
              categories: cats,
              products: nestedProducts,
            };
          }));
          setProducts(rawProducts.map((p: any) => ({
            reviewsEnabled: (p as Partial<Product>).reviewsEnabled !== false,
            batches: p.batches || [],
            productVariants: p.productVariants || [],
            variantOptions: Array.isArray(p.variantOptions) ? p.variantOptions : (p.variantOptions ? p.variantOptions.split(',').filter(Boolean) : []),
            reviews: p.reviews || [],
            isActive: p.isActive !== false,
            ...p,
          })));
        }
      } catch (e) {
        console.error('Failed to load storefront catalog', e);
      } finally {
        if (!cancelled) setIsCatalogLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const loyaltyProgram = loyaltyProgramConfig;

  // Helper function to hash passwords (simple SHA-256 for demo)
  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Calculate customer tier based on loyalty points
  const calculateCustomerTier = (points: number): "Bronze" | "Silver" | "Gold" | "Platinum" => {
    const tierNames: readonly ("Bronze" | "Silver" | "Gold" | "Platinum")[] = ["Bronze", "Silver", "Gold", "Platinum"];
    for (let i = loyaltyProgram.tiers.length - 1; i >= 0; i--) {
      if (points >= loyaltyProgram.tiers[i].minPoints) {
        const name = loyaltyProgram.tiers[i].name;
        if (tierNames.includes(name as (typeof tierNames)[number])) {
          return name as (typeof tierNames)[number];
        }
      }
    }
    return "Bronze";
  };

  // Product variant functions
  const addProductVariant = (productId: number, variant: Omit<ProductVariant, "id">) => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          productVariants: [...product.productVariants, { ...variant, id: Date.now() }],
        };
      }
      return product;
    }));
    toast.success("Product variant added!");
  };

  const updateProductVariant = (productId: number, variantId: number, variant: Partial<ProductVariant>) => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          productVariants: product.productVariants.map(v =>
            v.id === variantId ? { ...v, ...variant } : v
          ),
        };
      }
      return product;
    }));
    toast.success("Product variant updated!");
  };

  const deleteProductVariant = (productId: number, variantId: number) => {
    setProducts(prev => prev.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          productVariants: product.productVariants.filter(v => v.id !== variantId),
        };
      }
      return product;
    }));
    toast.success("Product variant deleted!");
  };

  // Loyalty program functions
  const addLoyaltyPoints = (customerId: number, points: number, reason: string) => {
    setCustomers(prev => prev.map(customer => {
      if (customer.id === customerId) {
        const newPoints = customer.loyaltyPoints + points;
        return {
          ...customer,
          loyaltyPoints: newPoints,
          tier: calculateCustomerTier(newPoints),
        };
      }
      return customer;
    }));
    toast.success(`${points} loyalty points added!`);
  };

  const redeemLoyaltyPoints = (customerId: number, points: number) => {
    setCustomers(prev => prev.map(customer => {
      if (customer.id === customerId) {
        const newPoints = customer.loyaltyPoints - points;
        return {
          ...customer,
          loyaltyPoints: newPoints,
          tier: calculateCustomerTier(newPoints),
        };
      }
      return customer;
    }));
    toast.success(`${points} loyalty points redeemed!`);
  };

  // Purchase order functions
  const addPurchaseOrder = (po: Omit<PurchaseOrder, "id">) => {
    const newPO: PurchaseOrder = {
      ...po,
      id: Date.now(),
    };
    setPurchaseOrders(prev => [...prev, newPO]);
    toast.success("Purchase order created!");
  };

  const updatePurchaseOrder = (id: number, po: Partial<PurchaseOrder>) => {
    setPurchaseOrders(prev => prev.map(order =>
      order.id === id ? { ...order, ...po } : order
    ));
    toast.success("Purchase order updated!");
  };

  const receivePurchaseOrder = (id: number) => {
    const po = purchaseOrders.find(order => order.id === id);
    if (!po) return;

    // Update stock for each item
    po.items.forEach(item => {
      adjustStock(item.productId, item.quantity, "Received from PO " + po.poNumber);
    });

    // Update PO status
    setPurchaseOrders(prev => prev.map(order =>
      order.id === id ? { ...order, status: "Received", receivedDate: new Date().toISOString() } : order
    ));

    toast.success("Purchase order received!");
  };

  const deletePurchaseOrder = (id: number) => {
    setPurchaseOrders(prev => prev.filter(order => order.id !== id));
    toast.error("Purchase order deleted!");
  };

  // Admin user functions
  const addAdminUser = async (user: Omit<AdminUser, "id" | "createdAt" | "passwordHash"> & { password: string }) => {
    const passwordHash = await hashPassword(user.password);
    const newUser: AdminUser = {
      id: Date.now(),
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: new Date().toISOString(),
      passwordHash,
    };
    setAdminUsers(prev => [...prev, newUser]);
    toast.success("Admin user added successfully!");
  };

  const updateAdminUser = async (id: number, updates: Partial<AdminUser> & { password?: string }) => {
    const { password, ...rest } = updates;
    let finalUpdates: Partial<AdminUser> = { ...rest };
    if (password) {
      const passwordHash = await hashPassword(password);
      finalUpdates = { ...rest, passwordHash };
    }
    setAdminUsers(prev => prev.map(user => {
      if (user.id === id) {
        return { ...user, ...finalUpdates };
      }
      return user;
    }));
    toast.success("Admin user updated!");
  };

  const deleteAdminUser = (id: number) => {
    // Don't allow deleting the last superadmin
    const userToDelete = adminUsers.find(u => u.id === id);
    if (userToDelete?.role === "superadmin") {
      const superadminCount = adminUsers.filter(u => u.role === "superadmin").length;
      if (superadminCount <= 1) {
        toast.error("Cannot delete the last superadmin!");
        return;
      }
    }
    setAdminUsers(prev => prev.filter(user => user.id !== id));
    toast.error("Admin user deleted!");
  };

  const verifyAdminCredentials = async (username: string, password: string): Promise<AdminUser | null> => {
    const user = adminUsers.find(u => u.username === username && u.isActive);
    if (!user) return null;

    const passwordHash = await hashPassword(password);
    if (passwordHash === user.passwordHash) {
      return user;
    }
    return null;
  };

  const addProduct = (product: Omit<Product, "id">) => {
    const foundProductLine = productLines.find(pl => pl.id === product.productLineId);
    const newProduct: Product = {
      ...product,
      id: Date.now(),
      productLine: product.productLine || foundProductLine,
      hasVariants: product.hasVariants || false,
      productVariants: product.productVariants || [],
      variantOptions: product.variantOptions || [],
      batches: product.batches || [],
      reviews: product.reviews || [],
      reviewsEnabled: (product as Partial<Product>).reviewsEnabled !== false,
      isBestseller: (product as Partial<Product>).isBestseller || false,
      isActive: (product as Partial<Product>).isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProducts((prev) => [...prev, newProduct]);
    toast.success("Product added successfully!");
  };

  const updateProduct = (id: number, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((product) => {
        if (product.id === id) {
          const newProductLineId = updates.productLineId ?? product.productLineId;
          const foundProductLine = productLines.find(pl => pl.id === newProductLineId);
          return { 
            ...product, 
            ...updates, 
            updatedAt: new Date().toISOString(),
            productLine: updates.productLine || product.productLine || foundProductLine
          };
        }
        return product;
      })
    );
    toast.success("Product updated!");
  };

  const deleteProduct = (id: number) => {
    setProducts((prev) => prev.filter((product) => product.id !== id));
    toast.error("Product deleted!");
  };

  const addBatch = (productId: number, batch: Omit<Batch, "id">) => {
    setProducts((prev) => prev.map(product => {
      if (product.id === productId) {
        const newBatch: Batch = {
          ...batch,
          id: Date.now(),
        };
        const newStock = product.stock + batch.quantity;
        return {
          ...product,
          batches: [...product.batches, newBatch],
          stock: newStock,
          status: newStock === 0 ? "Out of Stock" : newStock <= settings.lowStockThreshold ? "Low Stock" : "In Stock",
        };
      }
      return product;
    }));
    toast.success("Batch added successfully!");
  };

  const updateBatch = (productId: number, batchId: number, batch: Partial<Batch>) => {
    setProducts((prev) => prev.map(product => {
      if (product.id === productId) {
        let totalStock = 0;
        const updatedBatches = product.batches.map(b => {
          if (b.id === batchId) {
            const updated = { ...b, ...batch };
            totalStock += updated.quantity;
            return updated;
          }
          totalStock += b.quantity;
          return b;
        });
        return {
          ...product,
          batches: updatedBatches,
          stock: totalStock,
          status: totalStock === 0 ? "Out of Stock" : totalStock <= settings.lowStockThreshold ? "Low Stock" : "In Stock",
        };
      }
      return product;
    }));
    toast.success("Batch updated successfully!");
  };

  const deleteBatch = (productId: number, batchId: number) => {
    setProducts((prev) => prev.map(product => {
      if (product.id === productId) {
        const batch = product.batches.find(b => b.id === batchId);
        const updatedBatches = product.batches.filter(b => b.id !== batchId);
        const newStock = product.stock - (batch?.quantity || 0);
        return {
          ...product,
          batches: updatedBatches,
          stock: Math.max(0, newStock),
          status: Math.max(0, newStock) === 0 ? "Out of Stock" : Math.max(0, newStock) <= settings.lowStockThreshold ? "Low Stock" : "In Stock",
        };
      }
      return product;
    }));
    toast.success("Batch deleted!");
  };

  const adjustStock = (productId: number, quantity: number, reason: string, referenceId?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) {
      toast.error("Product not found!");
      return;
    }

    const previousStock = product.stock;
    const newStock = previousStock + quantity;
    if (newStock < 0) {
      toast.error("Insufficient stock!");
      return;
    }

    // FIFO: Adjust quantities from oldest batches first when deducting
    let updatedBatches = [...product.batches];
    if (quantity < 0) {
      let remaining = Math.abs(quantity);
      updatedBatches = product.batches
        .sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime())
        .map(batch => {
          if (remaining > 0 && batch.quantity > 0) {
            const deduct = Math.min(batch.quantity, remaining);
            remaining -= deduct;
            return { ...batch, quantity: batch.quantity - deduct };
          }
          return batch;
        })
        .filter(batch => batch.quantity > 0);
    }

    // Update product stock and status
    const updatedProduct: Product = {
      ...product,
      batches: updatedBatches,
      stock: newStock,
      status: newStock === 0 ? "Out of Stock" : newStock <= settings.lowStockThreshold ? "Low Stock" : "In Stock",
    };

    setProducts((prev) => prev.map(p => p.id === productId ? updatedProduct : p));

    // Create inventory transaction
    const transactionType = quantity > 0 ? "in" : quantity < 0 ? "out" : "adjustment";
    const transaction: InventoryTransaction = {
      id: Date.now(),
      productId,
      productName: product.name,
      type: transactionType,
      quantity: Math.abs(quantity),
      previousStock,
      newStock,
      reason,
      referenceId,
      timestamp: new Date().toISOString(),
    };

    setInventoryTransactions((prev) => [transaction, ...prev]);
    toast.success("Stock updated successfully!");
  };

  const getExpiringBatches = (days: number = 30) => {
    const expiring: { product: Product; batch: Batch }[] = [];
    const now = new Date();
    const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    products.forEach(product => {
      (product.batches || []).forEach(batch => {
        if (batch.expiryDate) {
          const expiryDate = new Date(batch.expiryDate);
          if (expiryDate <= cutoff && expiryDate >= now) {
            expiring.push({ product, batch });
          }
        }
      });
    });

    return expiring.sort((a, b) => 
      new Date(a.batch.expiryDate!).getTime() - new Date(b.batch.expiryDate!).getTime()
    );
  };

  const refundOrder = (id: string, reason: string, amount?: number) => {
    const order = orders.find(o => o.id === id);
    if (!order) {
      toast.error("Order not found!");
      return;
    }

    // Restore stock only for full refund or specific items (simplified for now)
    if (!amount || amount >= order.grandTotal) {
      order.items.forEach(item => {
        adjustStock(item.productId, item.quantity, "Stock restored from refund", id);
      });
    }

    // Update order status
    setOrders((prev) => prev.map(o => 
      o.id === id ? { 
        ...o, 
        status: "Refunded", 
        paymentStatus: "Refunded", 
        refundReason: reason, 
        refundAmount: amount || order.grandTotal 
      } : o
    ));

    // Create notification
    const newNotification: Notification = {
      id: Date.now(),
      title: "Order Refunded",
      message: `Order ${id} has been refunded: ${reason}`,
      orderId: id,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);

    toast.success(`Order ${id} refunded successfully!`);
  };

  const addInternalNote = (orderId: string, text: string, adminId: string, adminName: string) => {
    const newNote: InternalNote = {
      id: `note-${Date.now()}`,
      text,
      adminId,
      adminName,
      timestamp: new Date().toISOString(),
    };
    setOrders((prev) => prev.map(o => 
      o.id === orderId ? { ...o, internalNotes: [...o.internalNotes, newNote] } : o
    ));
    toast.success("Internal note added!");
  };

  const updateTrackingInfo = (orderId: string, trackingNumber?: string, courierPartner?: string) => {
    setOrders((prev) => prev.map(o => 
      o.id === orderId ? { ...o, trackingNumber, courierPartner } : o
    ));
    toast.success("Tracking info updated!");
  };

  const bulkUpdateOrderStatus = (orderIds: string[], status: Order["status"]) => {
    setOrders((prev) => prev.map(o => 
      orderIds.includes(o.id) ? { ...o, status } : o
    ));
    toast.success(`Updated ${orderIds.length} orders to ${status}!`);
  };

  const getProductInventoryTransactions = (productId: number) => {
    return inventoryTransactions.filter(t => t.productId === productId);
  };

  const getInventoryValue = () => {
    return products.reduce((sum, product) => sum + (product.price * product.stock), 0);
  };

  const getLowStockProducts = () => {
    return products.filter(product => product.stock > 0 && product.stock <= settings.lowStockThreshold);
  };

  const addOrder = (order: Omit<Order, "id" | "orderDate" | "internalNotes">) => {
    const newOrder: Order = {
      ...order,
      id: `#${Date.now().toString().slice(-6)}`,
      orderDate: new Date().toISOString(),
      internalNotes: [],
    };
    setOrders((prev) => [newOrder, ...prev]);
    
    // Deduct stock for each order item
    order.items.forEach(item => {
      adjustStock(item.productId, -item.quantity, "Order placed", newOrder.id);
    });

    // Update customer stats and loyalty points
    const pointsToAdd = Math.floor(order.total * loyaltyProgram.pointsPerRupee);
    setCustomers(prev => prev.map(customer => {
      if (customer.id === order.customerId) {
        const newPoints = customer.loyaltyPoints + pointsToAdd;
        return {
          ...customer,
          ordersCount: customer.ordersCount + 1,
          totalSpent: customer.totalSpent + order.grandTotal,
          loyaltyPoints: newPoints,
          tier: calculateCustomerTier(newPoints),
        };
      }
      return customer;
    }));

    // Add notification for new order
    const newNotification: Notification = {
      id: Date.now(),
      title: "New Order Received!",
      message: `${order.customerName} placed a new order`,
      orderId: newOrder.id,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
    
    toast.success(`New order ${newOrder.id} received! ${pointsToAdd} loyalty points awarded.`);
    if (settings.notificationsEnabled) {
      toast.info(`Order confirmation email sent to ${order.customerEmail} with order ID ${newOrder.id}`);
    }
  };

  const updateOrder = (id: string, updates: Partial<Order>) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === id ? { ...order, ...updates } : order
      )
    );
    toast.success("Order updated!");
    if (settings.notificationsEnabled) {
      toast.info("Status update email would be sent to customer!");
    }
  };

  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((order) => order.id !== id));
    toast.error("Order deleted!");
  };

  const addCustomer = (customer: Omit<Customer, "id" | "ordersCount" | "totalSpent" | "loyaltyPoints" | "tier" | "createdAt">) => {
    const newCustomer: Customer = {
      ...customer,
      id: Date.now(),
      ordersCount: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      tier: "Bronze",
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [...prev, newCustomer]);
    toast.success("Customer added successfully!");
  };

  const updateCustomer = (id: number, updates: Partial<Customer>) => {
    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === id ? { ...customer, ...updates } : customer
      )
    );
    toast.success("Customer updated!");
  };

  const deleteCustomer = (id: number) => {
    setCustomers((prev) => prev.filter((customer) => customer.id !== id));
    toast.error("Customer deleted!");
  };

  const getCustomerOrders = (customerId: number) => {
    return orders.filter((order) => order.customerId === customerId);
  };

  const addBlogPost = (post: Omit<BlogPost, "id">) => {
    const newPost: BlogPost = {
      ...post,
      id: Date.now().toString(),
    };
    setBlogPosts((prev) => [newPost, ...prev]);
    toast.success("Blog post added successfully!");
  };

  const updateBlogPost = (id: string, updates: Partial<BlogPost>) => {
    setBlogPosts((prev) =>
      prev.map((post) =>
        post.id === id ? { ...post, ...updates } : post
      )
    );
    toast.success("Blog post updated!");
  };

  const deleteBlogPost = (id: string) => {
    setBlogPosts((prev) => prev.filter((post) => post.id !== id));
    toast.error("Blog post deleted!");
  };

  const addReview = (review: Omit<Review, "id">) => {
    const newReview: Review = {
      ...review,
      id: Date.now(),
    };
    setReviews((prev) => [...prev, newReview]);
    toast.success("Review added successfully!");
  };

  const updateReview = (id: number, updates: Partial<Review>) => {
    setReviews((prev) =>
      prev.map((review) =>
        review.id === id ? { ...review, ...updates } : review
      )
    );
    toast.success("Review updated!");
  };

  const deleteReview = (id: number) => {
    setReviews((prev) => prev.filter((review) => review.id !== id));
    toast.error("Review deleted!");
  };
  
  // Product Line functions
  const addProductLine = (productLine: Omit<ProductLine, "id" | "createdAt" | "updatedAt">) => {
    const newProductLine: ProductLine = {
      ...productLine,
      id: Date.now(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setProductLines((prev) => [...prev, newProductLine]);
    toast.success("Product line added successfully!");
  };

  const updateProductLine = (id: number | string, updates: Partial<ProductLine>) => {
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    setProductLines((prev) =>
      prev.map((line) =>
        line.id === numericId ? { ...line, ...updates, updatedAt: new Date().toISOString() } : line
      )
    );
    toast.success("Product line updated!");
  };

  const deleteProductLine = (id: number | string) => {
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    setProductLines((prev) => prev.filter((line) => line.id !== numericId));
    toast.error("Product line deleted!");
  };

  // Hero Visual functions
  const addHeroVisual = (heroVisual: Omit<HeroVisual, "id" | "createdAt" | "updatedAt">) => {
    const newHeroVisual: HeroVisual = {
      ...heroVisual,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setHeroVisuals((prev) => [...prev, newHeroVisual]);
    toast.success("Hero visual added successfully!");
  };

  const updateHeroVisual = (id: string, updates: Partial<HeroVisual>) => {
    setHeroVisuals((prev) =>
      prev.map((visual) =>
        visual.id === id ? { ...visual, ...updates, updatedAt: new Date().toISOString() } : visual
      )
    );
    toast.success("Hero visual updated!");
  };

  const deleteHeroVisual = (id: string) => {
    setHeroVisuals((prev) => prev.filter((visual) => visual.id !== id));
    toast.error("Hero visual deleted!");
  };

  const getProductReviews = (productId: number) => {
    return reviews.filter((review) => review.productId === productId);
  };

  const addCoupon = (coupon: Omit<Coupon, "id" | "usedCount">) => {
    const newCoupon: Coupon = {
      ...coupon,
      id: Date.now().toString(),
      usedCount: 0,
    };
    setCoupons((prev) => [...prev, newCoupon]);
    toast.success("Coupon added successfully!");
  };

  const updateCoupon = (id: string, updates: Partial<Coupon>) => {
    setCoupons((prev) =>
      prev.map((coupon) =>
        coupon.id === id ? { ...coupon, ...updates } : coupon
      )
    );
    toast.success("Coupon updated!");
  };

  const deleteCoupon = (id: string) => {
    setCoupons((prev) => prev.filter((coupon) => coupon.id !== id));
    toast.error("Coupon deleted!");
  };

  const addCollection = (collection: Omit<Collection, "id">) => {
    const newCollection: Collection = {
      ...collection,
      id: Date.now().toString(),
    };
    setCollections((prev) => [...prev, newCollection]);
    toast.success("Collection added successfully!");
  };

  const updateCollection = (id: string, updates: Partial<Collection>) => {
    setCollections((prev) =>
      prev.map((collection) =>
        collection.id === id ? { ...collection, ...updates } : collection
      )
    );
    toast.success("Collection updated!");
  };

  const deleteCollection = (id: string) => {
    setCollections((prev) => prev.filter((collection) => collection.id !== id));
    toast.error("Collection deleted!");
  };

  const addBrewingGuide = (guide: Omit<BrewingGuide, "id">) => {
    const newGuide: BrewingGuide = {
      ...guide,
      id: Date.now().toString(),
    };
    setBrewingGuides((prev) => [...prev, newGuide]);
    toast.success("Brewing guide added successfully!");
  };

  const updateBrewingGuide = (id: string, updates: Partial<BrewingGuide>) => {
    setBrewingGuides((prev) =>
      prev.map((guide) =>
        guide.id === id ? { ...guide, ...updates } : guide
      )
    );
    toast.success("Brewing guide updated!");
  };

  const deleteBrewingGuide = (id: string) => {
    setBrewingGuides((prev) => prev.filter((guide) => guide.id !== id));
    toast.error("Brewing guide deleted!");
  };

  const addFAQ = (faq: Omit<FAQ, "id">) => {
    const newFAQ: FAQ = {
      ...faq,
      id: Date.now().toString(),
    };
    setFaqs((prev) => [...prev, newFAQ]);
    toast.success("FAQ added successfully!");
  };

  const updateFAQ = (id: string, updates: Partial<FAQ>) => {
    setFaqs((prev) =>
      prev.map((faq) =>
        faq.id === id ? { ...faq, ...updates } : faq
      )
    );
    toast.success("FAQ updated!");
  };

  const deleteFAQ = (id: string) => {
    setFaqs((prev) => prev.filter((faq) => faq.id !== id));
    toast.error("FAQ deleted!");
  };

  const updateAboutPage = (updates: Partial<AboutPage>) => {
    setAboutPage((prev) => ({ ...prev, ...updates }));
    toast.success("About page updated!");
  };

  const markNotificationRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((notif) =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const updateSettings = (newSettings: Partial<StoreContextType["settings"]>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    toast.success("Settings saved!");
  };

  return (
    <StoreContext.Provider
      value={{
        adminUsers,
        addAdminUser,
        updateAdminUser,
        deleteAdminUser,
        verifyAdminCredentials,
        productLines,
        isCatalogLoading,
        addProductLine,
        updateProductLine,
        deleteProductLine,
        heroVisuals,
        addHeroVisual,
        updateHeroVisual,
        deleteHeroVisual,
        products,
        orders,
        customers,
        notifications,
        blogPosts,
        reviews,
        coupons,
        collections,
        brewingGuides,
        faqs,
        aboutPage,
        inventoryTransactions,
        purchaseOrders,
        addProduct,
        updateProduct,
        deleteProduct,
        addBatch,
        updateBatch,
        deleteBatch,
        addProductVariant,
        updateProductVariant,
        deleteProductVariant,
        addOrder,
        updateOrder,
        deleteOrder,
        refundOrder,
        addInternalNote,
        updateTrackingInfo,
        bulkUpdateOrderStatus,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerOrders,
        addLoyaltyPoints,
        redeemLoyaltyPoints,
        addPurchaseOrder,
        updatePurchaseOrder,
        receivePurchaseOrder,
        deletePurchaseOrder,
        addBlogPost,
        updateBlogPost,
        deleteBlogPost,
        addReview,
        updateReview,
        deleteReview,
        getProductReviews,
        addCoupon,
        updateCoupon,
        deleteCoupon,
        addCollection,
        updateCollection,
        deleteCollection,
        addBrewingGuide,
        updateBrewingGuide,
        deleteBrewingGuide,
        addFAQ,
        updateFAQ,
        deleteFAQ,
        updateAboutPage,
        markNotificationRead,
        clearNotifications,
        adjustStock,
        getProductInventoryTransactions,
        getInventoryValue,
        getLowStockProducts,
        getExpiringBatches,
        loyaltyProgram,
        settings,
        updateSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
};
