"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  productId?: number;
  variantId?: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  weight?: string;
  stock?: number;
}

export interface AppliedCoupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscount: number;
  discountAmount: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
  appliedCoupon: AppliedCoupon | null;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "himmat-tea-cart";
const COUPON_STORAGE_KEY = "himmat-tea-coupon";

/**
 * IMPORTANT:
 * Do not read localStorage during the initial render.
 *
 * Server render = empty cart
 * First client render = empty cart
 * After hydration = load localStorage
 *
 * This prevents the Next.js hydration mismatch.
 */
export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCouponState] = useState<AppliedCoupon | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  /**
   * Load cart only after hydration.
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);

      if (!saved) {
        setIsHydrated(true);
      } else {
        const parsed: unknown = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          let droppedInvalid = false;
          const validCart = parsed.filter((item): item is CartItem => {
            const isValid =
              item &&
              typeof item === "object" &&
              typeof (item as CartItem).id === "string" &&
              typeof (item as CartItem).name === "string" &&
              typeof (item as CartItem).price === "number" &&
              typeof (item as CartItem).quantity === "number" &&
              typeof (item as CartItem).productId === "number" &&
              !Number.isNaN((item as CartItem).productId);

            if (!isValid) droppedInvalid = true;
            return isValid;
          });

          setCart(validCart);

          if (droppedInvalid) {
            // Items saved before productId was required (or corrupted data)
            // would otherwise silently survive hydration and only fail at
            // checkout. Drop them here and let the user know instead.
            toast.error(
              "Some items in your saved cart were out of date and have been removed. Please re-add them."
            );
          }
        }
      }

      try {
        const savedCoupon = localStorage.getItem(COUPON_STORAGE_KEY);
        if (savedCoupon) {
          const parsedCoupon: unknown = JSON.parse(savedCoupon);
          if (
            parsedCoupon &&
            typeof parsedCoupon === "object" &&
            typeof (parsedCoupon as AppliedCoupon).code === "string" &&
            typeof (parsedCoupon as AppliedCoupon).discountAmount === "number"
          ) {
            setAppliedCouponState(parsedCoupon as AppliedCoupon);
          }
        }
      } catch (_couponErr) {
        /* noop */
      }

      setIsHydrated(true);
    } catch (error) {
      console.error(
        "Failed to read cart from localStorage:",
        error
      );

      setCart([]);
      setIsHydrated(true);
    }
  }, []);

  /**
   * Save cart to localStorage.
   *
   * Only save after the initial localStorage load has completed.
   * This prevents the initial empty state from overwriting
   * an existing cart.
   */
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cart)
      );
    } catch (error) {
      console.error(
        "Failed to save cart to localStorage:",
        error
      );
    }
  }, [cart, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      if (appliedCoupon) {
        localStorage.setItem(
          COUPON_STORAGE_KEY,
          JSON.stringify(appliedCoupon)
        );
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY);
      }
    } catch (_err) {
      /* noop */
    }
  }, [appliedCoupon, isHydrated]);

  /**
   * Add product to cart.
   */
  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      if (
        process.env.NODE_ENV !== "production" &&
        (typeof item.productId !== "number" || Number.isNaN(item.productId))
      ) {
        console.warn(
          `[CartContext] addToCart called without a valid numeric productId for item "${item.name}" (id: ${item.id}). ` +
            "This item will be rejected at checkout — check the addToCart() call site."
        );
      }
      setCart((prev) => {
        const existing = prev.find(
          (i) =>
            i.id === item.id &&
            i.variantId === item.variantId &&
            i.weight === item.weight
        );

        const stock = typeof item.stock === "number" ? item.stock : Infinity;

        if (existing) {
          const cap =
            typeof existing.stock === "number" ? existing.stock : stock;
          const nextQty = Math.min(existing.quantity + 1, Math.max(0, cap));
          if (nextQty === existing.quantity) return prev;
          return prev.map((i) =>
            i.id === item.id &&
            i.variantId === item.variantId &&
            i.weight === item.weight
              ? {
                  ...i,
                  quantity: nextQty,
                  stock:
                    typeof i.stock === "number" ? i.stock : item.stock,
                }
              : i
          );
        }

        return [
          ...prev,
          {
            ...item,
            quantity: 1,
          },
        ];
      });
    },
    []
  );

  /**
   * Update quantity.
   */
  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (quantity <= 0) {
        setCart((prev) =>
          prev.filter((item) => item.id !== id)
        );

        return;
      }

      setCart((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity:
                  typeof item.stock === "number"
                    ? Math.min(quantity, item.stock)
                    : quantity,
              }
            : item
        )
      );
    },
    []
  );

  /**
   * Remove item.
   */
  const removeFromCart = useCallback((id: string) => {
    setCart((prev) =>
      prev.filter((item) => item.id !== id)
    );
  }, []);

  /**
   * Clear cart.
   */
  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCouponState(null);
  }, []);

  /**
   * Apply or clear applied coupon.
   */
  const setAppliedCoupon = useCallback((coupon: AppliedCoupon | null) => {
    setAppliedCouponState(coupon);
  }, []);

  /**
   * Number of products/items.
   */
  const cartCount = useMemo(() => {
    return cart.reduce(
      (sum, item) => sum + item.quantity,
      0
    );
  }, [cart]);

  /**
   * Total cart value.
   */
  const cartTotal = useMemo(() => {
    return cart.reduce(
      (sum, item) =>
        sum + item.price * item.quantity,
      0
    );
  }, [cart]);

  /**
   * Context value.
   */
  const contextValue = useMemo<CartContextType>(
    () => ({
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartCount,
      cartTotal,
      appliedCoupon,
      setAppliedCoupon,
    }),
    [
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartCount,
      cartTotal,
      appliedCoupon,
      setAppliedCoupon,
    ]
  );

  return (
    <CartContext.Provider value={contextValue}>
      {children}
    </CartContext.Provider>
  );
}

/**
 * useCart hook.
 */
export function useCart(): CartContextType {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error(
      "useCart must be used within a CartProvider"
    );
  }

  return context;
}