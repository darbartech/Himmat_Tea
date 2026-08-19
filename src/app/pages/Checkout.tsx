'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowRight, Check, Lock, User, AlertTriangle, RefreshCw, ShoppingBag, QrCode, Tag, X } from "lucide-react";
import { useCart, AppliedCoupon } from "@/context/CartContext";
import { useStore } from "@/context/StoreContext";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import Link from "next/link";

type SettingsType = {
  taxRate: number;
  shippingFlatRate: number;
  currency: string;
  qrImageUrl?: string | null;
};

function getCheckoutSteps(t: (key: string) => string) {
  return [
    { num: 1, label: t('checkout.steps.delivery') },
    { num: 2, label: t('checkout.steps.reviewAndPlace') },
  ];
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#1c1917] mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-3 rounded-xl border bg-[#f9f7f4] text-[#1c1917] placeholder:text-[#78746e]/50 focus:outline-none transition-colors text-sm ${
          error
            ? "border-red-500 focus:border-red-500"
            : "border-[rgba(28,25,23,0.12)] focus:border-[#2d5a3d]"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function generateIdempotencyKey(): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `chk-${rand}`
}

export default function Checkout() {
  const { t } = useTranslation();
  const router = useRouter();
  const { cart, cartTotal, clearCart, appliedCoupon, setAppliedCoupon } = useCart();
  const { settings: fallbackSettings } = useStore();
  const { isLoggedIn, userType, currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [saveAddress, setSaveAddress] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const [liveSettings, setLiveSettings] = useState<SettingsType | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const taxRate = liveSettings?.taxRate ?? fallbackSettings.taxRate ?? 18;
  const shippingFlatRate = liveSettings?.shippingFlatRate ?? fallbackSettings.shippingFlatRate ?? 0;
  const currency = liveSettings?.currency ?? fallbackSettings.currency ?? "Rs.";

  const subtotal = cartTotal;
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxable * (taxRate / 100));
  const grandTotal = taxable + taxAmount + shippingFlatRate;

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    province: "",
    postal: "",
    country: "np"
  });

  const fullAddress = [formData.address, formData.city, formData.province, formData.postal, formData.country.toUpperCase()]
    .filter(part => part.trim()).join(", ");

  useEffect(() => {
    (async () => {
      try {
        const res: any = await api.get('/settings');
        if (res?.success && res.data) {
          setLiveSettings(res.data);
        }
      } catch (_) { /* noop - fall back to store defaults */ }
    })();
  }, []);

  useEffect(() => {
    if (isLoggedIn && userType === 'customer' && currentUser) {
      const customer = currentUser as any;
      setFormData(prev => ({
        ...prev,
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
      }));
    }
  }, [isLoggedIn, userType, currentUser]);

  if (!isLoggedIn || userType !== 'customer') {
    return (
      <div className="min-h-screen bg-[#f9f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <Navigation />
        <main className="pt-[180px] pb-24">
          <div className="max-w-2xl mx-auto px-6 lg:px-8">
            <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-10 text-center">
              <Lock className="h-16 w-16 text-[#2d5a3d] mx-auto mb-6" />
              <h2 className="text-2xl font-semibold text-[#1c1917] mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Sign in to Checkout
              </h2>
              <p className="text-[#78746e] mb-8">
                Please sign in or create an account to complete your order.
              </p>
              <Link
                href="/customer-auth?redirect=/checkout"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-all"
              >
                <User className="h-5 w-5" />
                Sign In / Create Account
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^[+]?[0-9\s-]{8,}$/;
    return phoneRegex.test(phone);
  };

  const validatePostal = (postal: string) => {
    const postalRegex = /^[0-9]{4,10}$/;
    return postalRegex.test(postal);
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('checkout.validation.nameRequired');
    }

    if (!formData.email.trim()) {
      newErrors.email = t('checkout.validation.emailRequired');
    } else if (!validateEmail(formData.email)) {
      newErrors.email = t('checkout.validation.emailInvalid');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('checkout.validation.phoneRequired');
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = t('checkout.validation.phoneInvalid');
    }

    if (!formData.address.trim()) {
      newErrors.address = t('checkout.validation.addressRequired');
    }

    if (!formData.city.trim()) {
      newErrors.city = t('checkout.validation.cityRequired');
    }

    if (!formData.province.trim()) {
      newErrors.province = t('checkout.validation.provinceRequired');
    }

    if (formData.postal.trim() && !validatePostal(formData.postal)) {
      newErrors.postal = t('checkout.validation.postalInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    if (errors[e.target.name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[e.target.name];
        return newErrors;
      });
    }
  };

  async function handleApplyCoupon(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const code = couponInput.trim();
    if (!code) {
      toast.error("Please enter a coupon code.");
      return;
    }
    if (subtotal <= 0) {
      toast.error("Add items to your cart before applying a coupon.");
      return;
    }
    setIsApplyingCoupon(true);
    try {
      const res: any = await api.get(`/coupons?code=${encodeURIComponent(code)}&subtotal=${subtotal}`);
      if (res?.valid && res?.data) {
        const couponData: AppliedCoupon = res.data;
        setAppliedCoupon(couponData);
        setCouponInput("");
        toast.success(`Coupon "${couponData.code}" applied — ${currency} ${couponData.discountAmount.toLocaleString()} off!`);
      } else {
        toast.error(res?.error || "Invalid coupon code.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not validate coupon. Please try again.");
    } finally {
      setIsApplyingCoupon(false);
    }
  }

  function handleRemoveCoupon() {
    const code = appliedCoupon?.code;
    setAppliedCoupon(null);
    if (code) {
      toast.info(`Coupon "${code}" removed.`);
    }
  }

  async function handlePlaceOrder() {
    setSubmitError(null);

    if (cart.length === 0) {
      setSubmitError("Your cart is empty. Please add items before placing an order.");
      return;
    }

    const invalidItems = cart.filter(item => !item.productId || isNaN(item.productId));
    if (invalidItems.length > 0) {
      setSubmitError("One or more items in your cart are invalid. Please remove them and try again.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = generateIdempotencyKey();
    }

    try {
      const orderData = {
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.name,
          quantity: item.quantity,
          weight: item.weight,
        })),
        shippingAddress: fullAddress,
        idempotencyKey: idempotencyKeyRef.current,
        couponCode: appliedCoupon?.code ?? null,
      };

      const response: any = await api.post('/orders', orderData);
      const createdOrder = response?.data || response;
      clearCart();
      idempotencyKeyRef.current = null;

      const orderRef = encodeURIComponent(createdOrder?.orderNumber || createdOrder?.id || '');
      router.push(`/order-confirmed?ref=${orderRef}`);
    } catch (error: any) {
      console.error("Error placing order:", error);
      if (error instanceof ApiError) {
        switch (error.status) {
          case 400:
            setSubmitError(error.message || "Invalid order details. Please review and try again.");
            break;
          case 401:
            setSubmitError("Your session has expired. Please sign in again.");
            break;
          case 403:
            setSubmitError("You are not authorized to place this order.");
            break;
          case 409:
            setSubmitError(error.message || "Stock or conflict error. Please review your cart and try again.");
            break;
          case 404:
            setSubmitError("A product or customer record was not found.");
            break;
          default:
            setSubmitError(
              error.message ||
              `We couldn't place your order (server error). Please try again in a moment.`
            );
        }
      } else {
        setSubmitError(
          "A network error occurred. Please check your connection and try again."
        );
      }
      idempotencyKeyRef.current = null;
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleContinueToReview = () => {
    if (validateStep1()) {
      setSubmitError(null);
      setStep(2);
    }
  };

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-semibold mb-3">
              Purchase
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-semibold text-[#1c1917]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Checkout
            </h1>
          </div>

          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center gap-0">
              {getCheckoutSteps(t).map((s, i) => (
                <div key={s.num} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                        step > s.num
                          ? "bg-[#2d5a3d] text-white"
                          : step === s.num
                            ? "bg-[#2d5a3d] text-white ring-4 ring-[#2d5a3d]/20"
                            : "bg-white border-2 border-[rgba(28,25,23,0.15)] text-[#78746e]"
                      }`}
                    >
                      {step > s.num ? <Check className="h-5 w-5" /> : s.num}
                    </div>
                    <span
                      className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                        step >= s.num ? "text-[#2d5a3d]" : "text-[#78746e]"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < getCheckoutSteps(t).length - 1 && (
                    <div
                      className={`w-24 h-0.5 mb-5 mx-3 transition-all ${
                        step > s.num
                          ? "bg-[#2d5a3d]"
                          : "bg-[rgba(28,25,23,0.1)]"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {submitError && (
            <div className="max-w-7xl mx-auto mb-8">
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-800">
                    Could not place your order
                  </p>
                  <p className="text-sm text-red-700 mt-1 break-words">
                    {submitError}
                  </p>
                </div>
                <button
                  onClick={() => setSubmitError(null)}
                  className="text-red-500 hover:text-red-700 text-xs font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-[rgba(28,25,23,0.06)]">
              {step === 1 && (
                <div>
                  <h2
                    className="text-xl font-semibold text-[#1c1917] mb-7"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Delivery Information
                  </h2>
                  <div className="space-y-4">
                    <Field
                      label={t('checkout.fields.fullName')}
                      name="name"
                      placeholder={t('checkout.fields.fullNamePlaceholder')}
                      value={formData.name}
                      onChange={handleInputChange}
                      error={errors.name}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label={t('checkout.fields.emailAddress')}
                        name="email"
                        type="email"
                        placeholder="aarav@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        error={errors.email}
                      />
                      <Field
                        label={t('checkout.fields.phoneNumber')}
                        name="phone"
                        type="tel"
                        placeholder="+977 98XXXXXXXX"
                        value={formData.phone}
                        onChange={handleInputChange}
                        error={errors.phone}
                      />
                    </div>
                    <Field
                      label={t('checkout.fields.address')}
                      name="address"
                      placeholder={t('checkout.fields.addressPlaceholder')}
                      value={formData.address}
                      onChange={handleInputChange}
                      error={errors.address}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label={t('checkout.fields.city')}
                        name="city"
                        placeholder={t('checkout.fields.cityPlaceholder')}
                        value={formData.city}
                        onChange={handleInputChange}
                        error={errors.city}
                      />
                      <Field
                        label={t('checkout.fields.province')}
                        name="province"
                        placeholder={t('checkout.fields.provincePlaceholder')}
                        value={formData.province}
                        onChange={handleInputChange}
                        error={errors.province}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label={t('checkout.fields.postalCode')}
                        name="postal"
                        placeholder="44600 (optional)"
                        value={formData.postal}
                        onChange={handleInputChange}
                        error={errors.postal}
                        required={false}
                      />
                      <div>
                        <label className="block text-sm font-medium text-[#1c1917] mb-1.5">
                          Country<span className="text-red-500 ml-1">*</span>
                        </label>
                        <select
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl border border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] text-[#1c1917] focus:outline-none focus:border-[#2d5a3d] transition-colors text-sm cursor-pointer"
                        >
                          <option value="np">{t('checkout.countries.nepal')}</option>
                          <option value="in">{t('checkout.countries.india')}</option>
                          <option value="us">{t('checkout.countries.usa')}</option>
                          <option value="gb">UK</option>
                          <option value="au">{t('checkout.countries.australia')}</option>
                          <option value="other">{t('checkout.countries.other')}</option>
                        </select>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={saveAddress}
                          onChange={(e) => setSaveAddress(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            saveAddress
                              ? "bg-[#2d5a3d] border-[#2d5a3d]"
                              : "border-[rgba(28,25,23,0.2)] group-hover:border-[#2d5a3d]"
                          }`}
                        >
                          {saveAddress && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-[#78746e]">
                        Save this address for future orders
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={handleContinueToReview}
                    className="w-full mt-8 py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] transition-colors flex items-center justify-center gap-2"
                  >
                    Review Order
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="flex items-center gap-3 mb-7">
                    <button
                      onClick={() => setStep(1)}
                      className="text-sm text-[#78746e] hover:text-[#2d5a3d] transition-colors"
                    >
                      ← Back
                    </button>
                    <h2
                      className="text-xl font-semibold text-[#1c1917]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Review &amp; Place Order
                    </h2>
                  </div>

                  <div className="mb-6 rounded-2xl border border-[rgba(28,25,23,0.08)] overflow-hidden">
                    <div className="p-5 bg-[#f9f7f4] border-b border-[rgba(28,25,23,0.06)] flex items-center gap-3">
                      <User className="h-4 w-4 text-[#2d5a3d]" />
                      <h3 className="font-semibold text-[#1c1917] text-sm">
                        Delivery Details
                      </h3>
                    </div>
                    <div className="p-5 text-sm text-[#1c1917] space-y-1.5">
                      <p><span className="text-[#78746e] w-28 inline-block">{t('checkout.summary.nameLabel')}</span> {formData.name}</p>
                      <p><span className="text-[#78746e] w-28 inline-block">{t('checkout.summary.emailLabel')}</span> {formData.email}</p>
                      <p><span className="text-[#78746e] w-28 inline-block">{t('checkout.summary.phoneLabel')}</span> {formData.phone}</p>
                      <p className="leading-relaxed">
                        <span className="text-[#78746e] w-28 inline-block align-top">{t('checkout.summary.addressLabel')}</span>
                        {fullAddress}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 rounded-2xl border border-[rgba(28,25,23,0.08)] overflow-hidden">
                    <div className="p-5 bg-[#f9f7f4] border-b border-[rgba(28,25,23,0.06)] flex items-center gap-3">
                      <ShoppingBag className="h-4 w-4 text-[#2d5a3d]" />
                      <h3 className="font-semibold text-[#1c1917] text-sm">
                        Items ({cart.length})
                      </h3>
                    </div>
                    <div className="p-5 space-y-3">
                      {cart.map((item) => (
                        <div key={item.id + item.weight} className="flex items-center gap-3 text-sm">
                          <p className="flex-1 text-[#1c1917] truncate">
                            <span className="font-medium">{item.name}</span>
                            <span className="text-[#78746e] ml-2">{item.weight} × {item.quantity}</span>
                          </p>
                          <span className="font-semibold text-[#1c1917] shrink-0">
                            {currency}&nbsp;{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="mb-6 p-5 rounded-2xl border border-[#c8a96e]/30 bg-gradient-to-br from-[#fff9ee] to-[#fffdf6]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#c8a96e]/15 flex items-center justify-center shrink-0">
                        <QrCode className="h-5 w-5 text-[#8a6a2f]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1c1917] text-sm mb-1">
                          Payment by Bank / Wallet QR Transfer
                        </p>
                        <p className="text-xs text-[#6f5e3d] leading-relaxed">
                          After placing this order you will receive a confirmation screen with QR code and your
                          unique order number. Scan the QR with any bank app or digital wallet, make the transfer,
                          and mention your order number in the payment remark. Admin will verify and confirm shortly.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handlePlaceOrder}
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full py-4 bg-[#2d5a3d] text-white font-semibold rounded-xl hover:bg-[#234832] disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Placing Order…
                      </>
                    ) : (
                      <>
                        Place Order — {currency}&nbsp;{grandTotal.toLocaleString()}
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-center text-[#78746e] mt-4 flex items-center justify-center gap-1">
                    <span>🔒</span>
                    Pricing, tax, and totals are verified server-side before order creation.
                  </p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white p-7 rounded-2xl border border-[rgba(28,25,23,0.06)] sticky top-32">
                <h3
                  className="text-xl font-semibold text-[#1c1917] mb-6"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Order Summary
                </h3>

                {cart.length === 0 ? (
                  <p className="text-sm text-[#78746e]">{t('checkout.emptyCart')}</p>
                ) : (
                  <>
                    <div className="space-y-4 mb-5">
                      {cart.map((item) => (
                        <div
                          key={item.id + item.weight}
                          className="flex items-center gap-3"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-12 h-12 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-[#2d5a3d] flex items-center justify-center shrink-0">
                              <span className="text-white text-sm font-serif">
                                {item.name[0]}
                              </span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#1c1917] truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-[#78746e]">
                              {item.weight} × {item.quantity}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-[#1c1917] shrink-0">
                            {currency}&nbsp;
                            {(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="h-px bg-[rgba(28,25,23,0.08)] mb-4" />

                    {!appliedCoupon ? (
                      <form onSubmit={handleApplyCoupon} className="mb-5">
                        <label className="block text-xs font-semibold text-[#78746e] uppercase tracking-wider mb-2">
                          Coupon Code
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#78746e]/60" />
                            <input
                              type="text"
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="ENTER CODE"
                              disabled={isApplyingCoupon || cart.length === 0}
                              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[rgba(28,25,23,0.12)] bg-[#f9f7f4] text-[#1c1917] placeholder:text-[#78746e]/40 focus:outline-none focus:border-[#2d5a3d] text-sm font-medium tracking-wider disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={isApplyingCoupon || cart.length === 0 || !couponInput.trim()}
                            className="px-4 py-2.5 rounded-xl bg-[#2d5a3d] text-white text-sm font-semibold hover:bg-[#234832] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                          >
                            {isApplyingCoupon ? (
                              <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Applying…
                              </>
                            ) : (
                              'Apply'
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="mb-5 p-3 rounded-xl border border-[#2d5a3d]/20 bg-[#2d5a3d]/5">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-[#2d5a3d]" />
                            <span className="text-sm font-bold text-[#2d5a3d] tracking-wider">
                              {appliedCoupon.code}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="p-1 rounded-md text-[#78746e] hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Remove coupon"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-xs text-[#78746e]">
                          {appliedCoupon.discountType === 'percent'
                            ? `${appliedCoupon.discountValue}% off${appliedCoupon.maxDiscount > 0 ? ` (max ${currency} ${appliedCoupon.maxDiscount.toLocaleString()})` : ''}`
                            : `${currency} ${appliedCoupon.discountValue.toLocaleString()} off`}
                          {appliedCoupon.minOrderAmount > 0 && ` · Min ${currency} ${appliedCoupon.minOrderAmount.toLocaleString()}`}
                        </p>
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm text-[#78746e]">
                        <span>{t('dashboard.invoice.subtotal')}</span>
                        <span>{currency}&nbsp;{subtotal.toLocaleString()}</span>
                      </div>
                      {appliedCoupon && discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-[#2d5a3d] font-medium">
                          <span className="flex items-center gap-1">
                            Discount
                            <span className="text-[10px] uppercase tracking-wider text-[#2d5a3d]/70">({appliedCoupon.code})</span>
                          </span>
                          <span>− {currency}&nbsp;{discountAmount.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm text-[#78746e]">
                        <span>Tax ({taxRate}%)</span>
                        <span>{currency}&nbsp;{taxAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-[#78746e]">
                        <span>{t('cart.shipping')}</span>
                        <span className={shippingFlatRate > 0 ? "text-[#1c1917] font-semibold" : "text-[#2d5a3d] font-semibold"}>
                          {shippingFlatRate > 0 ? `${currency} ${shippingFlatRate.toLocaleString()}` : t('checkout.summary.free')}
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-[rgba(28,25,23,0.08)] mb-4" />

                    <div className="flex justify-between text-lg font-bold text-[#1c1917]">
                      <span>{t('dashboard.invoice.total')}</span>
                      <span>{currency}&nbsp;{grandTotal.toLocaleString()}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
