import { getClient, friendlyError } from "./supabase.js";
import { CONFIG } from "./config.js";
import { getAuth } from "./auth.js";

const SELECT = `
  id, user_id, title, description, tags, is_anonymous, status,
  reply_count, helpful_count, created_at, updated_at, category_id,
  categories:category_id ( id, slug, name ),
  profiles:user_id ( id, name, username )
`;

export function validateProblem({ title, description, category_id }) {
  const errors = {};
  const t = (title || "").trim();
  const d = (description || "").trim();
  if (t.length < CONFIG.TITLE_MIN) errors.title = `Title kam se kam ${CONFIG.TITLE_MIN} characters ka ho.`;
  if (t.length > CONFIG.TITLE_MAX) errors.title = `Title ${CONFIG.TITLE_MAX} characters se chhota rakhein.`;
  if (d.length < CONFIG.DESC_MIN) errors.description = `Description kam se kam ${CONFIG.DESC_MIN} characters ki ho.`;
  if (d.length > CONFIG.DESC_MAX) errors.description = "Description zyada lambi hai.";
  if (!category_id) errors.category_id = "Category choose karein.";
  if (/^(.)\1{7,}$/.test(t) || /^test+$/i.test(t)) errors.title = "Meaningful title likhein.";
  return errors;
}

export async function listProblems({ sort = "latest", categoryId, categorySlug, q, page = 0, userId, status = "published" } = {}) {
  const sb = getClient();
  if (!sb) return { data: [], count: 0, configured: false };
  let query = sb.from("problems").select(SELECT, { count: "exact" });
  if (status && status !== "any") query = query.eq("status", status);
  if (categoryId) query = query.eq("category_id", categoryId);
  if (userId) query = query.eq("user_id", userId);
  if (categorySlug) {
    const { data: cat } = await sb.from("categories").select("id").eq("slug", categorySlug).maybeSingle();
    if (!cat) return { data: [], count: 0, configured: true };
    query = query.eq("category_id", cat.id);
  }
  if (q && q.trim().length >= CONFIG.SEARCH_MIN) {
    const term = q.trim().replace(/[%_,()]/g, " ").replace(/\s+/g, " ").slice(0, 80);
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
  }
  if (sort === "helpful") query = query.order("helpful_count", { ascending: false }).order("created_at", { ascending: false });
  else if (sort === "discussed") query = query.order("reply_count", { ascending: false }).order("created_at", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const from = page * CONFIG.PAGE_SIZE;
  const to = from + CONFIG.PAGE_SIZE - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(friendlyError(error));
  return { data: data || [], count: count || 0, configured: true };
}

export async function getProblem(id) {
  const sb = getClient();
  if (!sb) return null;
  const { data, error } = await sb.from("problems").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function createProblem(payload) {
  const sb = getClient();
  const { session, profile } = getAuth();
  if (!sb || !session) throw new Error("Pehle login karein.");
  if (profile?.is_suspended) throw new Error("Aapka account suspend hai.");
  const errors = validateProblem(payload);
  if (Object.keys(errors).length) {
    const e = new Error("Validation failed");
    e.fields = errors;
    throw e;
  }
  const tags = String(payload.tags || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
  const { data, error } = await sb.from("problems").insert({
    user_id: session.user.id,
    title: payload.title.trim(),
    description: payload.description.trim(),
    category_id: Number(payload.category_id),
    is_anonymous: Boolean(payload.is_anonymous),
    tags,
    status: "published",
  }).select(SELECT).single();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function updateProblem(id, patch) {
  const sb = getClient();
  if (!sb) throw new Error("Not configured");
  const clean = { ...patch, updated_at: new Date().toISOString() };
  const { data, error } = await sb.from("problems").update(clean).eq("id", id).select(SELECT).single();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function deleteProblem(id) {
  const sb = getClient();
  if (!sb) throw new Error("Not configured");
  const { error } = await sb.from("problems").update({ status: "deleted" }).eq("id", id);
  if (error) throw new Error(friendlyError(error));
}
