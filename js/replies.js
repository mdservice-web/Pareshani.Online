import { getClient, friendlyError } from "./supabase.js";
import { CONFIG } from "./config.js";
import { getAuth } from "./auth.js";

const SELECT = `
  id, problem_id, user_id, content, is_anonymous, status,
  helpful_count, created_at, updated_at,
  profiles:user_id ( id, name, username )
`;

export async function listReplies(problemId, { newestFirst = false } = {}) {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb.from("replies")
    .select(SELECT)
    .eq("problem_id", problemId)
    .eq("status", "published")
    .order("created_at", { ascending: !newestFirst });
  if (error) throw new Error(friendlyError(error));
  return data || [];
}

export async function createReply({ problem_id, content, is_anonymous = false }) {
  const sb = getClient();
  const { session, profile } = getAuth();
  if (!sb || !session) throw new Error("Login karke reply karein.");
  if (profile?.is_suspended) throw new Error("Aapka account suspend hai.");
  const text = String(content || "").trim();
  if (text.length < CONFIG.REPLY_MIN) throw new Error("Reply khali nahi ho sakta.");
  if (text.length > CONFIG.REPLY_MAX) throw new Error("Reply bahut lamba hai.");
  const { data, error } = await sb.from("replies").insert({
    problem_id,
    user_id: session.user.id,
    content: text,
    is_anonymous: Boolean(is_anonymous),
    status: "published",
  }).select(SELECT).single();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function updateReply(id, content) {
  const sb = getClient();
  const text = String(content || "").trim();
  if (text.length < CONFIG.REPLY_MIN) throw new Error("Reply khali nahi ho sakta.");
  const { data, error } = await sb.from("replies")
    .update({ content: text })
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw new Error(friendlyError(error));
  return data;
}

export async function deleteReply(id) {
  const sb = getClient();
  const { error } = await sb.from("replies").update({ status: "deleted" }).eq("id", id);
  if (error) throw new Error(friendlyError(error));
}

export async function listMyReplies(userId) {
  const sb = getClient();
  if (!sb) return [];
  const { data, error } = await sb.from("replies")
    .select(`
      id, content, created_at, helpful_count, problem_id, status,
      problems:problem_id ( id, title, status )
    `)
    .eq("user_id", userId)
    .neq("status", "deleted")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(friendlyError(error));
  return data || [];
}
