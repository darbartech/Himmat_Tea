export type SharePlatform =
  | "facebook"
  | "twitter"
  | "linkedin"
  | "whatsapp"
  | "copy"
  | "native";

export interface ShareOptions {
  url: string;
  title: string;
  text?: string;
}

function openPopup(shareUrl: string) {
  if (typeof window === "undefined") return;
  window.open(shareUrl, "_blank", "width=600,height=400,noopener,noreferrer");
}

export async function shareTo(platform: SharePlatform, opts: ShareOptions): Promise<"opened" | "copied" | "shared" | "unsupported" | "cancelled"> {
  const { url, title } = opts;
  const text = opts.text ?? title;

  switch (platform) {
    case "facebook":
      openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
      return "opened";

    case "twitter":
      openPopup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
      return "opened";

    case "linkedin":
      openPopup(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
      return "opened";

    case "whatsapp":
      openPopup(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`);
      return "opened";

    case "copy":
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        return "copied";
      }
      return "unsupported";

    case "native":
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title, text, url });
          return "shared";
        } catch {
          return "cancelled";
        }
      }
      return "unsupported";
  }
}

export function supportsNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
