export const PRIMARY_SITE_URL = "https://fretmasterstudio.seltium.xyz";
export const FALLBACK_VERCEL_URL = "https://fretmaster-studio.vercel.app";

export function resolveSiteUrl(rawUrl?: string | null): string {
  const candidate = rawUrl?.trim();
  if (!candidate) return PRIMARY_SITE_URL;

  try {
    return new URL(candidate).origin;
  } catch {
    return PRIMARY_SITE_URL;
  }
}

export const SITE_URL = resolveSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
