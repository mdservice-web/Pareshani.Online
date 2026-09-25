import { getClient, friendlyError } from "./supabase.js";
import { getAuth, isStaff } from "./auth.js";

export async function listReports(status = "open") {
  const sb = getClient();
  if (!sb) return [];
  let q = sb.from("reports").select(`
    *,
    reporter:reporter_id ( name, username ),
    problems:problem_id ( id, title, status ),
    replies:reply_id ( id, content, status, problem_id )
  `).order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q.limit(100);
  if (error) throw new Error(friendlyError(error));
  return data || [];
}

export async function resolveReport(id, status, note = "") {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  const { error } = await sb.from("reports").update({
    status,
    resolved_at: new Date().toISOString(),
    resolved_by: uid,
    resolution_note: note || null,
  }).eq("id", id);
  if (error) throw new Error(friendlyError(error));
}

export async function hideProblem(id, note) {
  return moderate("problem", id, "hidden", note, async (sb) => {
    const { error } = await sb.from("problems").update({ status: "hidden" }).eq("id", id);
    if (error) throw error;
  });
}

export async function deleteProblemAdmin(id, note) {
  return moderate("problem", id, "deleted", note, async (sb) => {
    const { error } = await sb.from("problems").update({ status: "deleted" }).eq("id", id);
    if (error) throw error;
  });
}

export async function deleteReplyAdmin(id, note) {
  return moderate("reply", id, "deleted", note, async (sb) => {
    const { error } = await sb.from("replies").update({ status: "deleted" }).eq("id", id);
    if (error) throw error;
  });
}

export async function setUserSuspended(userId, suspended, reason = "") {
  return moderate("user", userId, suspended ? "suspended" : "unsuspended", reason, async (sb) => {
    const { error } = await sb.from("profiles").update({
      is_suspended: suspended,
      suspend_reason: suspended ? reason : null,
    }).eq("id", userId);
    if (error) throw error;
  });
}

export async function listUsers() {
  const sb = getClient();
  const { data, error } = await sb.from("profiles")
    .select("id, name, username, created_at, is_suspended, suspend_reason")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(friendlyError(error));
  return data || [];
}

export async function listModeration() {
  const sb = getClient();
  const { data, error } = await sb.from("moderation_actions")
    .select("*, actor:actor_id ( name, username )")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(friendlyError(error));
  return data || [];
}

export async function listHiddenProblems() {
  const sb = getClient();
  const { data, error } = await sb.from("problems")
    .select("id, title, status, created_at, user_id")
    .in("status", ["hidden", "deleted"])
    .order("updated_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(friendlyError(error));
  return data || [];
}

async function moderate(target_type, target_id, action, note, fn) {
  if (!isStaff()) throw new Error("Staff only.");
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  await fn(sb);
  const { error } = await sb.from("moderation_actions").insert({
    actor_id: uid,
    action,
    target_type,
    target_id,
    note: note || null,
  });
  if (error) throw new Error(friendlyError(error));
}

export async function listContact() {
  const sb = getClient();
  const { data, error } = await sb.from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(friendlyError(error));
  return data || [];
}
