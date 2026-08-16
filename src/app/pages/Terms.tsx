'use client';

import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";

import { useTranslation } from '../../context/TranslationContext';
const lastUpdated = "July 2026";

const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "products-pricing", title: "Products & Pricing" },
  { id: "order-acceptance", title: "Order Acceptance" },
  { id: "payment", title: "Payment" },
  { id: "shipping-delivery", title: "Shipping & Delivery" },
  { id: "returns-refunds", title: "Returns & Refunds" },
  { id: "intellectual-property", title: "Intellectual Property" },
  { id: "limitation-of-liability", title: "Limitation of Liability" },
  { id: "governing-law", title: "Governing Law" },
  { id: "contact", title: "Contact" },
];

export default function Terms() {
  const { t } = useTranslation();

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Page Header */}
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              Legal
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Terms of Service
            </h1>
            <p className="text-[#78746e] text-sm">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-12">
            {/* Sidebar Navigation */}
            <aside className="lg:col-span-1">
              <div className="sticky top-32 bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6">
                <p className="text-xs uppercase tracking-widest text-[#78746e] font-medium mb-4">
                  Contents
                </p>
                <nav className="space-y-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block py-1.5 text-sm text-[#78746e] hover:text-[#2d5a3d] transition-colors"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-8">
              {/* Intro */}
              <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10">
                <p className="text-[#444] leading-relaxed">
                  These Terms of Service (&quot;Terms&quot;) govern your use of the Godgifted
                  website located at godgifted.com and the purchase of
                  products from Godgifted (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). Please read
                  these Terms carefully before placing an order. By using our
                  website or completing a purchase, you confirm that you have
                  read, understood, and agree to be bound by these Terms.
                </p>
              </div>

              {/* Section 1 */}
              <div
                id="acceptance"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  1. Acceptance of Terms
                </h2>
                <p className="text-[#78746e] leading-relaxed text-sm mb-3">
                  By accessing or using the Godgifted website, placing an
                  order, or creating an account, you agree to these Terms in
                  full. If you do not agree with any part of these Terms, you
                  must not use our website or services.
                </p>
                <p className="text-[#78746e] leading-relaxed text-sm">
                  We reserve the right to update or modify these Terms at any
                  time without prior notice. The updated Terms will be posted on
                  this page with a revised &quot;Last updated&quot; date. Your continued
                  use of our website after any changes constitutes acceptance of
                  the new Terms.
                </p>
              </div>

              {/* Section 2 */}
              <div
                id="products-pricing"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  2. Products & Pricing
                </h2>
                <div className="space-y-3 text-[#78746e] text-sm leading-relaxed">
                  <p>
                    All prices on the Godgifted website are displayed in
                    Nepalese Rupees (Rs. NPR) unless otherwise stated. Prices
                    are inclusive of applicable taxes unless indicated.
                  </p>
                  <p>
                    We reserve the right to change prices at any time without
                    notice. Price changes will not affect orders that have
                    already been confirmed.
                  </p>
                  <p>
                    Product descriptions, images, and specifications are
                    provided in good faith. While we make every effort to
                    display products accurately, slight variations in colour,
                    packaging, or appearance may occur between the product image
                    and the physical product received.
                  </p>
                  <p>
                    We reserve the right to limit quantities of any product and
                    to discontinue products at any time. All products are
                    subject to availability.
                  </p>
                </div>
              </div>

              {/* Section 3 */}
              <div
                id="order-acceptance"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  3. Order Acceptance
                </h2>
                <div className="space-y-3 text-[#78746e] text-sm leading-relaxed">
                  <p>
                    Placing an order on our website constitutes an offer to
                    purchase the selected products. We reserve the right to
                    accept or decline any order at our discretion.
                  </p>
                  <p>
                    An order is not confirmed until you receive an order
                    confirmation email from us. If we are unable to fulfil your
                    order — for example due to stock unavailability, a pricing
                    error, or a payment issue — we will notify you promptly and
                    issue a full refund if payment has already been taken.
                  </p>
                  <p>
                    We reserve the right to cancel orders that appear to be
                    fraudulent, placed in bad faith, or that violate these
                    Terms.
                  </p>
                </div>
              </div>

              {/* Section 4 */}
              <div
                id="payment"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  4. Payment
                </h2>
                <div className="space-y-3 text-[#78746e] text-sm leading-relaxed">
                  <p>
                    We accept payment via eSewa, Khalti, major credit and debit
                    cards (Visa, Mastercard), and Cash on Delivery (COD) for
                    eligible domestic Nepal orders.
                  </p>
                  <p>
                    All online payments are processed securely through certified
                    third-party payment processors. We do not store your full
                    card details on our servers.
                  </p>
                  <p>
                    By submitting a payment, you confirm that you are authorised
                    to use the payment method provided. If a payment is declined
                    or reversed after your order has been dispatched, we reserve
                    the right to pursue recovery of the outstanding amount.
                  </p>
                  <p>
                    For Cash on Delivery orders, payment must be made in full
                    upon delivery. We reserve the right to withdraw the COD
                    option for customers who have previously refused or failed
                    to complete COD payments.
                  </p>
                </div>
              </div>

              {/* Section 5 */}
              <div
                id="shipping-delivery"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  5. Shipping & Delivery
                </h2>
                <div className="space-y-3 text-[#78746e] text-sm leading-relaxed">
                  <p>
                    Domestic Nepal orders are delivered within 3–5 business days
                    for standard shipping (Rs. 150) and 1–2 business days for
                    express shipping (Rs. 300). Free standard shipping is
                    available on domestic orders over Rs. 3,000.
                  </p>
                  <p>
                    International delivery times and rates vary by region.
                    Please refer to our{" "}
                    <Link
                      href="/shipping-returns"
                      className="text-[#2d5a3d] hover:underline"
                    >
                      Shipping & Returns page
                    </Link>{" "}
                    for full details.
                  </p>
                  <p>
                    Delivery estimates are provided in good faith but are not
                    guaranteed. We are not responsible for delays caused by
                    third-party carriers, customs processing, adverse weather,
                    or other circumstances beyond our control.
                  </p>
                  <p>
                    Risk of loss and title for purchased items pass to you upon
                    delivery to the carrier. International customers are
                    responsible for any import duties, taxes, or customs fees
                    applicable in their country.
                  </p>
                </div>
              </div>

              {/* Section 6 */}
              <div
                id="returns-refunds"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  6. Returns & Refunds
                </h2>
                <p className="text-[#78746e] leading-relaxed text-sm mb-3">
                  Our returns and refunds policy is detailed in full on our{" "}
                  <Link
                    href="/shipping-returns"
                    className="text-[#2d5a3d] hover:underline"
                  >
                    Shipping & Returns page
                  </Link>
                  . In summary:
                </p>
                <ul className="space-y-2 text-sm text-[#78746e]">
                  {[
                    "Returns are accepted within 7 days of delivery for unopened, undamaged products in original packaging.",
                    "Opened tea products cannot be returned for food hygiene reasons.",
                    "Refunds are processed within 5–7 business days of receiving the returned item.",
                    "Items marked as Final Sale are non-refundable.",
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a3d] mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Section 7 */}
              <div
                id="intellectual-property"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  7. Intellectual Property
                </h2>
                <div className="space-y-3 text-[#78746e] text-sm leading-relaxed">
                  <p>
                    All content on the Godgifted website — including text,
                    photographs, logos, brand names, product descriptions,
                    brewing guides, and design elements — is the intellectual
                    property of Godgifted or its licensors and is protected by
                    applicable copyright and trademark laws.
                  </p>
                  <p>
                    You may not copy, reproduce, distribute, publish, display,
                    modify, or create derivative works from any content on this
                    website without our prior written consent, except for
                    personal, non-commercial use.
                  </p>
                  <p>
                    The Godgifted name, logo, and related marks are trademarks
                    of Godgifted. You may not use them without our explicit
                    written permission.
                  </p>
                </div>
              </div>

              {/* Section 8 */}
              <div
                id="limitation-of-liability"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  8. Limitation of Liability
                </h2>
                <div className="space-y-3 text-[#78746e] text-sm leading-relaxed">
                  <p>
                    To the fullest extent permitted by law, Godgifted shall not
                    be liable for any indirect, incidental, special,
                    consequential, or punitive damages arising from your use of
                    our website, the purchase of products, or reliance on any
                    information provided on our website.
                  </p>
                  <p>
                    Our total liability to you in connection with any claim
                    arising from these Terms or your purchase of products shall
                    not exceed the total amount paid by you for the order giving
                    rise to the claim.
                  </p>
                  <p>
                    Nothing in these Terms limits our liability for death or
                    personal injury caused by our negligence, or for any matter
                    for which it would be unlawful for us to exclude or restrict
                    liability.
                  </p>
                  <p>
                    We make no warranty that our website will be error-free,
                    uninterrupted, or free from viruses or other harmful
                    components, though we take reasonable measures to ensure its
                    security and reliability.
                  </p>
                </div>
              </div>

              {/* Section 9 */}
              <div
                id="governing-law"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  9. Governing Law
                </h2>
                <div className="space-y-3 text-[#78746e] text-sm leading-relaxed">
                  <p>
                    These Terms shall be governed by and construed in accordance
                    with the laws of Nepal, without regard to its conflict of
                    law provisions.
                  </p>
                  <p>
                    Any dispute arising from or in connection with these Terms,
                    or a purchase from Godgifted, shall be subject to the
                    exclusive jurisdiction of the courts of Nepal. We will,
                    however, always attempt to resolve disputes amicably before
                    resorting to formal legal proceedings.
                  </p>
                </div>
              </div>

              {/* Section 10 */}
              <div
                id="contact"
                className="bg-[#2d5a3d] rounded-2xl p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-white mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  10. Contact
                </h2>
                <p className="text-white/80 leading-relaxed text-sm mb-4">
                  If you have any questions about these Terms of Service, please
                  contact us:
                </p>
                <div className="space-y-2 text-sm text-white/80">
                  <p>
                    <strong className="text-white">{t('checkout.summary.emailLabel')}</strong>{" "}
                    <a
                      href="mailto:support@godgifted.com"
                      className="text-[#c8a96e] hover:underline"
                    >
                      support@godgifted.com
                    </a>
                  </p>
                  <p>
                    <strong className="text-white">{t('checkout.summary.addressLabel')}</strong> Godgifted,
                    Kathmandu, Nepal
                  </p>
                </div>
                <div className="mt-6 pt-6 border-t border-white/20 flex flex-wrap gap-4 text-xs text-white/60">
                  <Link
                    href="/privacy-policy"
                    className="hover:text-white transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  <Link
                    href="/shipping-returns"
                    className="hover:text-white transition-colors"
                  >
                    Shipping & Returns
                  </Link>
                  <Link
                    href="/faq"
                    className="hover:text-white transition-colors"
                  >
                    FAQ
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
