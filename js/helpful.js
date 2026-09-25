import { getClient, friendlyError } from "./supabase.js";
import { getAuth } from "./auth.js";
import { asset } from "./config.js";

export async function hasProblemVote(problemId) {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) return false;
  const { data } = await sb.from("problem_helpful")
    .select("problem_id")
    .eq("problem_id", problemId)
    .eq("user_id", uid)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleProblemVote(problemId) {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) {
    location.href = `${asset("login.html")}?next=${encodeURIComponent("problem.html?id=" + problemId)}`;
    return { voted: false };
  }
  const voted = await hasProblemVote(problemId);
  if (voted) {
    const { error } = await sb.from("problem_helpful").delete().eq("problem_id", problemId).eq("user_id", uid);
    if (error) throw new Error(friendlyError(error));
    return { voted: false };
  }
  const { error } = await sb.from("problem_helpful").insert({ problem_id: problemId, user_id: uid });
  if (error) throw new Error(friendlyError(error));
  return { voted: true };
}

export async function hasReplyVote(replyId) {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) return false;
  const { data } = await sb.from("reply_helpful")
    .select("reply_id")
    .eq("reply_id", replyId)
    .eq("user_id", uid)
    .maybeSingle();
  return Boolean(data);
}

export async function toggleReplyVote(replyId) {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) throw new Error("LOGIN");
  const voted = await hasReplyVote(replyId);
  if (voted) {
    const { error } = await sb.from("reply_helpful").delete().eq("reply_id", replyId).eq("user_id", uid);
    if (error) throw new Error(friendlyError(error));
    return { voted: false };
  }
  const { error } = await sb.from("reply_helpful").insert({ reply_id: replyId, user_id: uid });
  if (error) throw new Error(friendlyError(error));
  return { voted: true };
}
