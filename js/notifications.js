import { getClient, friendlyError } from "./supabase.js";
import { getAuth } from "./auth.js";

export async function listNotifications() {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) return [];
  const { data, error } = await sb.from("notifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(friendlyError(error));
  return data || [];
}

export async function unreadCount() {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) return 0;
  const { count } = await sb.from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("is_read", false);
  return count || 0;
}

export async function markRead(id) {
  const sb = getClient();
  if (!sb) return;
  await sb.from("notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllRead() {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) return;
  await sb.from("notifications").update({ is_read: true }).eq("user_id", uid).eq("is_read", false);
}
