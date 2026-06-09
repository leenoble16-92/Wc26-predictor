// URL-safe handle generation from a display name + short random suffix.
// The suffix keeps handles unique even when two people pick the same name;
// the DB has a unique constraint on profiles.handle as the real guard.

const SUFFIX_ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

export function randomSuffix(len = 4): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return out;
}

export function makeHandle(displayName: string): string {
  const base = slugify(displayName) || "player";
  return `${base}-${randomSuffix()}`;
}
