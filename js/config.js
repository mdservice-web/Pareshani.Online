/**
 * Pareshani configuration
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values.
 * NEVER put the service_role key here.
 */
export const CONFIG = {
  APP_NAME: "Pareshani",
  TAGLINE: "Apni baat bolo. Koi sunega.",
  SUPABASE_URL: "YOUR_SUPABASE_URL",
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",
  PAGE_SIZE: 12,
  TITLE_MIN: 8,
  TITLE_MAX: 140,
  DESC_MIN: 20,
  DESC_MAX: 8000,
  REPLY_MIN: 2,
  REPLY_MAX: 4000,
  SEARCH_MIN: 2,
};

export function isConfigured() {
  const url = CONFIG.SUPABASE_URL || "";
  const key = CONFIG.SUPABASE_ANON_KEY || "";
  return (
    url.startsWith("https://") &&
    !url.includes("YOUR_SUPABASE") &&
    key.length > 20 &&
    !key.includes("YOUR_SUPABASE")
  );
}

/**
 * Base-relative URL helper so GitHub Pages project sites work
 * (https://user.github.io/pareshani/) as well as custom domains.
 */
export function asset(path) {
  const clean = String(path).replace(/^\//, "");
  const here = window.location.pathname;
  const inAdmin = /\/admin(\/|$)/.test(here);
  return inAdmin ? `../${clean}` : clean;
}

export function pageUrl(file, params) {
  const base = asset(file);
  if (!params) return base;
  const qs = new URLSearchParams(params).toString();
  return qs ? `${base}?${qs}` : base;
}

export const CATEGORY_FALLBACK = [
  { slug: "career", name: "Career & Jobs", description: "Naukri, interviews, career change.", icon: "briefcase" },
  { slug: "education", name: "Education", description: "Padhai, exams, college, skills.", icon: "book" },
  { slug: "money", name: "Money", description: "Budget, savings, bills.", icon: "wallet" },
  { slug: "family", name: "Family", description: "Ghar, parents, siblings.", icon: "home" },
  { slug: "relationships", name: "Relationships", description: "Dosti and respectful connections.", icon: "heart" },
  { slug: "business", name: "Business", description: "Startup, shop, clients.", icon: "store" },
  { slug: "technology", name: "Technology", description: "Phones, software, learning tech.", icon: "cpu" },
  { slug: "daily-life", name: "Daily Life", description: "Rozmarra ke masle.", icon: "sun" },
  { slug: "health", name: "Health & Wellbeing", description: "General support — not medical advice.", icon: "activity" },
  { slug: "other", name: "Other", description: "Jo category match na kare.", icon: "dots" },
];
