/* USTIL 开放论坛 — 客户端状态（localStorage 持久化） */

import { POSTS, USERS } from "./data.js";

const KEY = "ustil-forum-v1";

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persist(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* 隐私模式等场景忽略 */ }
}

const saved = load();

export const state = {
  posts: saved?.posts ?? structuredClone(POSTS),
  likes: saved?.likes ?? {},          // { [postId|replyId]: true }
  user: saved?.user ?? null,          // 模拟登录态 { name, initials, tone }
  draft: saved?.draft ?? null,
};

export function save() { persist(state); }

/* —— 取数 —— */
export const getPost = (id) => state.posts.find((p) => p.id === id) ?? null;
export function getUser(id) {
  if (id === "guest") {
    return state.user
      ? { id: "guest", name: state.user.name, initials: state.user.initials, tone: state.user.tone ?? "clay", role: "社区成员", points: 0 }
      : { id: "guest", name: "访客", initials: "GU", tone: "clay", role: "社区成员", points: 0 };
  }
  return USERS[id] ?? { id, name: id, initials: "?", tone: "clay", role: "成员", points: 0 };
}

export function sortedPosts({ cat = "all", sort = "new", tag = null, query = "" } = {}) {
  let list = state.posts.filter((p) => (cat === "all" || p.cat === cat));
  if (tag) list = list.filter((p) => p.tags?.includes(tag));
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter((p) =>
      [p.title, p.excerpt, ...(p.body ?? []), ...(p.tags ?? [])].join(" ").toLowerCase().includes(q) ||
      (p.replies ?? []).some((r) => r.body.join(" ").toLowerCase().includes(q))
    );
  }
  const sorted = [...list];
  if (sort === "hot") sorted.sort((a, b) => (b.likes + b.views / 50 + b.replies.length * 8) - (a.likes + a.views / 50 + a.replies.length * 8));
  else if (sort === "unsolved") sorted.sort((a, b) => Number(a.solved) - Number(b.solved) || +new Date(b.createdAt) - +new Date(a.createdAt));
  else sorted.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  // 置顶始终靠前
  return sorted.sort((a, b) => Number(b.pinned) - Number(a.pinned));
}

/* —— 变更 —— */
export function toggleLike(key) {
  if (state.likes[key]) delete state.likes[key];
  else state.likes[key] = true;
  save();
  return Boolean(state.likes[key]);
}
export const isLiked = (key) => Boolean(state.likes[key]);

export function addPost({ title, cat, tags, body }) {
  const id = "u" + Date.now().toString(36);
  const paras = body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  state.posts.unshift({
    id, pinned: false, solved: false, cat,
    title, excerpt: paras[0] ?? "",
    author: "guest", createdAt: new Date().toISOString(),
    likes: 0, views: 1, tags, body: paras, replies: [], mine: true,
  });
  save();
  return id;
}

export function addReply(postId, body) {
  const post = getPost(postId);
  if (!post) return null;
  const paras = body.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const reply = {
    id: "r" + Date.now().toString(36),
    author: "guest", createdAt: new Date().toISOString(),
    likes: 0, body: paras, nested: false, mine: true,
  };
  post.replies.push(reply);
  save();
  return reply.id;
}

export function login(name) {
  const initials = name.trim().slice(0, 2).toUpperCase();
  state.user = { name: name.trim(), initials, tone: "clay" };
  save();
}
export function logout() { state.user = null; save(); }

/* —— 格式化 —— */
export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}
