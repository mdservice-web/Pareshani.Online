import { asset, pageUrl, isConfigured, CATEGORY_FALLBACK } from "./config.js";
import { getClient } from "./supabase.js";
import { initAuth, getAuth, onAuthChange, logout, isStaff } from "./auth.js";

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function timeAgo(iso) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return "abhi";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min pehle`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h pehle`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d pehle`;
  return new Date(iso).toLocaleDateString();
}

export function excerpt(text, n = 140) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export function initials(name) {
  const p = String(name || "A").trim().split(/\s+/);
  return ((p[0]?.[0] || "A") + (p[1]?.[0] || "")).toUpperCase();
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function toast(message) {
  let wrap = qs(".toast-wrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    wrap.setAttribute("aria-live", "polite");
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

export function setAlert(el, type, msg) {
  if (!el) return;
  if (!msg) { el.hidden = true; el.textContent = ""; return; }
  el.hidden = false;
  el.className = `alert alert-${type}`;
  el.textContent = msg;
}

export function skeletons(n = 3) {
  return Array.from({ length: n }, () => `
    <article class="problem-card skel-card" aria-hidden="true">
      <div class="skel" style="width:90px;height:18px;margin-bottom:10px"></div>
      <div class="skel" style="width:80%;height:18px;margin-bottom:8px"></div>
      <div class="skel" style="width:100%;height:12px;margin-bottom:6px"></div>
      <div class="skel" style="width:60%;height:12px"></div>
    </article>`).join("");
}

export function authorLabel(row) {
  if (row.is_anonymous) return "Anonymous";
  return row.profiles?.name || row.author_name || "Member";
}

export function problemCard(p) {
  const cat = p.categories?.name || p.category_name || "Other";
  const href = pageUrl("problem.html", { id: p.id });
  return `
    <a class="problem-card" href="${href}">
      <span class="cat-pill">${escapeHtml(cat)}</span>
      <h3>${escapeHtml(p.title)}</h3>
      <p class="excerpt">${escapeHtml(excerpt(p.description))}</p>
      <div class="meta-row">
        <span>${escapeHtml(authorLabel(p))}</span>
        <span>${p.reply_count || 0} replies</span>
        <span>${p.helpful_count || 0} helpful</span>
        <span>${escapeHtml(timeAgo(p.created_at))}</span>
      </div>
    </a>`;
}

export function emptyState(text) {
  return `<div class="empty"><p>${escapeHtml(text)}</p></div>`;
}

let categoriesCache = null;
export async function loadCategories() {
  if (categoriesCache) return categoriesCache;
  const sb = getClient();
  if (sb) {
    const { data, error } = await sb.from("categories").select("*").order("sort_order");
    if (!error && data?.length) {
      categoriesCache = data;
      return data;
    }
  }
  categoriesCache = CATEGORY_FALLBACK;
  return categoriesCache;
}

export function renderCategoryGrid(el) {
  if (!el) return;
  loadCategories().then((cats) => {
    el.innerHTML = cats.map((c) => `
      <a class="cat-card" href="${pageUrl("category.html", { slug: c.slug })}">
        <strong>${escapeHtml(c.name)}</strong>
        <span>${escapeHtml(c.description || "")}</span>
      </a>`).join("");
  });
}

function headerHtml() {
  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <div class="header-inner">
        <a class="brand" href="${asset("index.html")}">
          <span class="brand-mark">PARE<span>SHANI</span></span>
          <span class="brand-tag">Apni baat bolo. Koi sunega.</span>
        </a>
        <nav class="nav-desktop" aria-label="Primary">
          <a href="${asset("index.html")}" data-nav="home">Home</a>
          <a href="${asset("explore.html")}" data-nav="explore">Explore</a>
          <a href="${asset("categories.html")}" data-nav="categories">Categories</a>
          <a href="${asset("share.html")}" data-nav="share">Share Problem</a>
        </nav>
        <div class="header-actions">
          <a class="icon-btn" href="${asset("search.html")}" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
          </a>
          <a class="btn btn-primary hide-mobile" href="${asset("share.html")}">Share</a>
          <a class="icon-btn hide-desktop" id="menuBtn" href="${asset("login.html")}" aria-label="Account">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3"/><path d="M5 19c1.5-3 4-5 7-5s5.5 2 7 5"/></svg>
          </a>
          <span id="authSlot"></span>
        </div>
      </div>
    </header>`;
}

function bottomNavHtml() {
  return `
    <nav class="bottom-nav" aria-label="Mobile">
      <a href="${asset("index.html")}" data-nav="home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>
        Home
      </a>
      <a href="${asset("explore.html")}" data-nav="explore">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
        Explore
      </a>
      <a href="${asset("share.html")}" data-nav="share" aria-label="Share problem">
        <span class="share-dot">+</span>
      </a>
      <a href="${asset("notifications.html")}" data-nav="notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
        Alerts
      </a>
      <a href="${asset("profile.html")}" data-nav="profile">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3"/><path d="M5 19c1.5-3 4-5 7-5s5.5 2 7 5"/></svg>
        Profile
      </a>
    </nav>`;
}

export function footerHtml() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div>
          <strong>PARESHANI</strong>
          <div>Apni baat bolo. Koi sunega.</div>
        </div>
        <div class="footer-links">
          <a href="${asset("guidelines.html")}">Community guidelines</a>
          <a href="${asset("privacy.html")}">Privacy</a>
          <a href="${asset("terms.html")}">Terms</a>
          <a href="${asset("contact.html")}">Contact</a>
        </div>
        <p>Pareshani community discussion platform hai. Replies logon ki raaye hain, professional advice nahi. Emergency mein local services se contact karein.</p>
      </div>
    </footer>`;
}

function paintAuth(slot) {
  if (!slot) return;
  const { session, profile } = getAuth();
  if (session) {
    const name = profile?.name || session.user.email || "Me";
    const dash = asset("dashboard.html");
    slot.innerHTML = `<a class="avatar-chip hide-mobile" href="${dash}" title="${escapeHtml(name)}">${escapeHtml(initials(name))}</a>`;
    const menu = document.getElementById("menuBtn");
    if (menu) menu.href = asset("profile.html");
  } else {
    slot.innerHTML = `<a class="btn btn-ghost hide-mobile" href="${asset("login.html")}">Login</a>`;
    const menu = document.getElementById("menuBtn");
    if (menu) menu.href = asset("login.html");
  }
}

function markActiveNav() {
  const page = document.body.dataset.page || "";
  qsa("[data-nav]").forEach((a) => {
    if (a.dataset.nav === page) a.classList.add("active");
  });
}

export async function bootPage({ protect = false, staff = false } = {}) {
  const mount = qs("#app-shell");
  if (mount && !mount.dataset.ready) {
    mount.innerHTML = headerHtml() + `<main id="main">${mount.innerHTML}</main>` + footerHtml() + bottomNavHtml();
    mount.dataset.ready = "1";
  }
  markActiveNav();
  await initAuth();
  paintAuth(qs("#authSlot"));
  onAuthChange(() => paintAuth(qs("#authSlot")));

  if (!isConfigured()) {
    const bar = document.createElement("div");
    bar.className = "alert alert-info";
    bar.style.margin = "0";
    bar.style.borderRadius = "0";
    bar.textContent = "Supabase keys js/config.js mein set karein — abhi live database connected nahi hai.";
    qs(".site-header")?.after(bar);
  }

  const auth = getAuth();
  if (protect && !auth.session) {
    const next = encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search);
    location.href = `${asset("login.html")}?next=${next}`;
    return auth;
  }
  if (staff && !isStaff()) {
    location.href = asset("index.html");
    return auth;
  }
  return auth;
}

export function params() {
  return new URLSearchParams(location.search);
}

window.Pareshani = { logout, toast, pageUrl, asset };
