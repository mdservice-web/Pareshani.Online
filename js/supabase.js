import { CONFIG, isConfigured } from "./config.js";

let client = null;

export function getClient() {
  if (!isConfigured()) return null;
  if (client) return client;
  if (!window.supabase) {
    console.error("Supabase JS SDK missing");
    return null;
  }
  client = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

export function friendlyError(err) {
  const msg = (err && (err.message || err.error_description || err.msg)) || "";
  const low = msg.toLowerCase();
  if (low.includes("invalid login") || low.includes("invalid credentials")) {
    return "Email ya password incorrect hai.";
  }
  if (low.includes("already registered") || low.includes("user already")) {
    return "Yeh email pehle se registered hai. Login karein.";
  }
  if (low.includes("email not confirmed")) {
    return "Email confirm karein, phir login kijiye.";
  }
  if (low.includes("row-level security") || low.includes("violates")) {
    return "Aap yeh action abhi nahi kar sakte. Login status ya permissions check karein.";
  }
  if (low.includes("rate") || low.includes("too many")) {
    return "Thoda ruk kar dobara try karein.";
  }
  if (low.includes("network") || low.includes("fetch")) {
    return "Network problem hai. Connection check karke dobara try karein.";
  }
  if (low.includes("duplicate key") && low.includes("username")) {
    return "Yeh username already liya ja chuka hai.";
  }
  if (low.includes("duplicate") && low.includes("reports")) {
    return "Aap is content ko pehle hi report kar chuke hain.";
  }
  return "Kuch problem aa gayi. Please dobara try karein.";
}
