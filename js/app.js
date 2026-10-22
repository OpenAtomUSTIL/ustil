/* USTIL 开放论坛 — 路由与页面骨架 */

import { CATEGORIES } from "./data.js";
import { state } from "./store.js";
import { esc, icon, LOGO, toast } from "./ui.js";
import {
  renderHome, renderThread, renderCompose, renderAbout,
  bindView, bindAuth, authButtons,
} from "./views.js";

const app = document.getElementById("app");

/* ---------- 顶栏 / 页脚 ---------- */
function header() {
  return `
  <header class="site-header" id="site-header">
    <div class="container">
      <div class="nav-row">
        <a class="brand" href="#/" aria-label="USTIL 开放论坛 首页">
          ${LOGO}
          <span>USTIL 开放论坛<small>OpenAtom Campus Chapter</small></span>
        </a>

        <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-main" aria-label="打开菜单">
          ${icon("menu")}
        </button>

        <nav class="nav-main" id="nav-main" aria-label="主导航">
          <div class="nav-item" data-dd>
            <button class="nav-trigger" aria-expanded="false" aria-haspopup="true">板块 ${icon("chevron")}</button>
            <div class="dropdown" role="menu">
              <div class="dd-title">讨论板块</div>
              ${CATEGORIES.map((c) => `
                <a role="menuitem" href="#/?cat=${c.id}">${esc(c.name)}<span>${esc(c.desc)}</span></a>`).join("")}
            </div>
          </div>
          <div class="nav-item" data-dd>
            <button class="nav-trigger" aria-expanded="false" aria-haspopup="true">参与 ${icon("chevron")}</button>
            <div class="dropdown" role="menu">
              <div class="dd-title">加入社区</div>
              <a role="menuitem" href="#/new">发布主题<span>提出问题、分享进展、发起讨论</span></a>
              <a role="menuitem" href="#/?cat=hire">招募与协作<span>组队参赛、项目招新</span></a>
              <a role="menuitem" href="#/?cat=events">活动与竞赛<span>黑客松、工作坊、讲座</span></a>
            </div>
          </div>
          <a class="nav-link" href="#/?cat=starter">新手村</a>
          <a class="nav-link" href="#/about">关于</a>
        </nav>

        <div class="nav-actions" id="nav-actions">
          ${authButtons()}
          <a class="btn btn-clay" href="#/new">发布主题</a>
        </div>
      </div>
    </div>
  </header>`;
}

function footer() {
  return `
  <footer class="site-footer theme-inverse">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <a class="brand" href="#/">${LOGO}<span>USTIL 开放论坛<small>OpenAtom Campus Chapter</small></span></a>
          <p>由学生自主运营的开源社区。所有讨论公开可溯，所有代码开源可复用 —— 包括你正在看的这个页面。</p>
        </div>
        <div class="footer-col">
          <h4>社区</h4>
          <a href="#/">全部讨论</a>
          <a href="#/?cat=general">综合讨论</a>
          <a href="#/?cat=sig">SIG 项目</a>
          <a href="#/?cat=help">求助问答</a>
        </div>
        <div class="footer-col">
          <h4>参与</h4>
          <a href="#/new">发布主题</a>
          <a href="#/?cat=hire">招募与协作</a>
          <a href="#/?cat=events">活动日历</a>
          <a href="#/about">加入 USTIL</a>
        </div>
        <div class="footer-col">
          <h4>资源</h4>
          <a href="#/?cat=starter">新手指南</a>
          <a href="#/?tag=${encodeURIComponent("文档")}">文档计划</a>
          <a href="#/about">SIG 手册</a>
          <a href="#/about">行为准则</a>
        </div>
        <div class="footer-col">
          <h4>关于</h4>
          <a href="#/about">社区介绍</a>
          <a href="#/about">联系我们</a>
          <a href="#/about">品牌资源</a>
          <a href="#/about">开放治理</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 开放原子 USTIL 学生开源社区 · 内容以 CC BY 4.0 共享</span>
        <span class="links">
          <a href="#/about">社区公约</a>
          <a href="#/about">隐私说明</a>
          <a href="#/about">无障碍</a>
        </span>
      </div>
    </div>
  </footer>`;
}

/* ---------- 路由 ---------- */
function parseHash() {
  const raw = location.hash || "#/";
  const [path, qs] = raw.split("?");
  const q = new URLSearchParams(qs ?? "");
  return {
    path,
    cat: q.get("cat") ?? "all",
    sort: q.get("sort") ?? "new",
    tag: q.get("tag"),
    query: q.get("q") ?? "",
  };
}

function render() {
  const { path, cat, sort, tag, query } = parseHash();
  let html;
  if (path.startsWith("#/t/")) html = renderThread(path.split("/")[2]);
  else if (path === "#/new") html = renderCompose();
  else if (path === "#/about") html = renderAbout();
  else html = renderHome({ cat, sort, tag, query });

  app.innerHTML = header() + `<main id="main">${html}</main>` + footer();
  bindChrome();
  window.scrollTo(0, 0);
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

/* ---------- 顶栏交互（每次渲染后重绑） ---------- */
function bindChrome() {
  const headerEl = document.getElementById("site-header");
  const onScroll = () => headerEl.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.onscroll = onScroll;

  // 移动端菜单
  const toggle = document.getElementById("nav-toggle");
  const navMain = document.getElementById("nav-main");
  toggle.addEventListener("click", () => {
    const open = navMain.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
  });

  // 下拉
  document.querySelectorAll("[data-dd]").forEach((item) => {
    const trigger = item.querySelector(".nav-trigger");
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const wasOpen = item.classList.contains("open");
      document.querySelectorAll("[data-dd].open").forEach((o) => {
        o.classList.remove("open");
        o.querySelector(".nav-trigger").setAttribute("aria-expanded", "false");
      });
      if (!wasOpen) {
        item.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
    item.addEventListener("mouseenter", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        item.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
    item.addEventListener("mouseleave", () => {
      if (window.matchMedia("(hover: hover)").matches) {
        item.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  });
}

/* ---------- 启动 ---------- */
// 委托监听只绑定一次（render 只换 innerHTML）
document.addEventListener("click", (e) => {
  if (e.target.closest("[data-dd]")) return;
  document.querySelectorAll("[data-dd].open").forEach((o) => {
    o.classList.remove("open");
    o.querySelector(".nav-trigger")?.setAttribute("aria-expanded", "false");
  });
});
bindView(document, go);
bindAuth(document, go);
window.addEventListener("hashchange", render);
render();

// 首次进入提示（可移除）
if (!localStorage.getItem("ustil-forum-v1")) {
  setTimeout(() => toast("欢迎来到 USTIL 开放论坛 · 这是前端演示，数据保存在本地"), 700);
}
