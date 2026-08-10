"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
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

interface AuthContextType {
  isLoggedIn: boolean;
  currentUser: AdminUser | CustomerUser | null;
  userType: "admin" | "customer" | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  customerLogin: (email: string, password: string) => Promise<boolean>;
  customerSignup: (name: string, email: string, phone: string, password: string, address: string) => Promise<boolean>;
  socialLogin: (provider: 'google' | 'github') => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | CustomerUser | null>(null);
  const [userType, setUserType] = useState<"admin" | "customer" | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    try {
      const response: any = await api.get('/auth/me');
      if (response.success && response.user) {
        const user = response.user;
        setCurrentUser(user);
        setIsLoggedIn(true);
        if ('username' in user) {
          setUserType('admin');
        } else {
          setUserType('customer');
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response: any = await api.post('/auth/login', { username, password });
      if (response.success && response.user) {
        setCurrentUser(response.user);
        setIsLoggedIn(true);
        setUserType("admin");
        return true;
      }
    } catch (error) {
    }
    return false;
  };

  const customerLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const response: any = await api.post('/customer/login', { email, password });
      if (response.success && response.user) {
        setCurrentUser(response.user);
        setIsLoggedIn(true);
        setUserType("customer");
        return true;
      }
    } catch (error) {
    }
    return false;
  };

  const customerSignup = async (name: string, email: string, phone: string, password: string, address: string): Promise<boolean> => {
    try {
      const response: any = await api.post('/customer/signup', { name, email, phone, password, address });
      if (response.success && response.user) {
        setCurrentUser(response.user);
        setIsLoggedIn(true);
        setUserType("customer");
        return true;
      }
    } catch (error) {
    }
    return false;
  };

  const socialLogin = async (provider: 'google' | 'github'): Promise<boolean> => {
    return false;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
    }
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUserType(null);
  };

  return (
    <AuthContext.Provider value={{ 
      isLoggedIn, 
      currentUser, 
      userType,
      isLoading, 
      login, 
      customerLogin, 
      customerSignup, 
      socialLogin, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
