'use client';

import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";

const lastUpdated = "July 2026";

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: { id: string; title: string }[] = [
  { id: "information-we-collect", title: "Information We Collect" },
  { id: "how-we-use-your-data", title: "How We Use Your Data" },
  { id: "cookies", title: "Cookies & Tracking" },
  { id: "third-parties", title: "Third-Party Services" },
  { id: "data-retention", title: "Data Retention" },
  { id: "your-rights", title: "Your Rights" },
  { id: "contact", title: "Contact Us" },
];

export default function PrivacyPolicy() {
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
              Privacy Policy
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
            <div className="lg:col-span-3 space-y-10">
              <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10">
                <p className="text-[#444] leading-relaxed">
                  Godgifted (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting
                  your personal information. This Privacy Policy explains what
                  data we collect when you visit our website or make a purchase,
                  how we use it, and what rights you have. By using our website,
                  you agree to the practices described in this policy.
                </p>
              </div>

              {/* Section 1 */}
              <div
                id="information-we-collect"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  1. Information We Collect
                </h2>
                <p className="text-[#444] leading-relaxed mb-5">
                  We collect information you provide directly to us when you
                  create an account, place an order, or contact us. This
                  includes:
                </p>
                <div className="space-y-4">
                  {[
                    {
                      title: "Identity & Contact Information",
                      body: "Your full name, email address, phone number, and billing/shipping address — collected when you create an account or complete a purchase.",
                    },
                    {
                      title: "Payment Information",
                      body: "Credit or debit card details, eSewa/Khalti wallet identifiers, and transaction references. We do not store full payment card numbers on our servers. Payment processing is handled by certified third-party processors.",
                    },
                    {
                      title: "Order Information",
                      body: "Details of the products you purchase, order value, delivery address, and order history.",
                    },
                    {
                      title: "Communications",
                      body: "Any messages you send us via email, contact forms, or customer support channels.",
                    },
                    {
                      title: "Usage Data",
                      body: "IP address, browser type, pages visited, time on site, referral URLs, and device information — collected automatically when you browse our website.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a3d] mt-2.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-[#1c1917] text-sm mb-0.5">
                          {item.title}
                        </p>
                        <p className="text-[#78746e] text-sm leading-relaxed">
                          {item.body}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 2 */}
              <div
                id="how-we-use-your-data"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  2. How We Use Your Data
                </h2>
                <p className="text-[#444] leading-relaxed mb-5">
                  We use the information we collect for the following purposes:
                </p>
                <ul className="space-y-3">
                  {[
                    "To process and fulfil your orders, including sending order confirmations, shipping updates, and delivery notifications.",
                    "To manage your customer account and maintain your order history.",
                    "To communicate with you in response to enquiries, returns, or support requests.",
                    "To send you marketing emails about new products, promotions, and brewing guides — only if you have opted in. You can unsubscribe from marketing emails at any time by clicking the unsubscribe link in any email or by emailing support@godgifted.com.",
                    "To improve our website, product offerings, and customer experience through analysis of aggregate usage data.",
                    "To comply with our legal obligations under Nepalese law.",
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a3d] mt-2.5 shrink-0" />
                      <p className="text-[#78746e] text-sm leading-relaxed">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 bg-[#f9f7f4] rounded-xl p-4">
                  <p className="text-xs text-[#78746e] leading-relaxed">
                    <strong className="text-[#1c1917]">
                      Marketing opt-out:
                    </strong>{" "}
                    We will never sell your email address or personal data to
                    third parties for marketing purposes. If you have opted into
                    our newsletter, you can opt out at any time via the
                    unsubscribe link in any marketing email.
                  </p>
                </div>
              </div>

              {/* Section 3 */}
              <div
                id="cookies"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  3. Cookies & Tracking
                </h2>
                <p className="text-[#444] leading-relaxed mb-5">
                  Our website uses cookies — small text files stored on your
                  device — to improve your browsing experience and help us
                  understand how visitors use our site.
                </p>
                <div className="space-y-4">
                  {[
                    {
                      type: "Essential Cookies",
                      desc: "Required for the website to function. These include your session cookie, shopping cart contents, and login state. These cannot be disabled.",
                    },
                    {
                      type: "Analytics Cookies",
                      desc: "We use anonymised analytics to understand page traffic and user behaviour. This data never identifies you individually and is used only to improve our site.",
                    },
                    {
                      type: "Preference Cookies",
                      desc: "Used to remember your preferences, such as language selection, so you don't need to set them each visit.",
                    },
                  ].map((c) => (
                    <div key={c.type} className="bg-[#f9f7f4] rounded-xl p-4">
                      <p className="font-semibold text-[#1c1917] text-sm mb-1">
                        {c.type}
                      </p>
                      <p className="text-[#78746e] text-sm leading-relaxed">
                        {c.desc}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[#78746e] text-sm leading-relaxed mt-5">
                  You can control or disable non-essential cookies through your
                  browser settings at any time.
                </p>
              </div>

              {/* Section 4 */}
              <div
                id="third-parties"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  4. Third-Party Services
                </h2>
                <p className="text-[#444] leading-relaxed mb-5">
                  We work with a limited number of trusted third-party services
                  to operate our business. Each receives only the data necessary
                  for the function they perform:
                </p>
                <ul className="space-y-3">
                  {[
                    "Payment processors (eSewa, Khalti, and credit card processors) — receive your payment details to process transactions. They are PCI-DSS compliant and subject to their own privacy policies.",
                    "Shipping and logistics partners — receive your name and delivery address to fulfil your order.",
                    "Email service providers — used to send transactional and marketing emails on our behalf.",
                    "Web hosting and cloud infrastructure providers — store website data and serve pages to your browser.",
                  ].map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#c8a96e] mt-2.5 shrink-0" />
                      <p className="text-[#78746e] text-sm leading-relaxed">
                        {item}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-[#78746e] text-sm leading-relaxed mt-5">
                  We do not sell, rent, or share your personal information with
                  any third party for their own marketing purposes.
                </p>
              </div>

              {/* Section 5 */}
              <div
                id="data-retention"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  5. Data Retention
                </h2>
                <p className="text-[#444] leading-relaxed mb-4">
                  We retain your personal data only for as long as necessary to
                  fulfil the purposes described in this policy, or as required
                  by law:
                </p>
                <ul className="space-y-2 text-sm text-[#78746e]">
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a3d] mt-2 shrink-0" />
                    Order and transaction records are kept for 7 years in
                    accordance with Nepalese tax and accounting regulations.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a3d] mt-2 shrink-0" />
                    Account information is retained while your account is
                    active. If you close your account, we delete your personal
                    data within 90 days, except where retention is required by
                    law.
                  </li>
                  <li className="flex gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a3d] mt-2 shrink-0" />
                    Marketing opt-in records are retained until you unsubscribe.
                  </li>
                </ul>
              </div>

              {/* Section 6 */}
              <div
                id="your-rights"
                className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-[#1c1917] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  6. Your Rights
                </h2>
                <p className="text-[#444] leading-relaxed mb-5">
                  You have the following rights regarding your personal data:
                </p>
                <div className="space-y-4">
                  {[
                    {
                      right: "Right to Access",
                      desc: "You may request a copy of the personal data we hold about you.",
                    },
                    {
                      right: "Right to Correction",
                      desc: "You may ask us to correct any inaccurate or incomplete data.",
                    },
                    {
                      right: "Right to Deletion",
                      desc: "You may request that we delete your personal data, subject to any legal retention requirements.",
                    },
                    {
                      right: "Right to Withdraw Consent",
                      desc: "Where you have consented to processing (e.g. marketing emails), you may withdraw that consent at any time.",
                    },
                    {
                      right: "Right to Complain",
                      desc: "You have the right to raise a concern with the relevant data protection authority in Nepal.",
                    },
                  ].map((item) => (
                    <div key={item.right} className="flex gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2d5a3d] mt-2.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-[#1c1917] text-sm mb-0.5">
                          {item.right}
                        </p>
                        <p className="text-[#78746e] text-sm leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[#78746e] text-sm leading-relaxed mt-5">
                  To exercise any of these rights, please contact us at{" "}
                  <a
                    href="mailto:support@godgifted.com"
                    className="text-[#2d5a3d] hover:underline"
                  >
                    support@godgifted.com
                  </a>
                  . We will respond within 30 days.
                </p>
              </div>

              {/* Section 7 */}
              <div
                id="contact"
                className="bg-[#2d5a3d] rounded-2xl p-8 lg:p-10"
              >
                <h2
                  className="text-xl font-semibold text-white mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  7. Contact Us
                </h2>
                <p className="text-white/80 leading-relaxed mb-4">
                  If you have questions about this Privacy Policy or wish to
                  exercise your data rights, please contact our team:
                </p>
                <div className="space-y-2 text-sm text-white/80">
                  <p>
                    <strong className="text-white">Email:</strong>{" "}
                    <a
                      href="mailto:support@godgifted.com"
                      className="text-[#c8a96e] hover:underline"
                    >
                      support@godgifted.com
                    </a>
                  </p>
                  <p>
                    <strong className="text-white">Address:</strong> Godgifted,
                    Kathmandu, Nepal
                  </p>
                </div>
                <p className="text-white/60 text-xs leading-relaxed mt-6">
                  We may update this Privacy Policy from time to time. When we
                  do, we will revise the &quot;Last updated&quot; date at the top of this
                  page. Continued use of our website after changes are posted
                  constitutes your acceptance of the updated policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
