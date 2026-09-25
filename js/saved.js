import { getClient, friendlyError } from "./supabase.js";
import { getAuth } from "./auth.js";

export async function isSaved(problemId) {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) return false;
  const { data } = await sb.from("saved_problems")
    .select("problem_id")
    .eq("user_id", uid)
    .eq("problem_id", problemId)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleSave(problemId) {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) throw new Error("LOGIN");
  if (await isSaved(problemId)) {
    const { error } = await sb.from("saved_problems").delete().eq("user_id", uid).eq("problem_id", problemId);
    if (error) throw new Error(friendlyError(error));
    return { saved: false };
  }
  const { error } = await sb.from("saved_problems").insert({ user_id: uid, problem_id: problemId });
  if (error) throw new Error(friendlyError(error));
  return { saved: true };
}

export async function listSaved() {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) return [];
  const { data, error } = await sb.from("saved_problems")
    .select(`
      created_at,
      problems:problem_id (
        id, title, description, is_anonymous, reply_count, helpful_count, created_at, status,
        categories:category_id ( name, slug ),
        profiles:user_id ( name, username )
      )
    `)
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw new Error(friendlyError(error));
  return (data || []).map((r) => r.problems).filter((p) => p && p.status === "published");
}
