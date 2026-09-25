import { getClient, friendlyError } from "./supabase.js";
import { isConfigured } from "./config.js";

const listeners = new Set();
let cache = { session: null, profile: null, role: "user", ready: false };

export function onAuthChange(fn) {
  listeners.add(fn);
  if (cache.ready) fn(cache);
  return () => listeners.delete(fn);
}

function emit() {
  listeners.forEach((fn) => fn(cache));
}

export function getAuth() {
  return cache;
}

export function requireAuth(redirect = "login.html") {
  if (!cache.ready) return;
  if (!cache.session) {
    const next = encodeURIComponent(location.pathname.split("/").pop() + location.search);
    location.href = `${redirect}?next=${next}`;
  }
}

export async function initAuth() {
  const sb = getClient();
  if (!sb) {
    cache.ready = true;
    emit();
    return cache;
  }
  const { data } = await sb.auth.getSession();
  cache.session = data.session || null;
  if (cache.session) await hydrateProfile();
  cache.ready = true;
  emit();

  sb.auth.onAuthStateChange(async (_event, session) => {
    cache.session = session;
    if (session) await hydrateProfile();
    else {
      cache.profile = null;
      cache.role = "user";
    }
    emit();
  });
  return cache;
}

async function hydrateProfile() {
  const sb = getClient();
  const uid = cache.session?.user?.id;
  if (!sb || !uid) return;
  const { data: profile } = await sb.from("profiles").select("*").eq("id", uid).maybeSingle();
  cache.profile = profile;
  const { data: roleRow } = await sb.from("user_roles").select("role").eq("user_id", uid).maybeSingle();
  cache.role = roleRow?.role || "user";
}

export async function register({ name, email, password, username }) {
  const sb = getClient();
  if (!sb) throw new Error("Supabase configured nahi hai.");
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { name, username: username || undefined } },
  });
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function login({ email, password }) {
  const sb = getClient();
  if (!sb) throw new Error("Supabase configured nahi hai.");
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function logout() {
  const sb = getClient();
  if (sb) await sb.auth.signOut();
  cache.session = null;
  cache.profile = null;
  cache.role = "user";
  emit();
}

export async function resetPassword(email) {
  const sb = getClient();
  if (!sb) throw new Error("Supabase configured nahi hai.");
  const redirectTo = new URL("login.html", location.href).href;
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(friendlyError(error));
}

export async function updatePassword(password) {
  const sb = getClient();
  if (!sb) throw new Error("Supabase configured nahi hai.");
  const { error } = await sb.auth.updateUser({ password });
  if (error) throw new Error(friendlyError(error));
}

export async function updateProfile(patch) {
  const sb = getClient();
  const uid = cache.session?.user?.id;
  if (!sb || !uid) throw new Error("Login required.");
  const { data, error } = await sb.from("profiles").update(patch).eq("id", uid).select().single();
  if (error) throw new Error(friendlyError(error));
  cache.profile = data;
  emit();
  return data;
}

export function isStaff() {
  return cache.role === "admin" || cache.role === "moderator";
}

export { isConfigured };
