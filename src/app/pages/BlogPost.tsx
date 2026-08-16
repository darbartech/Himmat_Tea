'use client';

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Navigation from "@/app/components/Navigation";
import Footer from "@/app/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";
import { useStore } from "@/context/StoreContext";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Calendar,
  Share2,
  Twitter,
  Facebook,
  Link2,
} from "lucide-react";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const { blogPosts } = useStore();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [copied, setCopied] = useState(false);

  const post = blogPosts.find((p) => p.slug === slug);
  const related = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!post) {
    return (
      <div
        className="min-h-screen bg-[#f9f7f4]"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        <Navigation />
        <main className="pt-[180px] pb-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-4">
              404
            </p>
            <h1
              className="text-[clamp(2rem,4vw,3.5rem)] leading-[1.1] font-semibold text-[#1c1917] mb-6"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Post Not Found
            </h1>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-[#2d5a3d] font-medium"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#f9f7f4]"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <Navigation />
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-[1fr_320px] gap-14 items-start">
            {/* Main Article */}
            <article>
              {/* Back link */}
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 text-[#78746e] hover:text-[#2d5a3d] transition-colors mb-8"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Blog
              </Link>

              {/* Meta */}
              <span className="inline-block px-3 py-1 bg-[#f0ede8] text-[#2d5a3d] text-xs font-semibold rounded-full uppercase tracking-wide mb-5">
                {post.category}
              </span>
              <h1
                className="text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-semibold text-[#1c1917] mb-6"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {post.title}
              </h1>

              {/* Author + date row */}
              <div className="flex flex-wrap items-center gap-4 mb-8 pb-8 border-b border-[rgba(28,25,23,0.08)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#2d5a3d] flex items-center justify-center text-white text-sm font-semibold">
                    HT
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1c1917]">
                      Himmat Tea Team
                    </p>
                    <p className="text-xs text-[#78746e]">{t('blog.editorialLabel')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-[#78746e] ml-auto">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {post.date}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {post.readTime}
                  </span>
                </div>
              </div>

              {/* Hero image */}
              <div className="rounded-2xl overflow-hidden mb-10 h-[300px] lg:h-[420px]">
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Article body */}
              <div className="prose max-w-none">
                {post.body.map((block, i) => {
                  if (block.type === "h2") {
                    return (
                      <h2
                        key={i}
                        className="text-2xl font-semibold text-[#1c1917] mt-10 mb-4"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {block.text}
                      </h2>
                    );
                  }
                  return (
                    <p
                      key={i}
                      className="text-lg text-[#444] leading-relaxed mb-5"
                    >
                      {block.text}
                    </p>
                  );
                })}
              </div>

              {/* Share */}
              <div className="mt-12 pt-8 border-t border-[rgba(28,25,23,0.08)]">
                <p className="text-sm font-medium text-[#78746e] mb-4 flex items-center gap-2">
                  <Share2 className="h-4 w-4" />
                  Share this article
                </p>
                <div className="flex gap-3">
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(28,25,23,0.1)] text-sm text-[#78746e] hover:bg-[#f0ede8] transition-colors">
                    <Twitter className="h-4 w-4" /> Twitter
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(28,25,23,0.1)] text-sm text-[#78746e] hover:bg-[#f0ede8] transition-colors">
                    <Facebook className="h-4 w-4" /> Facebook
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[rgba(28,25,23,0.1)] text-sm text-[#78746e] hover:bg-[#f0ede8] transition-colors"
                  >
                    <Link2 className="h-4 w-4" />
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>
              </div>

              {/* Back to Blog */}
              <div className="mt-10">
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 text-[#2d5a3d] font-medium hover:gap-3 transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Blog
                </Link>
              </div>

              {/* Newsletter */}
              <div className="mt-12 bg-[#2d5a3d] rounded-2xl p-8">
                <p className="text-xs uppercase tracking-widest text-[#c8a96e] font-medium mb-2">
                  Newsletter
                </p>
                <h3
                  className="text-2xl font-semibold text-white mb-2"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Enjoy articles like this?
                </h3>
                <p className="text-white/70 mb-6">
                  Get weekly brewing guides, origin stories, and seasonal tea
                  news in your inbox.
                </p>
                {subscribed ? (
                  <p className="text-white font-medium">
                    You're subscribed! 🍵
                  </p>
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
                      className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40"
                    />
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#c8a96e] text-[#1c1917] font-semibold rounded-xl hover:bg-[#b8995e] transition-colors"
                    >
                      Subscribe
                    </button>
                  </form>
                )}
              </div>
            </article>

            {/* Sidebar */}
            <aside className="space-y-8 lg:sticky lg:top-32">
              {/* Related Posts */}
              <div>
                <h3
                  className="text-xl font-semibold text-[#1c1917] mb-5"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Related Posts
                </h3>
                <div className="space-y-4">
                  {related.map((p) => (
                    <Link
                      key={p.id}
                      href={`/blog/${p.slug}`}
                      className="flex gap-4 group"
                    >
                      <div className="w-20 h-16 rounded-xl overflow-hidden flex-shrink-0">
                        <img
                          src={p.image}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div>
                        <span className="text-xs text-[#c8a96e] font-medium uppercase tracking-wide">
                          {p.category}
                        </span>
                        <p
                          className="text-sm font-medium text-[#1c1917] group-hover:text-[#2d5a3d] transition-colors leading-snug mt-0.5"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {p.title}
                        </p>
                        <p className="text-xs text-[#78746e] mt-1">
                          {p.readTime}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Popular Categories */}
              <div className="bg-white rounded-2xl border border-[rgba(28,25,23,0.06)] p-6">
                <h3
                  className="text-xl font-semibold text-[#1c1917] mb-4"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  Categories
                </h3>
                <div className="space-y-2">
                  {["Brewing", "Origins", "Wellness", "Culture"].map((cat) => (
                    <Link
                      key={cat}
                      href="/blog"
                      className="flex items-center justify-between py-2 text-sm text-[#78746e] hover:text-[#2d5a3d] transition-colors border-b border-[rgba(28,25,23,0.05)] last:border-0"
                    >
                      {cat}
                      <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
