'use client';

import { useState } from "react";
import Link from "next/link";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { useStore } from "@/context/StoreContext";
import { ArrowRight, Clock, Calendar } from "lucide-react";

const categories = ["All", "Brewing", "Origins", "Wellness", "Culture"];

export default function Blog() {
  const { t } = useTranslation();
  const { blogPosts } = useStore();
  const [activeCategory, setActiveCategory] = useState("All");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const filtered = activeCategory === "All" ? blogPosts : blogPosts.filter((p) => p.category === activeCategory);

  const [featured, ...rest] = filtered;

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Page Header */}
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              The Tea Blog
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Stories, Guides, and News
            </h1>
            <p className="text-xl text-[#78746e] max-w-xl mx-auto">
              Brewing wisdom, origin stories, and the culture of tea — from our
              garden to your cup.
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center mb-14">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-[#2d5a3d] text-white"
                    : "bg-white border border-[rgba(28,25,23,0.1)] text-[#78746e] hover:bg-[#f0ede8]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-[#78746e] py-16 text-lg">
              No posts in this category yet. Check back soon!
            </p>
          ) : (
            <>
              {/* Featured Post */}
              {featured && (
                <article className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden group mb-10">
                  <div className="grid lg:grid-cols-2">
                    <div className="h-64 lg:h-auto overflow-hidden">
                      <img
                        src={featured.image}
                        alt={featured.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="p-8 lg:p-12 flex flex-col justify-center">
                      <span className="inline-block px-3 py-1 bg-[#f0ede8] text-[#2d5a3d] text-xs font-semibold rounded-full uppercase tracking-widest mb-4 w-fit">
                        {featured.category}
                      </span>
                      <Link href={`/blog/${featured.slug}`}>
                        <h2
                          className="text-[clamp(1.5rem,2.5vw,2.25rem)] font-semibold text-[#1c1917] mb-4 group-hover:text-[#2d5a3d] transition-colors leading-tight"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {featured.title}
                        </h2>
                      </Link>
                      <p className="text-[#78746e] leading-relaxed mb-6 text-lg">
                        {featured.excerpt}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-[#78746e] mb-6">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {featured.date}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {featured.readTime}
                        </span>
                      </div>
                      <Link
                        href={`/blog/${featured.slug}`}
                        className="inline-flex items-center gap-2 text-[#2d5a3d] font-semibold hover:gap-3 transition-all"
                      >
                        Read Article
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              )}

              {/* Remaining Posts Grid */}
              {rest.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                  {rest.map((post) => (
                    <article
                      key={post.id}
                      className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] overflow-hidden group"
                    >
                      <div className="h-48 overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6">
                        <span className="inline-block px-2.5 py-1 bg-[#f0ede8] text-[#2d5a3d] text-xs font-semibold rounded-full uppercase tracking-widest mb-3">
                          {post.category}
                        </span>
                        <Link href={`/blog/${post.slug}`}>
                          <h2
                            className="text-xl font-semibold text-[#1c1917] mb-3 group-hover:text-[#2d5a3d] transition-colors leading-snug"
                            style={{ fontFamily: "'Playfair Display', serif" }}
                          >
                            {post.title}
                          </h2>
                        </Link>
                        <p className="text-sm text-[#78746e] leading-relaxed mb-4">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-[#78746e]">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {post.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {post.readTime}
                            </span>
                          </div>
                          <Link
                            href={`/blog/${post.slug}`}
                            className="inline-flex items-center gap-1 text-[#2d5a3d] font-medium text-sm hover:gap-2 transition-all"
                          >
                            Read
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Newsletter Strip */}
          <div className="bg-[#2d5a3d] rounded-3xl p-10 lg:p-14 flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 text-center lg:text-left">
              <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-3">
                Stay in the loop
              </p>
              <h2
                className="text-2xl lg:text-3xl font-semibold text-white mb-2"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Tea wisdom, delivered weekly
              </h2>
              <p className="text-white/70">
                New brewing guides, origin stories, and seasonal arrivals —
                straight to your inbox.
              </p>
            </div>
            <div className="w-full lg:w-auto">
              {subscribed ? (
                <div className="text-center px-8 py-4 bg-white/10 rounded-xl">
                  <p className="text-white font-medium">
                    You're subscribed! 🍃
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSubscribed(true);
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('blog.emailPlaceholder')}
                    required
                    className="flex-1 lg:w-64 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-[#c8a96e] text-[#1c1917] font-semibold rounded-xl hover:bg-[#b8995e] transition-colors whitespace-nowrap"
                  >
                    Subscribe
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
