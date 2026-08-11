'use client';

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion";
import { MessageCircle } from "lucide-react";

type Category =
  | "All"
  | "Orders & Shipping"
  | "Products & Brewing"
  | "Subscriptions"
  | "Wholesale";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: Exclude<Category, "All">;
}

const faqs: FAQItem[] = [
  // Orders & Shipping
  {
    id: "os-1",
    question: "How long does domestic shipping take in Nepal?",
    answer:
      "Orders within Nepal are delivered in 3–5 business days. We ship from Kathmandu and cover all major cities and towns. Remote areas may take an additional 1–2 days.",
    category: "Orders & Shipping",
  },
  {
    id: "os-2",
    question: "Do you ship internationally?",
    answer:
      "Yes! We ship worldwide. International delivery typically takes 10–14 business days depending on your location and local customs processing. You will receive a tracking number once your order is dispatched.",
    category: "Orders & Shipping",
  },
  {
    id: "os-3",
    question: "Is there a free shipping threshold?",
    answer:
      "Domestic orders over Rs. 3,000 qualify for free standard shipping within Nepal. International orders do not currently qualify for free shipping, but we offer competitive flat rates by region.",
    category: "Orders & Shipping",
  },
  {
    id: "os-4",
    question: "What is your return policy?",
    answer:
      "We accept returns within 7 days of delivery. Items must be unopened and in their original packaging. To initiate a return, contact us at hello@himmattea.com with your order number. Opened tea products cannot be returned for hygiene reasons.",
    category: "Orders & Shipping",
  },
  {
    id: "os-5",
    question: "What payment methods do you accept?",
    answer:
      "We accept eSewa, Khalti, major credit and debit cards (Visa, Mastercard), and Cash on Delivery (COD) for domestic Nepal orders. All online transactions are secured with SSL encryption.",
    category: "Orders & Shipping",
  },
  // Products & Brewing
  {
    id: "pb-1",
    question: "What is the shelf life of your teas?",
    answer:
      "All our teas have a shelf life of 2 years when stored sealed and away from direct sunlight, heat, and moisture. Once opened, we recommend consuming within 6 months for the best flavour and aroma. Store in an airtight container away from strong odours.",
    category: "Products & Brewing",
  },
  {
    id: "pb-2",
    question: "Are your teas organically certified?",
    answer:
      "Many of our single-origin teas are sourced from certified organic estates in the Ilam and Kanchanjangha regions of Nepal. Products with organic certification are clearly labelled on their product pages. We are actively expanding our certified organic range.",
    category: "Products & Brewing",
  },
  {
    id: "pb-3",
    question: "What is the correct brewing temperature for different teas?",
    answer:
      "Temperature varies by tea type: Green tea brews best at 70–80°C to avoid bitterness. White tea prefers 75–85°C. Oolong is ideal at 85–95°C. Black tea and Pu-erh use fully boiling water at 95–100°C. Herbal tisanes also use 100°C. Visit our Brewing Guides for step-by-step instructions.",
    category: "Products & Brewing",
  },
  {
    id: "pb-4",
    question: "How do I store loose leaf tea properly?",
    answer:
      "Store loose leaf tea in an opaque, airtight container at room temperature. Keep it away from light, moisture, strong odours (like spices or coffee), and heat sources. Avoid refrigerating tea unless it is in a completely airtight, moisture-proof container.",
    category: "Products & Brewing",
  },
  // Subscriptions
  {
    id: "sub-1",
    question: "Can I cancel my subscription at any time?",
    answer:
      "Yes, you can cancel your subscription at any time from your account dashboard. Cancellations made before your next billing date will take effect immediately, and no further charges will be made. There are no cancellation fees.",
    category: "Subscriptions",
  },
  {
    id: "sub-2",
    question: "Can I pause or skip a delivery?",
    answer:
      "Absolutely. Log in to your account and navigate to Subscription Settings to pause for up to 3 months or skip your next delivery. Pause or skip requests must be made at least 48 hours before your scheduled dispatch date.",
    category: "Subscriptions",
  },
  {
    id: "sub-3",
    question: "How do I change my subscription frequency?",
    answer:
      "You can switch between monthly and quarterly billing from your account dashboard at any time. Changes take effect from your next billing cycle. Quarterly subscribers enjoy a 10% discount off the monthly rate.",
    category: "Subscriptions",
  },
  // Wholesale
  {
    id: "ws-1",
    question: "What is the minimum order for wholesale?",
    answer:
      "Our wholesale minimum order is Rs. 10,000. We offer tiered pricing discounts for larger volumes. To get started, fill out the wholesale inquiry form on our Wholesale page or email us at hello@himmattea.com.",
    category: "Wholesale",
  },
  {
    id: "ws-2",
    question: "What is the lead time for wholesale orders?",
    answer:
      "Standard wholesale orders are processed within 5–7 business days. For large or custom orders, lead time may extend to 2–3 weeks. We recommend placing orders well in advance for seasonal promotions or events.",
    category: "Wholesale",
  },
  {
    id: "ws-3",
    question: "Do you offer custom packaging for wholesale buyers?",
    answer:
      "Yes. We offer custom labelling and packaging for wholesale partners ordering above a minimum quantity. Options include custom printed tins, pouches with your branding, and gift sets. Contact us to discuss your requirements and receive a quote.",
    category: "Wholesale",
  },
];

const categories: Category[] = [
  "All",
  "Orders & Shipping",
  "Products & Brewing",
  "Subscriptions",
  "Wholesale",
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  const filtered =
    activeCategory === "All"
      ? faqs
      : faqs.filter((f) => f.category === activeCategory);

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
              Support
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Frequently Asked Questions
            </h1>
            <p className="text-[#444] leading-relaxed text-lg">
              Everything you need to know about ordering, brewing,
              subscriptions, and more. Can&apos;t find what you&apos;re looking for? We&apos;re
              always happy to help.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-10">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                  activeCategory === cat
                    ? "bg-[#2d5a3d] text-white border-[#2d5a3d]"
                    : "bg-white text-[#1c1917] border-[rgba(28,25,23,0.12)] hover:bg-[#f0ede8]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* FAQ Accordion */}
          <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6 lg:p-8 mb-12">
            {activeCategory === "All" ? (
              // Group by category when "All" is selected
              <div className="space-y-10">
                {(
                  [
                    "Orders & Shipping",
                    "Products & Brewing",
                    "Subscriptions",
                    "Wholesale",
                  ] as Exclude<Category, "All">[]
                ).map((cat) => {
                  const items = faqs.filter((f) => f.category === cat);
                  return (
                    <div key={cat}>
                      <h2 className="text-sm uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                        {cat}
                      </h2>
                      <Accordion type="single" collapsible className="w-full">
                        {items.map((faq) => (
                          <AccordionItem key={faq.id} value={faq.id}>
                            <AccordionTrigger className="text-base font-medium text-[#1c1917] hover:no-underline hover:text-[#2d5a3d] py-5">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-[#444] leading-relaxed text-base pb-5">
                              {faq.answer}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filtered.map((faq) => (
                  <AccordionItem key={faq.id} value={faq.id}>
                    <AccordionTrigger className="text-base font-medium text-[#1c1917] hover:no-underline hover:text-[#2d5a3d] py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-[#444] leading-relaxed text-base pb-5">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          {/* Still have questions CTA */}
          <div className="bg-[#2d5a3d] rounded-2xl p-8 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <MessageCircle className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3
                  className="text-xl font-semibold text-white mb-1"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Still have questions?
                </h3>
                <p className="text-white/75 text-sm leading-relaxed">
                  Our team is available Monday–Friday, 9am–6pm NPT. We typically
                  respond within a few hours.
                </p>
              </div>
            </div>
            <Link
              href="/contact"
              className="shrink-0 bg-white text-[#2d5a3d] hover:bg-[#f0ede8] rounded-xl px-6 py-3 font-medium transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
