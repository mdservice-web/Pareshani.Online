import { listProblems } from "./posts.js";
import { CONFIG } from "./config.js";

export async function searchProblems(q, page = 0) {
  const term = String(q || "").trim();
  if (term.length < CONFIG.SEARCH_MIN) return { data: [], count: 0, term };
  return { ...(await listProblems({ q: term, page })), term };
}
