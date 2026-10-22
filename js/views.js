/* USTIL 开放论坛 — 页面视图（原创实现） */

import { CATEGORIES, TAGS, EVENTS, USERS, HOME_STATS } from "./data.js";
import { state, save, sortedPosts, getPost, getUser, timeAgo, isLiked, toggleLike, addPost, addReply, login, logout } from "./store.js";
import { esc, md, catOf, avatar, icon, topicCard, toast, LOGO } from "./ui.js";

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ================= 首页 ================= */
export function renderHome({ cat = "all", sort = "new", tag = null, query = "" } = {}) {
  const posts = sortedPosts({ cat, sort, tag, query });
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, sortedPosts({ cat: c.id }).length]));

  return `
  <section class="hero">
    <div class="container">
      <div class="hero-grid">
        <div>
          <p class="hero-kicker">开放原子 · USTIL 学生开源社区</p>
          <h1>把好奇心，<br>变成<em>能被用到</em>的东西</h1>
          <p class="hero-sub">USTIL 开放论坛是校园开源社区的公共讨论区：提问、协作、复盘、招新 —— 用开放的方式，把想法推进到有人在用。</p>
          <div class="hero-cta">
            <a class="btn btn-clay btn-lg" href="#/new">发布主题 ${icon("arrow")}</a>
            <a class="btn btn-outline btn-lg" href="#board">浏览全部讨论</a>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><b>${HOME_STATS.members}</b><span>社区成员</span></div>
            <div class="hero-stat"><b>${HOME_STATS.topics}</b><span>累计讨论</span></div>
            <div class="hero-stat"><b>${HOME_STATS.projects}</b><span>孵化项目</span></div>
            <div class="hero-stat"><b>${HOME_STATS.events}</b><span>年度活动</span></div>
          </div>
        </div>
        <aside class="hero-panel" aria-label="正在热议">
          <h2>正在热议</h2>
          <p>过去 48 小时讨论最活跃的三个话题</p>
          <div class="topic-mini">
            ${sortedPosts({ sort: "hot" }).slice(0, 3).map((p) => `
              <a href="#/t/${p.id}">
                <span class="tm-cat">${esc(catOf(p.cat).name)}</span>
                <span class="tm-title">${esc(p.title)}</span>
              </a>`).join("")}
          </div>
        </aside>
      </div>
    </div>
  </section>

  <div class="container" id="board">
    <div class="layout">
      <main>
        <div class="section-head">
          <h2>${query ? `“${esc(query)}” 的搜索结果` : tag ? `#${esc(tag)} 话题` : cat === "all" ? "全部讨论" : esc(catOf(cat).name)}</h2>
          <span class="hint">共 ${posts.length} 个主题</span>
        </div>

        <div class="filter-bar" role="tablist" aria-label="分类筛选">
          <button class="chip ${cat === "all" ? "active" : ""}" data-cat="all" role="tab">全部<span class="n">${state.posts.length}</span></button>
          ${CATEGORIES.map((c) => `
            <button class="chip ${cat === c.id ? "active" : ""}" data-cat="${c.id}" role="tab">${esc(c.name)}<span class="n">${counts[c.id]}</span></button>`).join("")}
        </div>
        <div class="filter-bar" aria-label="排序">
          <button class="chip ${sort === "new" ? "active" : ""}" data-sort="new">最新</button>
          <button class="chip ${sort === "hot" ? "active" : ""}" data-sort="hot">最热</button>
          <button class="chip ${sort === "unsolved" ? "active" : ""}" data-sort="unsolved">等待解答</button>
          ${(tag || query) ? '<a class="chip active" href="#/">清除筛选 ✕</a>' : ""}
        </div>

        <div class="topic-list">
          ${posts.length ? posts.map((p) => topicCard(p, { getUser, timeAgo, isLiked })).join("") : `
            <div class="empty"><b>没有找到匹配的主题</b>换个关键词，或者 <a href="#/new" style="color:var(--clay)">发起一个新话题</a>。</div>`}
        </div>
      </main>
      ${sidebar()}
    </div>
  </div>`;
}

/* ================= 侧栏 ================= */
function sidebar() {
  return `
  <aside class="side" aria-label="社区信息">
    <section class="panel">
      <h3>关于 USTIL</h3>
      <p class="about-text"><b>开放原子 USTIL</b> 是一个由学生自主运营的开源社区：我们维护项目、举办黑客松、写文档，也欢迎每一个「只是想来看看」的同学。</p>
      <div class="stat-rows">
        <div><b>${HOME_STATS.members}</b><span>成员</span></div>
        <div><b>${HOME_STATS.projects}</b><span>项目</span></div>
        <div><b>4</b><span>SIG 小组</span></div>
      </div>
    </section>

    <section class="panel">
      <h3>近期活动</h3>
      ${EVENTS.map((e) => `
        <div class="event-item">
          <div class="event-date"><b>${e.day}</b><span>${e.month}</span></div>
          <div><div class="ev-title">${esc(e.title)}</div><div class="ev-sub">${esc(e.sub)}</div></div>
        </div>`).join("")}
    </section>

    <section class="panel">
      <h3>热门标签</h3>
      <div class="tag-cloud">
        ${TAGS.map((t) => `<a class="tag tag-hash" href="#/?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}
      </div>
    </section>

    <section class="panel">
      <h3>本月贡献者</h3>
      ${Object.values(USERS).slice(0, 5).map((u) => `
        <div class="leader-row">
          ${avatar(u)}
          <div><div class="lr-name">${esc(u.name)}</div><div class="lr-sub">${esc(u.role)}</div></div>
          <div class="lr-num">${u.points} pts</div>
        </div>`).join("")}
    </section>
  </aside>`;
}

/* ================= 帖子详情 ================= */
export function renderThread(id) {
  const post = getPost(id);
  if (!post) return `<div class="container"><div class="empty" style="margin-top:3rem"><b>主题不存在</b>它可能已被删除，<a href="#/" style="color:var(--clay)">回到首页</a>。</div></div>`;
  const cat = catOf(post.cat);
  const author = getUser(post.author);

  return `
  <div class="container">
    <article class="thread">
      <nav class="crumbs" aria-label="面包屑">
        <a href="#/">首页</a> <span>/</span>
        <a href="#/?cat=${cat.id}">${esc(cat.name)}</a> <span>/</span>
        <span>主题</span>
      </nav>

      <div class="thread-head">
        <div class="tc-top">
          <span class="tag tag-cat" data-tone="${esc(cat.tone)}">${esc(cat.name)}</span>
          ${(post.tags ?? []).map((t) => `<a class="tag tag-hash" href="#/?tag=${encodeURIComponent(t)}">#${esc(t)}</a>`).join("")}
          ${post.solved ? '<span class="q-badge solved" style="background:var(--mineral);color:#fff;padding:.12rem .55rem;border-radius:6px;font-size:.72rem">已解决</span>' : ""}
        </div>
        <h1>${esc(post.title)}</h1>
        <div class="tc-meta">
          <span class="who">${avatar(author, "lg")} ${esc(author.name)} · ${esc(author.role)}</span>
          <span class="num">${timeAgo(post.createdAt)}</span>
          <span class="num">${icon("eye")} ${post.views}</span>
          <span class="num">${icon("reply")} ${post.replies.length} 条回复</span>
        </div>
      </div>

      <div class="post-block">
        <div class="pb-body">${(post.body ?? []).map((p) => `<p>${md(p)}</p>`).join("")}</div>
        <div class="pb-actions">
          <button class="act ${isLiked(post.id) ? "on" : ""}" data-like="${post.id}">${icon("heart")} 赞 <span>${post.likes + (isLiked(post.id) ? 1 : 0)}</span></button>
          <button class="act" data-focus-reply>${icon("reply")} 回复</button>
          <button class="act" data-share>${icon("arrow")} 分享链接</button>
        </div>
      </div>

      <section class="replies">
        <div class="replies-head">
          <h2>${post.replies.length} 条回复</h2>
          <div class="sort-mini">
            <button class="chip active">按时间</button>
            <button class="chip">按热度</button>
          </div>
        </div>
        ${post.replies.length ? post.replies.map((r, i) => replyBlock(post, r, i)).join("") : `
          <div class="empty"><b>还没有回复</b>成为第一个分享看法的人。</div>`}
      </section>

      <form class="composer" id="reply-form">
        <label for="reply-input" class="sr-only" style="position:absolute;left:-9999px">写下你的回复</label>
        <textarea id="reply-input" placeholder="写下你的回复…… 支持 **粗体**、\u0060代码\u0060 与 > 引用" required></textarea>
        <div class="cmp-foot">
          <span class="hint">友善、具体、可复现 —— 社区公约 v1.2</span>
          <button class="btn btn-primary" type="submit">发布回复</button>
        </div>
      </form>
    </article>
  </div>`;
}

function replyBlock(post, r, i) {
  const u = getUser(r.author);
  return `
  <div class="reply ${r.nested ? "nested" : ""}" id="${r.id}">
    <div class="r-head">
      ${avatar(u)}
      <span class="r-name">${esc(u.name)}</span>
      <span class="r-time">${timeAgo(r.createdAt)}</span>
      <span class="r-floor">#${i + 1}</span>
    </div>
    <div class="r-body">${r.body.map((p) => `<p>${md(p)}</p>`).join("")}</div>
    <div class="pb-actions">
      <button class="act ${isLiked(r.id) ? "on" : ""}" data-like="${r.id}">${icon("heart")} <span>${r.likes + (isLiked(r.id) ? 1 : 0)}</span></button>
      <button class="act" data-quote="${esc(u.name)}">${icon("reply")} 回复</button>
    </div>
  </div>`;
}

/* ================= 发帖 ================= */
export function renderCompose() {
  return `
  <div class="container compose-page">
    <h1>发布新主题</h1>
    <p class="lead">把问题描述清楚，把上下文补齐 —— 好的问题本身就是一半的答案。</p>
    <form class="form-grid" id="compose-form">
      <div class="field">
        <label for="f-title">标题</label>
        <input id="f-title" type="text" placeholder="一句话说清你要讨论什么" required maxlength="80">
        <div class="hint">好的标题包含「对象 + 场景 + 问题」，例如：M1 上交叉编译 RISC-V 内核时链接报错</div>
      </div>
      <div class="field">
        <label for="f-cat">板块</label>
        <select id="f-cat" required>
          ${CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)} —— ${esc(c.desc)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="f-tags">标签（可选，逗号分隔）</label>
        <input id="f-tags" type="text" placeholder="例如：Git, 新手村">
      </div>
      <div class="field">
        <label for="f-body">正文</label>
        <textarea id="f-body" placeholder="支持 **粗体**、\`代码\`、> 引用。空行分段。求助帖请附环境与复现步骤。" required></textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary btn-lg" type="submit">发布</button>
        <button class="btn btn-secondary btn-lg" type="button" data-save-draft>存草稿</button>
        <a class="btn btn-ghost btn-lg" href="#/">取消</a>
      </div>
    </form>
  </div>`;
}

/* ================= 关于页 ================= */
export function renderAbout() {
  return `
  <div class="container compose-page">
    <h1>关于 开放原子 USTIL</h1>
    <p class="lead">一个把「开源」当作动词的学生社区。</p>
    <div class="post-block" style="margin-top:0">
      <div class="pb-body">
        <p><strong>USTIL</strong>（University Student Technology & Innovation Lab）是开放原子开源基金会旗下的校园组织，成立于 2023 年。我们相信最好的学习方式是把东西做出来，放到真实用户手里。</p>
        <p>社区目前有四个兴趣小组（SIG）：<strong>SIG-Compiler</strong>（编译器与系统工具）、<strong>SIG-Web</strong>（Web 与文档）、<strong>SIG-OS</strong>（操作系统与内核）、<strong>SIG-AI</strong>（负责任的 AI 应用）。每个 SIG 每两周一次开放例会，任何人都可以旁听。</p>
        <blockquote><p>「能公开讨论的就不要私聊解决；一个问题被解答一次，后来者就能被解答一百次。」</p></blockquote>
        <p>这个论坛本身也是社区的开源项目：前端为纯 HTML/CSS/JS 实现，界面风格参考了当代产品官网的版式语言（详见 <code>docs/claude-frontend-reverse-engineering.md</code> 的逆向分析与令牌映射），但所有标识、文案、代码均为原创。</p>
      </div>
      <div class="pb-actions">
        <a class="btn btn-clay" href="#/new">加入讨论</a>
        <a class="btn btn-secondary" href="#/">浏览全部主题</a>
      </div>
    </div>
  </div>`;
}

/* ================= 事件绑定（委托） ================= */
export function bindView(root, router) {
  // 分类 / 排序 chips
  root.addEventListener("click", (e) => {
    const catChip = e.target.closest("[data-cat]");
    if (catChip) {
      const cat = catChip.dataset.cat;
      router(cat === "all" ? "#/" : `#/?cat=${cat}`);
      return;
    }
    const sortChip = e.target.closest("[data-sort]");
    if (sortChip) {
      const q = new URLSearchParams((location.hash.split("?")[1] ?? ""));
      q.set("sort", sortChip.dataset.sort);
      router(`#/?${q}`);
      return;
    }
    // 点赞
    const likeBtn = e.target.closest("[data-like]");
    if (likeBtn) {
      const on = toggleLike(likeBtn.dataset.like);
      likeBtn.classList.toggle("on", on);
      const span = likeBtn.querySelector("span");
      if (span) span.textContent = String(Number(span.textContent) + (on ? 1 : -1));
      toast(on ? "已点赞" : "已取消点赞");
      return;
    }
    const quoteBtn = e.target.closest("[data-quote]");
    if (quoteBtn) {
      const ta = $("#reply-input");
      if (ta) {
        ta.value = `> ${quoteBtn.dataset.quote}：\n\n` + ta.value;
        ta.focus();
      }
      return;
    }
    const focusReply = e.target.closest("[data-focus-reply]");
    if (focusReply) { $("#reply-input")?.focus(); return; }

    const share = e.target.closest("[data-share]");
    if (share) {
      navigator.clipboard?.writeText(location.href).then(() => toast("链接已复制")).catch(() => toast("复制失败，请手动复制地址栏"));
      return;
    }
    const draft = e.target.closest("[data-save-draft]");
    if (draft) {
      state.draft = {
        title: $("#f-title")?.value ?? "", cat: $("#f-cat")?.value ?? "general",
        tags: $("#f-tags")?.value ?? "", body: $("#f-body")?.value ?? "",
      };
      save();
      toast("草稿已保存");
      return;
    }
  });

  // 回复表单
  root.addEventListener("submit", (e) => {
    if (e.target.id === "reply-form") {
      e.preventDefault();
      const id = location.hash.split("/")[2]?.split("?")[0];
      const text = $("#reply-input").value.trim();
      if (!text) return;
      addReply(id, text);
      toast("回复已发布");
      router(`#/t/${id}`);
    }
    if (e.target.id === "compose-form") {
      e.preventDefault();
      const title = $("#f-title").value.trim();
      const cat = $("#f-cat").value;
      const tags = $("#f-tags").value.split(/[,，]/).map((s) => s.trim()).filter(Boolean).slice(0, 4);
      const body = $("#f-body").value.trim();
      if (!title || !body) return;
      const id = addPost({ title, cat, tags, body });
      toast("主题已发布");
      router(`#/t/${id}`);
    }
  });
}

/* ================= 登录弹层（轻量） ================= */
export function bindAuth(root, router) {
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-login]")) {
      const name = prompt("以昵称登录（演示用，本地保存）：", state.user?.name ?? "");
      if (name?.trim()) { login(name); toast(`欢迎，${name.trim()}`); router("#/"); }
    }
    if (e.target.closest("[data-logout]")) { logout(); toast("已退出"); router("#/"); }
  });
}

export const authButtons = () => state.user
  ? `<span class="btn btn-ghost" title="当前登录">${avatar({ ...state.user, initials: state.user.initials })} ${esc(state.user.name)}</span>
     <button class="btn btn-ghost" data-logout>退出</button>`
  : `<button class="btn btn-ghost" data-login>登录</button>`;
