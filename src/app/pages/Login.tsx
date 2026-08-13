'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { Eye, EyeOff, AlertCircle, ArrowLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isLoggedIn } = useAuth();
  const navigate = useRouter();

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isLoggedIn) {
      navigate.push("/himmat_admin_8526/dashboard");
    }
  }, [isLoggedIn, navigate]);

  if (isLoggedIn) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }

    setIsSubmitting(true);
    // Simulate a small delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const success = await login(username, password);
    if (success) {
      toast.success("Welcome back!");
      navigate.push("/himmat_admin_8526/dashboard");
    } else {
      setError("Invalid credentials. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-white">
      {/* Left Section - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 sm:px-12 lg:px-20 py-12 bg-white">
        <div className="w-full max-w-lg">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 mb-12 text-[#78746e] hover:text-[#2d5a3d] transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>

          {/* Logo */}
              <Image
              src="/logo.svg"
              alt="GodGifted Logo"
              width={100}
              height={100}
              className="w-[150px] h-[100%]"
             
            />

          {/* Header */}
          <div className="mb-10">
            <h1
              className="text-4xl font-bold text-[#1c1917] mb-3"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Welcome back
            </h1>
            <p className="text-[#78746e] text-lg">
              Sign in to your admin dashboard
            </p>
          </div>

          {error && (
            <Alert variant="destructive" role="alert" className="mb-8 border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="space-y-2.5">
              <Label 
                htmlFor="username" 
                className="text-[#1c1917] text-sm font-medium"
              >
                Username or Email
              </Label>
              <Input
                id="username"
                name="username"
                type="text"
                placeholder="Enter your username or email"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                required
                aria-describedby={error ? "username-error" : undefined}
                aria-invalid={!!error}
                disabled={isSubmitting}
                className="h-12 px-4 border-[rgba(28,25,23,0.15)] bg-white focus:border-[#2d5a3d] focus:ring-2 focus:ring-[#2d5a3d]/10 transition-all duration-200 text-[#1c1917] placeholder:text-[#b0aba4]"
              />
            </div>

            <div className="space-y-2.5">
              <Label 
                htmlFor="password" 
                className="text-[#1c1917] text-sm font-medium"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  required
                  aria-describedby={error ? "password-error" : undefined}
                  aria-invalid={!!error}
                  disabled={isSubmitting}
                  className="h-12 px-4 pr-12 border-[rgba(28,25,23,0.15)] bg-white focus:border-[#2d5a3d] focus:ring-2 focus:ring-[#2d5a3d]/10 transition-all duration-200 text-[#1c1917] placeholder:text-[#b0aba4]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#78746e] hover:text-[#1c1917] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4.5 w-4.5" />
                  ) : (
                    <Eye className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer h-12 bg-[#2d5a3d] hover:bg-[#244a33] text-white text-base font-medium rounded-lg transition-all duration-200 shadow-lg shadow-[#2d5a3d]/20 hover:shadow-xl hover:shadow-[#2d5a3d]/25"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Sign in</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Right Section - Image & Branding */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Background Image */}
        <img
          src="https://imgs.search.brave.com/laq4WDrhQXqaasssQIbDDX-4-2_F39fPSfplq-EARFE/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly9zdGF0/aWMudmVjdGVlenku/Y29tL3N5c3RlbS9y/ZXNvdXJjZXMvdGh1/bWJuYWlscy8wMTEv/NTk5LzM0NC9zbWFs/bC90ZWEtY3VwLXdp/dGgtYW5kLXRlYS1s/ZWFmLXNhY2tpbmct/b24tdGhlLXdvb2Rl/bi10YWJsZS1hbmQt/dGhlLXRlYS1wbGFu/dGF0aW9ucy1iYWNr/Z3JvdW5kLXBob3Rv/LmpwZw"
          alt="Tea leaves being harvested in a lush plantation"
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b7c33]/95 via-[#0b7c33]/40 to-transparent" />
        
        {/* Branding Content */}
        <div className="relative z-10 h-full flex flex-col justify-end p-16">
          <div className="max-w-md">
            
            <h2
              className="text-5xl lg:text-6xl font-bold text-white mb-5 leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Crafting the perfect cup
            </h2>
            <p className="text-white/85 text-lg leading-relaxed mb-10">
              Experience the art of tea with Himmat Tea. From the finest plantations to your cup.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6">
              <div>
                <div className="text-3xl font-bold text-[#c8a96e]">50+</div>
                <div className="text-sm text-white/70 mt-1">Tea Varieties</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#c8a96e]">10K+</div>
                <div className="text-sm text-white/70 mt-1">Happy Customers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-[#c8a96e]">15+</div>
                <div className="text-sm text-white/70 mt-1">Years of Excellence</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
