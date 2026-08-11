'use client';

import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { Truck, RotateCcw, Clock, Mail } from "lucide-react";

const domesticRates = [
  {
    service: "Standard Delivery",
    timeframe: "3–5 business days",
    cost: "Rs. 150",
    note: "Free over Rs. 3,000",
  },
  {
    service: "Express Delivery",
    timeframe: "1–2 business days",
    cost: "Rs. 300",
    note: "Kathmandu Valley only",
  },
];

const internationalRates = [
  {
    region: "South Asia (India, Sri Lanka, Bangladesh)",
    timeframe: "10–14 business days",
    cost: "Rs. 800",
  },
  {
    region: "Asia Pacific (Singapore, Hong Kong, Australia)",
    timeframe: "14–21 business days",
    cost: "Rs. 1,500",
  },
  {
    region: "Rest of World (Europe, Americas, Middle East)",
    timeframe: "21–30 business days",
    cost: "Rs. 2,000",
  },
];

export default function ShippingReturns() {
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
              Policies
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Shipping & Returns
            </h1>
            <p className="text-[#444] leading-relaxed text-lg">
              We want your tea to arrive quickly and in perfect condition. Below
              you&apos;ll find full details on our delivery options and our returns
              process.
            </p>
          </div>

          <div className="space-y-10">
            {/* ── SHIPPING SECTION ── */}
            <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden">
              <div className="border-l-4 border-[#2d5a3d] p-8 lg:p-10">
                {/* Section Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[#2d5a3d]/10 flex items-center justify-center shrink-0">
                    <Truck className="h-6 w-6 text-[#2d5a3d]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-0.5">
                      Delivery
                    </p>
                    <h2
                      className="text-2xl font-semibold text-[#1c1917]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Shipping Information
                    </h2>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-10">
                  {/* Domestic */}
                  <div>
                    <h3 className="text-sm uppercase tracking-widest text-[#78746e] font-medium mb-5">
                      Nepal Domestic
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[rgba(28,25,23,0.08)]">
                            <th className="text-left py-3 pr-4 font-semibold text-[#1c1917]">
                              Service
                            </th>
                            <th className="text-left py-3 pr-4 font-semibold text-[#1c1917]">
                              Timeframe
                            </th>
                            <th className="text-left py-3 font-semibold text-[#1c1917]">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {domesticRates.map((row) => (
                            <tr
                              key={row.service}
                              className="border-b border-[rgba(28,25,23,0.05)] last:border-0"
                            >
                              <td className="py-3 pr-4">
                                <p className="font-medium text-[#1c1917]">
                                  {row.service}
                                </p>
                                <p className="text-[10px] text-[#c8a96e] mt-0.5">
                                  {row.note}
                                </p>
                              </td>
                              <td className="py-3 pr-4 text-[#444]">
                                {row.timeframe}
                              </td>
                              <td className="py-3 text-[#444]">{row.cost}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5 bg-[#f9f7f4] rounded-xl p-4 flex gap-3">
                      <Clock className="h-4 w-4 text-[#78746e] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#78746e] leading-relaxed">
                        Orders placed before{" "}
                        <strong className="text-[#1c1917]">3:00 PM NPT</strong>{" "}
                        on weekdays are dispatched the same day. Orders placed
                        on weekends or public holidays are dispatched on the
                        next business day.
                      </p>
                    </div>
                  </div>

                  {/* International */}
                  <div>
                    <h3 className="text-sm uppercase tracking-widest text-[#78746e] font-medium mb-5">
                      International
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b border-[rgba(28,25,23,0.08)]">
                            <th className="text-left py-3 pr-4 font-semibold text-[#1c1917]">
                              Region
                            </th>
                            <th className="text-left py-3 pr-4 font-semibold text-[#1c1917]">
                              Timeframe
                            </th>
                            <th className="text-left py-3 font-semibold text-[#1c1917]">
                              Cost
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {internationalRates.map((row) => (
                            <tr
                              key={row.region}
                              className="border-b border-[rgba(28,25,23,0.05)] last:border-0"
                            >
                              <td className="py-3 pr-4 text-[#444] leading-snug">
                                {row.region}
                              </td>
                              <td className="py-3 pr-4 text-[#444] whitespace-nowrap">
                                {row.timeframe}
                              </td>
                              <td className="py-3 text-[#444] whitespace-nowrap">
                                {row.cost}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-5 bg-[#f9f7f4] rounded-xl p-4">
                      <p className="text-xs text-[#78746e] leading-relaxed">
                        International delivery times are estimates and may vary
                        due to local customs processing. Import duties or taxes,
                        if applicable in your country, are the buyer&apos;s
                        responsibility. We ship with a declared customs value
                        matching the order total.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── RETURNS SECTION ── */}
            <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden">
              <div className="border-l-4 border-[#c8a96e] p-8 lg:p-10">
                {/* Section Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-[#c8a96e]/10 flex items-center justify-center shrink-0">
                    <RotateCcw className="h-6 w-6 text-[#c8a96e]" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-0.5">
                      Returns
                    </p>
                    <h2
                      className="text-2xl font-semibold text-[#1c1917]"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      Returns & Refunds
                    </h2>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-10">
                  {/* Policy Details */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-semibold text-[#1c1917] mb-2">
                        Return Window
                      </h3>
                      <p className="text-[#444] leading-relaxed text-sm">
                        You may return eligible items within{" "}
                        <strong>7 days</strong> of delivery. The return window
                        begins from the date shown on your delivery
                        confirmation.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#1c1917] mb-2">
                        Eligible Items
                      </h3>
                      <p className="text-[#444] leading-relaxed text-sm">
                        Items must be{" "}
                        <strong>
                          unopened and in their original, undamaged packaging
                        </strong>{" "}
                        to qualify for a return. We cannot accept returns on any
                        opened tea products for hygiene and food safety reasons.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#1c1917] mb-2">
                        Non-Returnable Items
                      </h3>
                      <ul className="space-y-1 text-sm text-[#444]">
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c8593a] mt-2 shrink-0" />
                          Opened tea products (any variety)
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c8593a] mt-2 shrink-0" />
                          Items marked as &quot;Final Sale&quot;
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#c8593a] mt-2 shrink-0" />
                          Gift cards and subscription payments
                        </li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold text-[#1c1917] mb-2">
                        Refund Timeline
                      </h3>
                      <p className="text-[#444] leading-relaxed text-sm">
                        Once we receive and inspect your return, refunds are
                        processed within <strong>5–7 business days</strong> to
                        your original payment method. eSewa and Khalti refunds
                        may take an additional 1–2 business days to appear in
                        your wallet.
                      </p>
                    </div>
                  </div>

                  {/* How to Return */}
                  <div>
                    <h3 className="font-semibold text-[#1c1917] mb-5">
                      How to Initiate a Return
                    </h3>
                    <ol className="space-y-5">
                      {[
                        {
                          n: "1",
                          title: "Contact Us",
                          body: "Email hello@himmattea.com with your order number, the item(s) you wish to return, and the reason for return.",
                        },
                        {
                          n: "2",
                          title: "Receive Instructions",
                          body: "We will reply within 1 business day with return approval and instructions. Do not send items before receiving approval.",
                        },
                        {
                          n: "3",
                          title: "Ship the Item",
                          body: "Pack the item securely in its original packaging. Return shipping costs are the customer's responsibility unless the item was damaged or incorrectly sent.",
                        },
                        {
                          n: "4",
                          title: "Refund Issued",
                          body: "Once we receive and verify the return, your refund will be processed within 5–7 business days.",
                        },
                      ].map((step) => (
                        <li key={step.n} className="flex gap-4">
                          <div className="w-7 h-7 rounded-full bg-[#2d5a3d] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {step.n}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1c1917] mb-1 text-sm">
                              {step.title}
                            </p>
                            <p className="text-[#78746e] text-sm leading-relaxed">
                              {step.body}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-8 bg-[#f9f7f4] rounded-xl p-4 flex gap-3">
                      <Mail className="h-4 w-4 text-[#2d5a3d] shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-[#1c1917] mb-0.5">
                          Return inquiries
                        </p>
                        <a
                          href="mailto:hello@himmattea.com"
                          className="text-xs text-[#2d5a3d] hover:underline"
                        >
                          hello@himmattea.com
                        </a>
                        <p className="text-xs text-[#78746e] mt-0.5">
                          Please include your order number in the subject line.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Damaged / Wrong Items */}
            <div className="bg-[#2d5a3d] rounded-2xl p-8 lg:p-10">
              <h3
                className="text-lg font-semibold text-white mb-3"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Received a damaged or incorrect item?
              </h3>
              <p className="text-white/80 leading-relaxed text-sm mb-5 max-w-2xl">
                If your order arrives damaged or we sent the wrong item, we
                sincerely apologise. Please email us at{" "}
                <a
                  href="mailto:hello@himmattea.com"
                  className="text-[#c8a96e] hover:underline"
                >
                  hello@himmattea.com
                </a>{" "}
                within 48 hours of delivery with a photo of the damage or
                incorrect item. We will arrange a replacement or full refund at
                no cost to you.
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
