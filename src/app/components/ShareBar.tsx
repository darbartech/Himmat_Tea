'use client';

import { useState, useEffect } from "react";
import { Share2, Facebook, Twitter, Linkedin, MessageCircle, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { shareTo, supportsNativeShare, type ShareOptions } from "@/lib/social-share";
import { useTranslation } from "@/hooks/useTranslation";

interface ShareBarProps extends ShareOptions {
  labelPrefix: string;
  variant?: "icons" | "buttons";
}

export default function ShareBar({ url, title, text, labelPrefix, variant = "icons" }: ShareBarProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  useEffect(() => {
    setCanNativeShare(supportsNativeShare());
  }, []);

  async function handle(platform: Parameters<typeof shareTo>[0]) {
    const result = await shareTo(platform, { url, title, text });
    if (result === "copied") {
      setCopied(true);
      toast.success(t(`${labelPrefix}.copied`) || "Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
    if (result === "unsupported" && platform === "copy") {
      toast.error("Copy isn't supported in this browser.");
    }
  }

  const iconCls = "h-4 w-4";

  return (
    <div className="flex flex-wrap gap-2">
      {canNativeShare && (
        <button
          onClick={() => handle("native")}
          aria-label={t(`${labelPrefix}.native`)}
          title={t(`${labelPrefix}.button`)}
          className="flex items-center gap-2 px-3 py-2.5 bg-[#2d5a3d] text-white rounded-xl hover:bg-[#234832] transition-colors"
        >
          <Share2 className={iconCls} />
          <span className="text-sm font-medium hidden sm:inline">{t(`${labelPrefix}.button`)}</span>
        </button>
      )}
      <button
        onClick={() => handle("facebook")}
        aria-label={t(`${labelPrefix}.facebook`)}
        title={t(`${labelPrefix}.facebook`)}
        className="p-2.5 bg-[#1877f2] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1877f2]"
      >
        <Facebook className={iconCls} />
      </button>
      <button
        onClick={() => handle("twitter")}
        aria-label={t(`${labelPrefix}.twitter`)}
        title={t(`${labelPrefix}.twitter`)}
        className="p-2.5 bg-black text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black"
      >
        <Twitter className={iconCls} />
      </button>
      <button
        onClick={() => handle("whatsapp")}
        aria-label={t(`${labelPrefix}.whatsapp`)}
        title={t(`${labelPrefix}.whatsapp`)}
        className="p-2.5 bg-[#25d366] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#25d366]"
      >
        <MessageCircle className={iconCls} />
      </button>
      <button
        onClick={() => handle("linkedin")}
        aria-label={t(`${labelPrefix}.linkedin`)}
        title={t(`${labelPrefix}.linkedin`)}
        className="p-2.5 bg-[#0077b5] text-white rounded-xl hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0077b5]"
      >
        <Linkedin className={iconCls} />
      </button>
      <button
        onClick={() => handle("copy")}
        aria-label={t(`${labelPrefix}.copyLink`)}
        title={copied ? "Copied!" : "Copy Link"}
        className={`p-2.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          copied ? "bg-[#2d5a3d] text-white focus:ring-[#2d5a3d]" : "bg-[#78746e] text-white hover:opacity-90 focus:ring-[#78746e]"
        }`}
      >
        {copied ? <Check className={iconCls} /> : <Link2 className={iconCls} />}
      </button>
    </div>
  );
}
