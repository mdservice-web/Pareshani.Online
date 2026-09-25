import { getClient, friendlyError } from "./supabase.js";
import { getAuth } from "./auth.js";

export const REPORT_REASONS = [
  { id: "spam", label: "Spam" },
  { id: "harassment", label: "Harassment" },
  { id: "abuse", label: "Abuse" },
  { id: "hate", label: "Hate" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "personal_information", label: "Personal information" },
  { id: "scam", label: "Scam" },
  { id: "other", label: "Other" },
];

export async function submitReport({ problem_id = null, reply_id = null, reason, description = "" }) {
  const sb = getClient();
  const uid = getAuth().session?.user?.id;
  if (!sb || !uid) throw new Error("Report karne ke liye login karein.");
  if (!reason) throw new Error("Reason choose karein.");
  const { error } = await sb.from("reports").insert({
    reporter_id: uid,
    problem_id,
    reply_id,
    reason,
    description: description.trim() || null,
    status: "open",
  });
  if (error) throw new Error(friendlyError(error));
}

export function openReportModal({ problemId, replyId }) {
  let back = document.getElementById("reportModal");
  if (!back) {
    back = document.createElement("div");
    back.id = "reportModal";
    back.className = "modal-backdrop";
    back.innerHTML = `
      <form class="modal" id="reportForm">
        <h3 style="margin:0 0 8px">Report</h3>
        <p class="hint">Galat use rokne ke liye report karein. False reports se account affect ho sakta hai.</p>
        <div class="form-group">
          <label for="reportReason">Reason</label>
          <select id="reportReason" required>
            ${REPORT_REASONS.map((r) => `<option value="${r.id}">${r.label}</option>`).join("")}
          </select>
        </div>
        <div class="form-group">
          <label for="reportDesc">Details <span class="hint">(optional)</span></label>
          <textarea id="reportDesc" maxlength="500" style="min-height:90px"></textarea>
        </div>
        <div class="alert" id="reportAlert" hidden></div>
        <div style="display:flex;gap:8px;justify-content:flex-end">
          <button type="button" class="btn btn-ghost" id="reportCancel">Cancel</button>
          <button class="btn btn-primary" type="submit">Submit report</button>
        </div>
      </form>`;
    document.body.appendChild(back);
    back.addEventListener("click", (e) => { if (e.target === back) back.classList.remove("open"); });
    document.getElementById("reportCancel").addEventListener("click", () => back.classList.remove("open"));
  }
  const form = document.getElementById("reportForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const alert = document.getElementById("reportAlert");
    try {
      await submitReport({
        problem_id: problemId || null,
        reply_id: replyId || null,
        reason: document.getElementById("reportReason").value,
        description: document.getElementById("reportDesc").value,
      });
      alert.className = "alert alert-ok";
      alert.hidden = false;
      alert.textContent = "Thanks. Your report has been submitted.";
      setTimeout(() => back.classList.remove("open"), 900);
    } catch (err) {
      alert.className = "alert alert-error";
      alert.hidden = false;
      alert.textContent = err.message;
    }
  };
  document.getElementById("reportDesc").value = "";
  document.getElementById("reportAlert").hidden = true;
  back.classList.add("open");
}
