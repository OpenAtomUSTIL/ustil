/* USTIL 开放论坛 — UI 工具与小组件 */

import { CATEGORIES } from "./data.js";

/* —— 基础 —— */
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function md(text) {
  // 极简 Markdown：**粗体**、`代码`、段落、引用
  return esc(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^&gt;\s?(.*)$/gm, "<blockquote><p>$1</p></blockquote>");
}

export const catOf = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export function avatar(user, cls = "") {
  return `<span class="avatar ${cls}" data-tone="${esc(user.tone ?? "clay")}" aria-hidden="true">${esc(user.initials ?? "??")}</span>`;
}

/* —— 图标（内联 SVG，原创线性图标）—— */
const ICONS = {
  heart: '<path d="M12 20.5S3.5 15.2 3.5 9.6A4.6 4.6 0 0 1 12 6.8a4.6 4.6 0 0 1 8.5 2.8c0 5.6-8.5 10.9-8.5 10.9Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  reply: '<path d="M21 12a8 8 0 0 1-8 8H4l2.6-2.6A8 8 0 1 1 21 12Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  eye: '<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" fill="none" stroke="currentColor" stroke-width="1.7"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" stroke-width="1.7"/>',
  search: '<circle cx="11" cy="11" r="6.6" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m16 16 4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  chevron: '<path d="m2 5 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  bolt: '<path d="M13 2 4.5 13.5H11L9.5 22 19 10h-6.5L13 2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>',
  check: '<path d="m4.5 12.5 5 5 10-11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};
export const icon = (name, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;

/* —— 品牌标识（原创几何：原子轨道 + 火花）—— */
export const LOGO = `<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
  <circle cx="16" cy="16" r="3.1" fill="currentColor"/>
  <ellipse cx="16" cy="16" rx="13" ry="5.6" fill="none" stroke="currentColor" stroke-width="1.9" transform="rotate(28 16 16)"/>
  <ellipse cx="16" cy="16" rx="13" ry="5.6" fill="none" stroke="currentColor" stroke-width="1.9" transform="rotate(-28 16 16)"/>
  <circle cx="27.2" cy="10.2" r="2.1" fill="currentColor"/>
</svg>`;

/* —— 帖子卡片 —— */
export function topicCard(post, { getUser, timeAgo, isLiked }) {
  const cat = catOf(post.cat);
  const author = getUser(post.author);
  return `
  <a class="topic-card ${post.pinned ? "pinned" : ""}" href="#/t/${post.id}">
    <div class="tc-top">
      <span class="tag tag-cat" data-tone="${esc(cat.tone)}">${esc(cat.name)}</span>
      ${(post.tags ?? []).map((t) => `<span class="tag tag-hash">#${esc(t)}</span>`).join("")}
    </div>
    <h3>${post.solved ? '<span class="q-badge solved">已解决</span>' : post.cat === "help" ? '<span class="q-badge">求助</span>' : ""}${esc(post.title)}</h3>
    <p class="tc-excerpt">${esc(post.excerpt)}</p>
    <div class="tc-meta">
      <span class="who">${avatar(author)} ${esc(author.name)}</span>
      <span class="num ${isLiked(post.id) ? "liked" : ""}">${icon("heart")} ${post.likes + (isLiked(post.id) ? 1 : 0)}</span>
      <span class="num">${icon("reply")} ${post.replies.length}</span>
      <span class="num">${icon("eye")} ${post.views}</span>
      <span class="num">${timeAgo(post.createdAt)}</span>
    </div>
  </a>`;
}

/* —— Toast —— */
let toastWrap = null;
export function toast(msg) {
  if (!toastWrap) {
    toastWrap = document.createElement("div");
    toastWrap.className = "toast-wrap";
    toastWrap.setAttribute("role", "status");
    document.body.appendChild(toastWrap);
  }
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  toastWrap.appendChild(t);
  setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity 300ms"; setTimeout(() => t.remove(), 320); }, 2400);
}
