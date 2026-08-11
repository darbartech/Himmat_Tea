export interface ProductVariant {
  id: number;
  [key: string]: unknown;
}
export interface ProductBatch {
  id: number;
  [key: string]: unknown;
}
export interface ProductReview {
  id: number;
  rating: number;
  comment?: string;
  [key: string]: unknown;
}
export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: string;
  description: string;
  imageUrl: string;
  sku?: string;
  reorderPoint?: number;
  hasVariants: boolean;
  variantOptions?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  productVariants: ProductVariant[];
  batches: ProductBatch[];
  reviews: ProductReview[];
}

export const initialMockProducts: Product[] = [
  {
    id: 1,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    productVariants: [],
    batches: [],
    reviews: [
      { id: 1, rating: 5, comment: "Excellent tea!" },
      { id: 2, rating: 4, comment: "Very good quality" }
    ]
  },
  {
    id: 2,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    productVariants: [],
    batches: [],
    reviews: [
      { id: 1, rating: 5, comment: "Best Darjeeling I've had!" },
      { id: 2, rating: 5, comment: "Floral and delicious" }
    ]
  },
  {
    id: 3,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    productVariants: [],
    batches: [],
    reviews: [
      { id: 1, rating: 4, comment: "Very calming" }
    ]
  },
  {
    id: 4,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    productVariants: [],
    batches: [],
    reviews: [
      { id: 1, rating: 5, comment: "Amazing oolong!" }
    ]
  },
  {
    id: 5,
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
    createdAt: new Date(),
    updatedAt: new Date(),
    productVariants: [],
    batches: [],
    reviews: [
      { id: 1, rating: 5, comment: "Incredible white tea!" },
      { id: 2, rating: 4, comment: "Delicate and smooth" }
    ]
  }
];

// In-memory storage
class MockDatabase {
  private _products: Product[] = [...initialMockProducts];
  private _nextId: number = 6;

  get products(): Product[] {
    return this._products;
  }

  get nextId(): number {
    return this._nextId;
  }

  set nextId(value: number) {
    this._nextId = value;
  }

  addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'productVariants' | 'batches' | 'reviews'>): Product {
    const newProduct: Product = {
      ...product,
      id: this._nextId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      productVariants: [],
      batches: [],
      reviews: []
    };
    this._products.push(newProduct);
    return newProduct;
  }

  getProductById(id: number): Product | undefined {
    return this._products.find(p => p.id === id);
  }

  updateProduct(id: number, data: Partial<Product>): Product | undefined {
    const index = this._products.findIndex(p => p.id === id);
    if (index === -1) return undefined;
    this._products[index] = {
      ...this._products[index],
      ...data,
      updatedAt: new Date()
    };
    return this._products[index];
  }

  deleteProduct(id: number): boolean {
    const index = this._products.findIndex(p => p.id === id);
    if (index === -1) return false;
    this._products.splice(index, 1);
    return true;
  }
}

export const mockDb = new MockDatabase();
