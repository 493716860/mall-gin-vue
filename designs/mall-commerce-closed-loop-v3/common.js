(() => {
  const paths = {
    search: '<circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path>',
    home: '<path d="m3 10 9-7 9 7"></path><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"></path>',
    user: '<circle cx="12" cy="8" r="4"></circle><path d="M4 21c.8-4 3.4-6 8-6s7.2 2 8 6"></path>',
    bag: '<path d="M5 8h14l1 13H4L5 8Z"></path><path d="M9 9V6a3 3 0 0 1 6 0v3"></path>',
    cart: '<path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 1.9-1.4L22 8H6"></path><circle cx="10" cy="21" r="1"></circle><circle cx="18" cy="21" r="1"></circle>',
    member: '<path d="m12 3 2.6 5.3 5.9.8-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.8L12 3Z"></path>',
    gift: '<rect x="3" y="8" width="18" height="13" rx="2"></rect><path d="M12 8v13M3 12h18M12 8H7.5a2.5 2.5 0 1 1 2.4-3.2L12 8Zm0 0h4.5a2.5 2.5 0 1 0-2.4-3.2L12 8Z"></path>',
    order: '<path d="M6 3h12l2 3v15H4V6l2-3Z"></path><path d="M4 7h16M8 11h8M8 15h6"></path>',
    truck: '<path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z"></path><circle cx="7" cy="19" r="2"></circle><circle cx="18" cy="19" r="2"></circle>',
    heart: '<path d="M20.8 8.8c0 5.2-8.8 10-8.8 10S3.2 14 3.2 8.8a4.5 4.5 0 0 1 8.8-1.3 4.5 4.5 0 0 1 8.8 1.3Z"></path>',
    service: '<path d="M4 13v-2a8 8 0 0 1 16 0v2"></path><path d="M4 13h3v6H5a2 2 0 0 1-2-2v-2a2 2 0 0 1 1-2Zm16 0h-3v6h2a2 2 0 0 0 2-2v-2a2 2 0 0 0-1-2Zm-8 8h3"></path>',
    chat: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2 1-4.5A7.5 7.5 0 1 1 20 11.5Z"></path><path d="M8 11h.01M12 11h.01M16 11h.01"></path>',
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="m19.4 15 .1.1 1.3 1-1.5 2.6-1.6-.6a8 8 0 0 1-1.5.9l-.3 1.7h-3l-.3-1.7a8 8 0 0 1-1.5-.9l-1.6.6L8 16.1l1.3-1a7 7 0 0 1 0-1.8l-1.3-1 1.5-2.6 1.6.6a8 8 0 0 1 1.5-.9l.3-1.7h3l.3 1.7a8 8 0 0 1 1.5.9l1.6-.6 1.5 2.6-1.3 1a7 7 0 0 1-.1 1.7Z"></path>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"></rect><path d="M10 5h4M11 18.5h2"></path>',
    headphones: '<path d="M4 13v-2a8 8 0 0 1 16 0v2"></path><rect x="3" y="12" width="4" height="7" rx="2"></rect><rect x="17" y="12" width="4" height="7" rx="2"></rect>',
    homeGoods: '<path d="m3 11 9-8 9 8"></path><path d="M5 10v11h14V10M9 21v-6h6v6"></path>',
    coffee: '<path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm12 2h2a2 2 0 1 1 0 4h-2M8 4v2m4-2v2"></path>',
    spark: '<path d="m12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3ZM19 16l.6 2.4L22 19l-2.4.6L19 22l-.6-2.4L16 19l2.4-.6L19 16Z"></path>',
    run: '<circle cx="15" cy="5" r="2"></circle><path d="m10 22 2-6-3-3-3 3-3-1m9-2 4 2 3 4m-8-8 3-3 3 2 3-1"></path>',
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect>',
    plus: '<path d="M12 5v14M5 12h14"></path>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"></path>',
    chevron: '<path d="m9 18 6-6-6-6"></path>',
    close: '<path d="m6 6 12 12M18 6 6 18"></path>',
    tag: '<path d="M20 13 11 22l-9-9V2h11l7 7a3 3 0 0 1 0 4Z"></path><circle cx="7" cy="7" r="1"></circle>',
    box: '<path d="m12 3 9 5-9 5-9-5 9-5Z"></path><path d="M3 8v9l9 5 9-5V8m-9 5v9"></path>',
    chart: '<path d="M4 19V5m0 14h17M8 15l3-4 3 2 5-6"></path>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"></rect><circle cx="8.5" cy="9" r="1.5"></circle><path d="m21 15-5-5L5 20"></path>',
    edit: '<path d="m15 5 4 4M4 20l4-.8L19 8a2.8 2.8 0 0 0-4-4L4 15l-0.8 5Z"></path>',
    upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 16v4h16v-4"></path>',
    check: '<path d="m5 12 4 4L19 6"></path>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 10h18"></path>',
    file: '<path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10Z"></path><path d="M13 3v7h7M8 14h8m-8 4h8"></path>'
  };

  const icon = (name, cls = "") =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;

  const escapeHtml = (value = "") =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));

  const money = value => `¥${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  function toast(message) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__mallToastTimer);
    window.__mallToastTimer = setTimeout(() => el.classList.remove("show"), 2100);
  }

  function openModal(title, body, actions = "") {
    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML = `
      <section class="modal" role="dialog" aria-modal="true">
        <header class="modal-head"><span>${title}</span><button class="modal-close" type="button" aria-label="关闭">×</button></header>
        <div class="modal-body">${body}</div>
        ${actions ? `<footer class="modal-actions">${actions}</footer>` : ""}
      </section>`;
    backdrop.addEventListener("click", event => {
      if (event.target === backdrop || event.target.closest(".modal-close")) closeModal();
    });
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function closeModal() {
    document.querySelector(".modal-backdrop")?.remove();
  }

  const miniTabs = [
    ["home", "首页", "home", "mini-home.html"],
    ["membership", "会员中心", "member", "mini-membership.html"],
    ["cart", "购物车", "cart", "mini-cart.html"],
    ["profile", "我的", "user", "mini-profile.html"]
  ];

  function tabbar(active) {
    return `<nav class="tabbar" aria-label="底部导航">${miniTabs.map(([key, label, glyph, href]) =>
      `<a class="tab-item ${key === active ? "active" : ""}" href="${href}">${icon(glyph)}<span>${label}</span></a>`
    ).join("")}</nav>`;
  }

  function adminShell(active, content) {
    const nav = [
      ["overview", "经营总览", "chart", "admin-overview.html"],
      ["orders", "订单管理", "order", "admin-orders.html"],
      ["aftersales", "售后管理", "service", "admin-aftersales.html"],
      ["marketing", "营销中心", "gift", "admin-marketing.html"],
      ["distribution", "分销管理", "chart", "admin-distribution.html"],
      ["logistics", "快递 / 物流", "truck", "admin-logistics.html"],
      ["users", "用户管理", "user", "admin-users.html"],
      ["products", "商品管理", "box", "admin-products.html"],
      ["membership", "会员等级", "member", "admin-membership.html"],
      ["banners", "Banner 与专区", "image", "admin-banner-zones.html"]
    ];
    return `<div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="admin-brand"><span class="brand-mark">M</span><div><div class="brand-title">MALL STUDIO</div><div class="brand-caption">运营管理平台</div></div></div>
        <div class="nav-label">商城运营</div>
        <nav class="admin-nav">${nav.map(([key, title, glyph, href]) =>
          `<a class="${key === active ? "active" : ""}" href="${href}">${icon(glyph)}<span>${title}</span></a>`
        ).join("")}</nav>
        <div class="nav-label" style="margin-top:22px">工作台</div>
        <nav class="admin-nav"><a href="index.html">${icon("chart")}<span>原型总览</span></a></nav>
        <div class="sidebar-bottom"><div class="sidebar-user"><span class="sidebar-avatar">林</span><div><strong>林运营</strong><small>超级管理员</small></div></div></div>
      </aside>
      <main class="admin-main">
        <header class="admin-topbar"><div class="breadcrumbs">商城运营　/　<strong>${nav.find(item => item[0] === active)?.[1] || "工作台"}</strong></div><div class="admin-top-actions"><span>⌕　帮助中心</span><span>●</span><span>林运营　⌄</span></div></header>
        <nav class="mobile-admin-nav">${nav.map(([key, title, glyph, href]) =>
          `<a class="filter-chip ${key === active ? "active" : ""}" href="${href}">${title}</a>`
        ).join("")}</nav>
        ${content}
      </main>
    </div>`;
  }

  window.MallUI = { icon, escapeHtml, money, toast, openModal, closeModal, tabbar, adminShell };
})();
