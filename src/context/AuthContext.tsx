"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/lib/api-client";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: "admin" | "superadmin";
  isActive: boolean;
  createdAt: string;
  type?: "admin";
}

interface CustomerUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyaltyPoints: number;
  tier: "Bronze" | "Silver" | "Gold" | "Platinum";
  ordersCount: number;
  totalSpent: number;
  createdAt: string;
  type?: "customer";
}

type User = AdminUser | CustomerUser;

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: User | null;
  userType: "admin" | "customer" | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  customerLogin: (email: string, password: string) => Promise<boolean>;
  initiateCustomerSignup: (
    name: string,
    email: string,
    phone: string,
    password: string,
    address: string
  ) => Promise<{ success: boolean; error?: string }>;
  verifyCustomerSignup: (
    email: string,
    otp: string
  ) => Promise<{ success: boolean; error?: string }>;
  resendSignupOtp: (email: string) => Promise<{ success: boolean; error?: string }>;
  socialLogin: (provider: "google" | "github") => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const prefix = `${encodeURIComponent(name)}=`;

  const parts = document.cookie.split(";");

  for (const part of parts) {
    const trimmed = part.trim();

    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.substring(prefix.length));
    }
  }

  return null;
}

function initialLoggedIn(): boolean {
  return readCookie("himmat_isLoggedIn") === "true";
}

function initialUserType(): "admin" | "customer" | null {
  const value = readCookie("himmat_userType");

  if (value === "admin" || value === "customer") {
    return value;
  }

  return null;
}

function initialUser(): User | null {
  const raw = readCookie("himmat_currentUser");

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);

    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.type === "admin" || parsed.type === "customer")
    ) {
      return parsed as User;
    }

    return null;
  } catch {
    return null;
  }
}

function writeCookie(
  name: string,
  value: string,
  days = 4
): void {
  if (typeof document === "undefined") return;

  const maxAge = days * 24 * 60 * 60;

  const secure =
    typeof window !== "undefined" &&
    window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}` +
    `; Path=/` +
    `; Max-Age=${maxAge}` +
    `; SameSite=Lax` +
    secure;
}

function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;

  document.cookie =
    `${encodeURIComponent(name)}=` +
    `; Path=/` +
    `; Expires=Thu, 01 Jan 1970 00:00:00 GMT` +
    `; Max-Age=0` +
    `; SameSite=Lax`;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  /*
   * IMPORTANT:
   * These lazy initializers execute immediately in the browser.
   * Therefore the UI knows the authentication state before
   * the /auth/me request completes.
   */
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(
    () => initialLoggedIn()
  );

  const [currentUser, setCurrentUser] = useState<User | null>(
    () => initialUser()
  );

  const [userType, setUserType] = useState<
    "admin" | "customer" | null
  >(() => initialUserType());

  /*
   * If we already have a persisted login state, don't block
   * the UI waiting for /auth/me.
   */
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !initialLoggedIn()
  );

  interface AuthEnvelope {
    success?: boolean;
    user?: User;
  }

  const persistUser = (
    user: User,
    type: "admin" | "customer"
  ) => {
    const userWithType = { ...user, type } as User;
    setCurrentUser(userWithType);
    setIsLoggedIn(true);
    setUserType(type);

    writeCookie("himmat_isLoggedIn", "true");
    writeCookie("himmat_userType", type);
    writeCookie("himmat_currentUser", JSON.stringify(userWithType));

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[AUTH] AuthContext persistUser → type=${type}, id=${user.id}`
      );
    }
  };

  const clearAuth = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUserType(null);

    deleteCookie("himmat_isLoggedIn");
    deleteCookie("himmat_userType");
    deleteCookie("himmat_currentUser");

    if (process.env.NODE_ENV === "development") {
      console.log("[AUTH] AuthContext clearAuth → signed out");
    }
  };

  /*
   * Validate the real HTTP-only session cookie.
   *
   * The browser UI already has optimistic auth state, so this
   * request does not block the first render.
   */
  const hydrateFromServer = async () => {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log("[AUTH] Hydrating auth state from server /auth/me…");
      }
      const response =
        await api.get<AuthEnvelope>("/auth/me");

      if (response.success && response.user) {
        const user = response.user;

        const type =
          "username" in user
            ? "admin"
            : "customer";

        persistUser(user, type);
        if (process.env.NODE_ENV === "development") {
          console.log(`[AUTH] Hydrated → type=${type}, id=${user.id}`);
        }
      } else {
        clearAuth();
        if (process.env.NODE_ENV === "development") {
          console.log("[AUTH] Hydrated → no active session, cleared");
        }
      }
    } catch {
      /*
       * Network/server error:
       *
       * Don't immediately log the customer out.
       * Keep the existing optimistic authentication state.
       */
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[AUTH] Hydration network error — keeping optimistic state"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    hydrateFromServer();
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<boolean> => {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AUTH] Admin login started → identifier=${username}`
        );
      }
      const response =
        await api.post<AuthEnvelope>(
          "/auth/login",
          {
            username,
            password,
          }
        );

      if (response.success && response.user) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[AUTH] Admin login API success → id=${response.user.id}`
          );
        }
        persistUser(response.user, "admin");
        return true;
      }
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.log("[AUTH] Admin login failed — invalid credentials");
      }
      // Login failed
    }

    return false;
  };

  const customerLogin = async (
    email: string,
    password: string
  ): Promise<boolean> => {
    try {
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AUTH] Customer login started → email=${email}`
        );
      }
      const response =
        await api.post<AuthEnvelope>(
          "/customer/login",
          {
            email,
            password,
          }
        );

      if (response.success && response.user) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[AUTH] Customer login API success → id=${response.user.id}`
          );
        }
        persistUser(response.user, "customer");
        return true;
      }
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[AUTH] Customer login failed — invalid credentials or server error"
        );
      }
      // Customer login failed
    }

    return false;
  };

  const initiateCustomerSignup = async (
    name: string,
    email: string,
    phone: string,
    password: string,
    address: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
<<<<<<< HEAD
      const response = await api.post<{
        success: boolean;
        error?: string;
      }>(
        "/customer/signup",
        {
          name,
          email,
          phone,
          password,
          address,
        }
      );

      if (response.success) {
        return { success: true };
      }

      return {
        success: false,
        error: response.error || "Signup failed. Please try again.",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Signup failed. Please try again.",
      };
    }
  };

  const verifyCustomerSignup = async (
    email: string,
    otp: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post<AuthEnvelope>(
        "/customer/signup/verify",
        {
          email,
          otp,
        }
      );
=======
      if (process.env.NODE_ENV === "development") {
        console.log(
          `[AUTH] Customer signup started → email=${email}, name=${name}`
        );
      }
      const response =
        await api.post<AuthEnvelope>(
          "/customer/signup",
          {
            name,
            email,
            phone,
            password,
            address,
          }
        );
>>>>>>> 677101886b9792c9960f382ed2fb2d4eedd60536

      if (response.success && response.user) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `[AUTH] Customer signup API success → id=${response.user.id}`
          );
        }
        persistUser(response.user, "customer");
        return { success: true };
      }
<<<<<<< HEAD
=======
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.log("[AUTH] Customer signup failed");
      }
      // Signup failed
    }
>>>>>>> 677101886b9792c9960f382ed2fb2d4eedd60536

      return {
        success: false,
        error: "Invalid verification code. Please try again.",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Invalid verification code. Please try again.",
      };
    }
  };

  const resendSignupOtp = async (
    email: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post<{ success?: boolean; error?: string }>(
        "/customer/signup/resend",
        {
          email,
        }
      );

      if (response.success) {
        return { success: true };
      }

      return {
        success: false,
        error: response.error || "Could not resend the code. Please try again.",
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not resend the code. Please try again.",
      };
    }
  };

  const socialLogin = async (
    provider: "google" | "github"
  ): Promise<boolean> => {
    return false;
  };

  const logout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout", {});
      if (process.env.NODE_ENV === "development") {
        console.log("[AUTH] Logout API called — server cookies cleared");
      }
    } catch {
      /*
       * Even if the server logout request fails,
       * clear the client authentication state.
       */
      if (process.env.NODE_ENV === "development") {
        console.log(
          "[AUTH] Logout API call failed — clearing client state anyway"
        );
      }
    }

    clearAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        currentUser,
        userType,
        isLoading,
        login,
        customerLogin,
        initiateCustomerSignup,
        verifyCustomerSignup,
        resendSignupOtp,
        socialLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error(
      "useAuth must be used within an AuthProvider"
    );
  }

  return context;
};