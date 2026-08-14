export function slugify(input: string): string {
  if (!input) return "";
  return String(input)
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function ensureUniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>,
  maxAttempts = 100
): Promise<string> {
  const clean = slugify(base);
  if (!clean) {
    const random = Math.random().toString(36).slice(2, 10);
    return `slug-${random}`;
  }
  let candidate = clean;
  let counter = 2;
  let attempts = 0;
  while (attempts < maxAttempts) {
    const taken = await exists(candidate);
    if (!taken) return candidate;
    candidate = `${clean}-${counter}`;
    counter++;
    attempts++;
  }
  return `${clean}-${Date.now().toString(36)}`;
}
