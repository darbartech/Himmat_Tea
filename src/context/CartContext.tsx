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

export interface CartItem {
  id: string;
  productId?: number;
  variantId?: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
  weight?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "himmat-tea-cart";

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
  const [isHydrated, setIsHydrated] = useState(false);

  /**
   * Load cart only after hydration.
   */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);

      if (!saved) {
        setIsHydrated(true);
        return;
      }

      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        const validCart = parsed.filter((item): item is CartItem => {
          return (
            item &&
            typeof item === "object" &&
            typeof (item as CartItem).id === "string" &&
            typeof (item as CartItem).name === "string" &&
            typeof (item as CartItem).price === "number" &&
            typeof (item as CartItem).quantity === "number"
          );
        });

        setCart(validCart);
      }
    } catch (error) {
      console.error(
        "Failed to read cart from localStorage:",
        error
      );

      setCart([]);
    } finally {
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

  /**
   * Add product to cart.
   */
  const addToCart = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      setCart((prev) => {
        const existing = prev.find(
          (i) =>
            i.id === item.id &&
            i.variantId === item.variantId &&
            i.weight === item.weight
        );

        if (existing) {
          return prev.map((i) =>
            i.id === item.id &&
            i.variantId === item.variantId &&
            i.weight === item.weight
              ? {
                  ...i,
                  quantity: i.quantity + 1,
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
                quantity,
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
    }),
    [
      cart,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      cartCount,
      cartTotal,
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