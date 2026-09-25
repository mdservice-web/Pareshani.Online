import { getClient, friendlyError } from "./supabase.js";

export async function getPublicProfile(username) {
  const sb = getClient();
  if (!sb) return null;
  const { data, error } = await sb.from("profiles")
    .select("id, name, username, bio, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function profileStats(userId) {
  const sb = getClient();
  if (!sb) return { problems: 0, replies: 0, helpful: 0 };
  const [{ count: problems }, { count: replies }, helpfulRes] = await Promise.all([
    sb.from("problems").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("status", "deleted"),
    sb.from("replies").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "published"),
    sb.from("problems").select("helpful_count").eq("user_id", userId).eq("status", "published"),
  ]);
  const helpful = (helpfulRes.data || []).reduce((s, r) => s + (r.helpful_count || 0), 0);
  return { problems: problems || 0, replies: replies || 0, helpful };
}
