'use client';

import { useState } from "react";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { ArrowRight, Mail, Phone, MapPin, MessageSquare } from "lucide-react";

export default function Contact() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-[#f9f7f4]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
                Get in Touch
              </p>
              <h1
                className="text-[clamp(2rem,4vw,3rem)] leading-[1.1] font-semibold text-[#1c1917] mb-8"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                We'd Love to Hear From You
              </h1>

              <div className="space-y-6 mb-12">
                {[
                  { icon: Mail, title: t('contact.fields.email'), value: "support@godgifted.com" },
                  { icon: Phone, title: "Phone", value: "+977 1 234 567" },
                  { icon: MapPin, title: "Address", value: "Kathmandu, Nepal" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#2d5a3d]/10 flex items-center justify-center text-[#2d5a3d] shrink-0">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-[#1c1917]">{item.title}</p>
                      <p className="text-[#78746e]">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-white p-6 rounded-2xl border border-[rgba(28,25,23,0.06)]">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="h-6 w-6 text-[#2d5a3d]" />
                  <p className="font-semibold text-[#1c1917]">{t('footer.faq')}</p>
                </div>
                <div className="space-y-3 text-sm text-[#78746e]">
                  <p>• Shipping times and returns</p>
                  <p>• Brewing guides</p>
                  <p>• Wholesale inquiries</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-[rgba(28,25,23,0.06)]">
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[#2d5a3d] flex items-center justify-center mx-auto mb-6">
                    <svg className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-semibold text-[#1c1917] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                    Thank You!
                  </h3>
                  <p className="text-[#78746e]">{t('contact.responseNote')}</p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubmitted(true);
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-[#1c1917] mb-2">{t('common.name')}</label>
                    <input
                      required
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[rgba(28,25,23,0.1)] bg-[#f9f7f4] focus:outline-none focus:border-[#2d5a3d]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1c1917] mb-2">{t('dashboard.customers.email')}</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[rgba(28,25,23,0.1)] bg-[#f9f7f4] focus:outline-none focus:border-[#2d5a3d]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1c1917] mb-2">{t('contact.fields.subject')}</label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[rgba(28,25,23,0.1)] bg-[#f9f7f4] focus:outline-none focus:border-[#2d5a3d]"
                    >
                      <option value="">{t('contact.fields.selectTopic')}</option>
                      <option value="general">{t('contact.topics.generalInquiry')}</option>
                      <option value="order">{t('contact.topics.orderSupport')}</option>
                      <option value="himmat-tea">{t('contact.topics.himmatTeaInquiry')}</option>
                      <option value="godgifted-dal">{t('contact.topics.godgiftedDalInquiry')}</option>
                      <option value="wholesale">{t('nav.wholesale')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1c1917] mb-2">{t('contact.fields.message')}</label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[rgba(28,25,23,0.1)] bg-[#f9f7f4] focus:outline-none focus:border-[#2d5a3d]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#2d5a3d] text-white font-medium rounded-xl hover:bg-[#234832] transition-colors flex items-center justify-center gap-2"
                  >
                    Send Message
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
