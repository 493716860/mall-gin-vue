(() => {
  const { read, write, image } = window.MallData;
  const { icon, escapeHtml: esc, money, toast, openModal, closeModal, tabbar } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  let state = read();
  let activeZoneFilter = "all";
  let carouselTimer;

  function captureShareLanding() {
    const shareToken = params.get("share");
    if (!shareToken) return;
    const visitorKey = sessionStorage.getItem("mall-share-visitor")
      || `anon_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem("mall-share-visitor", visitorKey);
    try {
      state = read();
      window.MallOps.resolveShareToken(state, shareToken, state.user.id, { bind: true });
      write(state);
      window.MallOps.recordShareEvent(shareToken, "landing_view", visitorKey);
      sessionStorage.setItem("mall-pending-share-token", shareToken);
    } catch {
      sessionStorage.removeItem("mall-pending-share-token");
    }
  }

  const tagNames = { top: "畅销", new: "新品", recommend: "推荐" };
  const zoneById = id => state.zones.find(zone => zone.id === id);
  const productById = id => state.products.find(product => product.id === id);
  const currentTier = () => [...state.tiers].sort((a, b) => a.points - b.points).filter(t => Number(state.user?.points ?? state.points) >= t.points).at(-1) || state.tiers[0];
  const percentOff = discount => Math.max(0, 100 - Number(discount || 100));

  function productTags(product) {
    return (product.tags || []).map(tag => `<span class="tag ${tag}">${tagNames[tag] || esc(tag)}</span>`).join("");
  }

  function productCard(product) {
    return `<article class="product-card" data-action="detail" data-id="${esc(product.id)}">
      <div class="product-image"><img loading="lazy" src="${product.image}" alt="${esc(product.name)}"></div>
      <div class="product-copy">
        <div class="product-name">${esc(product.name)}</div>
        <div class="product-sub">${esc(product.subtitle || "")}</div>
        <div class="product-price-row">
          <span class="price"><small>¥</small>${Number(product.price).toLocaleString("zh-CN")}</span>
          ${product.original ? `<span class="old-price">¥${Number(product.original).toLocaleString("zh-CN")}</span>` : ""}
          ${productTags(product)}
          <button class="card-button" type="button" data-action="add-cart" data-id="${esc(product.id)}" aria-label="加入购物车">${icon("plus")}</button>
        </div>
      </div>
    </article>`;
  }

  function miniShell({ pageTitle = "", active, content, header = "", bottom = "" }) {
    root.innerHTML = `<div class="phone-stage"><div class="phone"><div class="mini-shell">
      <header class="mini-head">${header || `<div class="mini-head-row"><span class="mini-title">${pageTitle}</span><span></span></div>`}</header>
      <main class="mini-main" id="mini-main">${content}</main>
      ${bottom}
      ${tabbar(active)}
    </div></div></div>`;
  }

  function homeHeader() {
    return `<div class="mini-head-row"><span style="font-size:18px;font-weight:800;letter-spacing:-1px">M<span style="color:var(--orange)">i</span></span>
      <label class="search-box" style="flex:1;margin-left:8px">${icon("search")}<input id="home-search" type="search" placeholder="搜索商品" aria-label="搜索商品"></label>
      <a href="mini-cart.html" aria-label="购物车" style="color:#666">${icon("cart")}</a></div>`;
  }

  function bannerSlides() {
    const banners = state.banners.filter(banner => banner.enabled);
    if (!banners.length) return `<div class="hero-carousel" style="display:grid;place-items:center;color:#999;font-size:12px">暂无 Banner，请在运营后台添加</div>`;
    return `<section class="hero-carousel" id="hero-carousel" aria-label="商城活动轮播">
      ${banners.map((banner, index) => `<a class="hero-slide ${index === 0 ? "active" : ""}" href="${esc(banner.target || "mini-shop.html")}">
        <img src="${banner.image}" alt="${esc(banner.title)}">
        <div class="hero-shade"></div><div class="hero-copy"><span class="hero-kicker">${esc(banner.label || "精选推荐")}</span>
          <h2>${esc(banner.title)}</h2><p>${esc(banner.subtitle || "")}</p><span class="hero-cta">立即选购 ${icon("arrow")}</span></div>
      </a>`).join("")}
      <div class="carousel-dots">${banners.map((_, index) => `<button class="carousel-dot ${index === 0 ? "active" : ""}" data-action="banner-dot" data-index="${index}" aria-label="第 ${index + 1} 张"></button>`).join("")}</div>
    </section>`;
  }

  function renderHome() {
    state = read();
    const zones = [...state.zones].sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 8);
    const topProducts = state.products.filter(product => product.status === "on" && product.tags?.includes("top")).slice(0, 8);
    const productSection = topProducts.length
      ? topProducts.map(productCard).join("")
      : `<div class="white-card" style="grid-column:1/-1;color:#999;text-align:center;font-size:11px">后台暂无「畅销」商品，前往商品管理添加畅销标签</div>`;
    miniShell({
      active: "home",
      header: homeHeader(),
      content: `<div class="mini-content home-content">
        ${bannerSlides()}
        <section class="section" style="margin-top:14px">
          <div class="zone-grid">${zones.map(zone => `<a class="zone-link" href="mini-zone.html?zone=${encodeURIComponent(zone.id)}">
            <span class="zone-icon">${icon(zone.icon)}</span><span>${esc(zone.name)}</span>
          </a>`).join("")}</div>
        </section>
        <section class="section">
          <div class="section-head"><h2>畅销商品</h2><a href="mini-shop.html">全部 ${icon("chevron")}</a></div>
          <div class="product-grid">${productSection}</div>
        </section>
        <div class="mini-notice">精选好物 · 用心生活</div>
      </div>`
    });
    bindHomeSearch();
    bindCarousel();
  }

  function bindHomeSearch() {
    const input = document.getElementById("home-search");
    input?.addEventListener("keydown", event => {
      if (event.key === "Enter" && input.value.trim()) location.href = `mini-shop.html?q=${encodeURIComponent(input.value.trim())}`;
    });
  }

  function bindCarousel() {
    clearInterval(carouselTimer);
    const carousel = document.getElementById("hero-carousel");
    if (!carousel) return;
    const slides = [...carousel.querySelectorAll(".hero-slide")];
    const dots = [...carousel.querySelectorAll(".carousel-dot")];
    if (slides.length < 2) return;
    let index = 0;
    const show = next => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle("active", i === index));
      dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
    };
    dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));
    let startX = 0;
    carousel.addEventListener("touchstart", event => { startX = event.touches[0].clientX; }, { passive: true });
    carousel.addEventListener("touchend", event => {
      const delta = event.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 28) show(index + (delta < 0 ? 1 : -1));
    }, { passive: true });
    carouselTimer = setInterval(() => show(index + 1), 4300);
  }

  function renderShop() {
    state = read();
    const query = params.get("q") || "";
    const category = params.get("category") || "all";
    const zones = state.zones;
    const matching = state.products.filter(product => {
      const queryMatch = !query || `${product.name} ${product.subtitle}`.toLowerCase().includes(query.toLowerCase());
      const categoryMatch = category === "all" || product.parent === category || product.category === category;
      return product.status === "on" && queryMatch && categoryMatch;
    });
    const filters = [["all", "全部商品"], ...zones.map(zone => [zone.id, zone.name])];
    miniShell({
      active: "home",
      pageTitle: "商城",
      header: `<div class="mini-head-row"><a href="mini-home.html" aria-label="返回首页" style="color:#666">${icon("chevron")}</a><span class="mini-title small">商城</span><span></span></div>
        <label class="search-box" style="margin-top:10px">${icon("search")}<input id="shop-search" type="search" value="${esc(query)}" placeholder="搜索商品"></label>`,
      content: `<div class="mini-content">
        <div class="toolbar-row">${filters.map(([id, name]) => `<button class="filter-chip ${category === id ? "active" : ""}" data-action="shop-filter" data-category="${esc(id)}">${esc(name)}</button>`).join("")}</div>
        <div class="section-head" style="margin-top:1px"><h2>${category === "all" ? "全部商品" : esc(zoneById(category)?.name || "精选商品")}</h2><span style="color:#aaa;font-size:10px">${matching.length} 件</span></div>
        ${matching.length ? `<div class="product-grid">${matching.map(productCard).join("")}</div>` : `<div class="empty-state" style="min-height:280px"><strong>暂时没有找到相关商品</strong><p>换个关键词或分类试试</p></div>`}
      </div>`
    });
    const search = document.getElementById("shop-search");
    search?.addEventListener("keydown", event => {
      if (event.key === "Enter") location.href = `mini-shop.html?q=${encodeURIComponent(search.value.trim())}&category=${encodeURIComponent(category)}`;
    });
  }

  function renderZone() {
    state = read();
    const zoneId = params.get("zone") || "digital";
    const zone = zoneById(zoneId) || state.zones[0];
    const subcats = zone.subcats || [];
    const matching = state.products.filter(product => product.status === "on" && product.parent === zone.id && (activeZoneFilter === "all" || product.category === activeZoneFilter));
    const bannerProduct = matching[0] || state.products.find(product => product.parent === zone.id);
    miniShell({
      active: "home",
      header: `<div class="mini-head-row"><a href="mini-home.html" aria-label="返回首页" style="color:#666">${icon("chevron")}</a><span class="mini-title small">${esc(zone.name)}</span><span></span></div>`,
      content: `<div class="mini-content">
        <div class="zone-banner">
          <div class="zone-banner-copy"><span class="hero-kicker">MI SELECT</span><h2>${esc(zone.name)}</h2><p>发现适合你的品质好物</p></div>
          ${bannerProduct ? `<img src="${bannerProduct.image}" alt="${esc(zone.name)}精选商品">` : ""}
        </div>
        <div class="subcat-strip toolbar-row"><button class="filter-chip ${activeZoneFilter === "all" ? "active" : ""}" data-action="zone-filter" data-category="all">全部</button>
          ${subcats.map(subcat => `<button class="filter-chip ${activeZoneFilter === subcat.id ? "active" : ""}" data-action="zone-filter" data-category="${esc(subcat.id)}">${esc(subcat.name)}</button>`).join("")}
        </div>
        <div class="section-head" style="margin-top:6px"><h2>${activeZoneFilter === "all" ? "专区好物" : esc(subcats.find(item => item.id === activeZoneFilter)?.name || "专区好物")}</h2><span style="font-size:10px;color:#aaa">${matching.length} 件</span></div>
        ${matching.length ? `<div class="product-grid">${matching.map(productCard).join("")}</div>` : `<div class="empty-state" style="min-height:270px"><strong>该分类商品即将上新</strong><p>看看专区内的其他精选商品</p></div>`}
      </div>`
    });
  }

  function renderMembership() {
    state = read();
    const tiers = [...state.tiers].sort((a, b) => a.points - b.points);
    const current = tiers.filter(tier => state.points >= tier.points).at(-1) || tiers[0];
    const next = tiers.find(tier => tier.points > state.points);
    const points = Number(state.user?.points ?? state.points);
    const progress = next ? Math.min(100, Math.round((points - current.points) / (next.points - current.points) * 100)) : 100;
    const moneyOff = discount => discount === 100 ? "会员专享价" : `全场 ${Number(discount) / 10} 折`;
    miniShell({
      active: "membership",
      pageTitle: "会员中心",
      header: `<div class="mini-head-row"><span class="mini-title">会员中心</span><a href="mini-profile.html" class="head-link">我的 ${icon("chevron")}</a></div>`,
      content: `<div class="mini-content" style="padding-top:0">
        <section class="membership-hero">
          <div class="section-head"><h2>会员等级</h2><span style="font-size:10px;color:#999">左右滑动查看全部</span></div>
          <div class="tier-track" id="tier-track">${tiers.map((tier, index) => `<article class="tier-card ${tier.id} ${tier.id === current.id ? "current" : ""}" data-tier="${esc(tier.id)}">
            <div class="tier-top"><span class="tier-name">${esc(tier.name)}</span><span class="tier-mark">${tier.id === current.id ? "CURRENT" : `LEVEL 0${index + 1}`}</span></div>
            <div class="tier-discount">${tier.discount === 100 ? "會員價" : `${Number(tier.discount) / 10} 折`}<small>${esc(moneyOff(tier.discount))}</small></div>
            <div class="tier-benefit">${esc(tier.benefits)}</div><div class="tier-threshold">${Number(tier.points).toLocaleString()} 积分起</div>
          </article>`).join("")}</div>
        <div class="tier-current-line"><span>当前等级　<strong>${esc(current.name)}</strong></span><span>${points.toLocaleString()} 积分</span></div>
          <div class="progress-track"><div class="progress-value" style="width:${progress}%"></div></div>
          <div class="progress-hint"><span>${next ? `距离 ${esc(next.name)} 还差 ${(next.points - points).toLocaleString()} 积分` : "已达到最高等级"}</span><span>${progress}%</span></div>
        </section>
        <section class="section">
          <div class="section-head"><h2>等级权益一览</h2><span style="font-size:10px;color:#aaa">权益随等级升级</span></div>
          <div class="benefit-card"><table class="benefit-table"><thead><tr><th>会员权益</th>${tiers.map(tier => `<th class="${tier.id === current.id ? "current-col" : ""}">${esc(tier.name.replace("会员", ""))}</th>`).join("")}</tr></thead>
            <tbody><tr><td>等级门槛</td>${tiers.map(tier => `<td class="${tier.id === current.id ? "current-col" : ""}">${Number(tier.points).toLocaleString()}</td>`).join("")}</tr>
            <tr><td>购物折扣</td>${tiers.map(tier => `<td class="${tier.id === current.id ? "current-col" : ""}">${tier.discount === 100 ? "会员价" : `${Number(tier.discount) / 10} 折`}</td>`).join("")}</tr>
            <tr><td>积分加赠</td>${tiers.map((tier, i) => `<td class="${tier.id === current.id ? "current-col" : ""}">${i === 0 ? "1 倍" : `${1 + i * .2} 倍`}</td>`).join("")}</tr>
            <tr><td>专属礼遇</td>${tiers.map((tier, i) => `<td class="${tier.id === current.id ? "current-col" : ""}">${i < 2 ? "—" : i === 2 ? "月礼券" : "新品优先"}</td>`).join("")}</tr></tbody>
          </table></div>
        </section>
        <section class="section white-card"><a class="list-link" href="#points" data-action="points"><strong>积分明细</strong><span>查看获取与使用记录 ${icon("chevron")}</span></a>
          <div class="list-link"><span>积分有效期</span><span>积分自获得之日起 12 个月有效</span></div></section>
        <div class="mini-notice">会员等级与折扣由商城运营后台配置</div>
      </div>`
    });
  }

  function renderCart() {
    state = read();
    const rows = state.cart.map(item => ({ item, product: productById(item.productId) })).filter(entry => entry.product);
    const selected = rows.filter(({ item }) => item.selected);
    const total = selected.reduce((sum, { item, product }) => sum + Number(product.price) * item.qty, 0);
    const allSelected = rows.length > 0 && selected.length === rows.length;
    let edit = false;
    const cartRows = rows.map(({ item, product }) => `<div class="cart-row">
      <input class="check" type="checkbox" data-action="cart-select" data-id="${esc(product.id)}" ${item.selected ? "checked" : ""} aria-label="选择${esc(product.name)}">
      <div class="cart-thumb"><img src="${product.image}" alt="${esc(product.name)}"></div>
      <div class="cart-info"><div class="cart-name">${esc(product.name)}</div><div class="cart-spec">${esc(product.subtitle || "标准版")}</div>
        <div class="cart-bottom"><strong class="price" style="font-size:13px">${money(product.price)}</strong>
          <div style="display:flex;align-items:center;gap:7px"><button class="text-action danger cart-remove" data-action="cart-remove" data-id="${esc(product.id)}" style="display:none">删除</button>
          <div class="stepper"><button type="button" data-action="cart-qty" data-id="${esc(product.id)}" data-delta="-1">−</button><output>${item.qty}</output><button type="button" data-action="cart-qty" data-id="${esc(product.id)}" data-delta="1">＋</button></div></div>
        </div></div></div>`).join("");
    const empty = `<div class="empty-state"><div class="empty-illustration"></div><strong>购物车还是空的</strong><p>好物正在等你带回家</p><a class="primary-btn small" href="mini-shop.html">去逛逛</a></div>`;
    miniShell({
      active: "cart",
      header: `<div class="mini-head-row"><span class="mini-title">购物车</span><button class="head-link" type="button" data-action="cart-edit" style="border:0;background:none;padding:6px">${rows.length ? "编辑" : ""}</button></div>`,
      content: `<div class="mini-content" style="padding-top:2px">${rows.length ? `<div class="white-card" style="padding:0 13px">${cartRows}</div><div class="mini-notice">已选 ${selected.length} 件商品</div>` : empty}</div>`,
      bottom: rows.length ? `<div class="checkoutbar">
        <label class="checkout-label"><input class="check" type="checkbox" data-action="cart-select-all" ${allSelected ? "checked" : ""}> 全选</label>
        <div class="checkout-total">合计<strong>${money(total)}</strong></div>
        <button class="primary-btn" type="button" data-action="checkout">去结算${selected.length ? ` (${selected.length})` : ""}</button>
      </div>` : ""
    });
    root.querySelector('[data-action="cart-edit"]')?.addEventListener("click", event => {
      edit = !edit;
      root.querySelector('[data-action="cart-edit"]').textContent = edit ? "完成" : "编辑";
      root.querySelectorAll(".cart-remove").forEach(button => { button.style.display = edit ? "inline" : "none"; });
    });
  }

  function renderProfile() {
    state = read();
    const tier = currentTier();
    miniShell({
      active: "profile",
      header: `<div class="mini-head-row"><span class="mini-title">我的</span><a href="#settings" data-action="profile-item" data-title="设置" class="head-link">${icon("settings")}</a></div>`,
      content: `<div class="profile-hero"><div class="profile-id">
          <div class="avatar">林</div><div><div class="profile-name">林间有风</div><a class="profile-member" href="mini-membership.html">${icon("member")} ${esc(tier.name)}　查看会员中心 ${icon("chevron")}</a></div>
          <span style="margin-left:auto;color:rgba(255,255,255,.55)">${icon("chevron")}</span>
        </div>
      </div>
      <div class="mini-content" style="padding-top:12px">
        <section class="white-card" style="padding:13px 9px 10px">
          <div class="section-head" style="padding:0 5px"><h2 style="font-size:13px">我的订单</h2><a href="mini-orders.html">全部订单 ${icon("chevron")}</a></div>
          <div class="profile-quick">
            ${[["待付款","bag","pending_payment"],["待发货","box","to_ship"],["待收货","truck","to_receive"],["待评价","chat","completed"],["退款/售后","service","after-sale"]].map(([label, glyph, status]) => `<a href="mini-orders.html?status=${status}" class="order-shortcut">${icon(glyph)}<span>${label}</span></a>`).join("")}
          </div>
        </section>
        <section class="section white-card" style="padding:2px 13px">
          ${[["营销中心","gift","mini-promotions.html"],["我的优惠券","tag","mini-coupons.html"],["分销中心","chart","mini-distribution.html"],["收货地址","homeGoods","#address"],["积分","member","#points"],["客服","service","#service"],["设置","settings","#settings"]].map(([label, glyph, href]) => `<a href="${href}" ${href.startsWith("#") ? `data-action="profile-item" data-title="${label}"` : ""} class="list-link"><span style="display:flex;align-items:center;gap:9px">${icon(glyph)}<strong style="font-weight:550">${label}</strong></span><span>${icon("chevron")}</span></a>`).join("")}
        </section>
        <div class="mini-notice">Mi Store · 认真生活，好好购物</div>
      </div>`
    });
  }

  function addToCart(productId) {
    const product = productById(productId);
    if (!product) return;
    const existing = state.cart.find(item => item.productId === productId);
    if (existing) existing.qty += 1;
    else state.cart.push({ productId, qty: 1, selected: true });
    write(state);
    toast("已加入购物车");
  }

  function showProduct(productId) {
    const product = productById(productId);
    if (!product) return;
    openModal(esc(product.name), `<div style="display:grid;grid-template-columns:120px 1fr;gap:15px;align-items:center">
      <img src="${product.image}" alt="${esc(product.name)}" style="width:120px;height:120px;object-fit:cover;border-radius:10px;background:#f3f3f3">
      <div><div style="font-size:11px;color:#888;line-height:1.6">${esc(product.subtitle)}</div><div style="margin-top:10px;color:var(--orange);font-size:20px;font-weight:700">${money(product.price)}</div><div style="margin-top:8px">${productTags(product)}</div></div>
    </div><div class="inline-help" style="margin-top:15px">商品、分类与「畅销」标记由运营后台维护；本原型不发起真实交易。</div>`,
      `<button class="secondary-btn" type="button" data-modal-close>继续浏览</button><button class="primary-btn small" type="button" data-action="modal-add-cart" data-id="${esc(product.id)}">加入购物车</button>`);
  }

  root.addEventListener("click", event => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "add-cart") {
      event.preventDefault();
      event.stopPropagation();
      addToCart(control.dataset.id);
    } else if (action === "detail" && !event.target.closest("button")) {
      showProduct(control.dataset.id);
    } else if (action === "modal-add-cart") {
      addToCart(control.dataset.id);
      closeModal();
    } else if (action === "shop-filter") {
      params.set("category", control.dataset.category);
      params.delete("q");
      location.href = `mini-shop.html?category=${encodeURIComponent(control.dataset.category)}`;
    } else if (action === "zone-filter") {
      activeZoneFilter = control.dataset.category;
      renderZone();
    } else if (action === "cart-qty") {
      const row = state.cart.find(item => item.productId === control.dataset.id);
      if (row) row.qty = Math.max(1, row.qty + Number(control.dataset.delta));
      write(state);
      renderCart();
    } else if (action === "cart-remove") {
      state.cart = state.cart.filter(item => item.productId !== control.dataset.id);
      write(state);
      renderCart();
      toast("已从购物车移除");
    } else if (action === "cart-select") {
      const row = state.cart.find(item => item.productId === control.dataset.id);
      if (row) row.selected = control.checked;
      write(state);
      renderCart();
    } else if (action === "cart-select-all") {
      state.cart.forEach(item => { item.selected = control.checked; });
      write(state);
      renderCart();
    } else if (action === "checkout") {
      const count = state.cart.filter(item => item.selected).length;
      if (!count) return toast("请先选择商品");
      const latest = read();
      const coupons = latest.claimedCoupons.filter(item => item.status === "available").map(item => {
        const coupon = latest.coupons.find(entry => entry.id === (item.couponId || item.id));
        return coupon ? `<option value="${esc(item.claimId || item.id)}">${esc(coupon.name)}</option>` : "";
      }).join("");
      openModal("确认订单", `<div style="font-size:11px;color:#777;line-height:1.8">已选择 ${count} 件商品 · 会员优惠将在提交时自动计算</div>
        <div class="form-grid" style="margin-top:14px">
          <label class="field" style="grid-column:1/-1">收货地址<input id="checkout-address" value="${esc(latest.user.name)}，${esc(latest.user.phone)}，上海市徐汇区漕溪北路 88 号"></label>
          <label class="field" style="grid-column:1/-1">使用优惠券<select id="checkout-coupon"><option value="">不使用优惠券</option>${coupons}</select></label>
          <label class="field" style="grid-column:1/-1">订单备注<textarea id="checkout-remark" rows="2" placeholder="选填"></textarea></label>
        </div><div class="inline-help" style="margin-top:10px">创建后可在「我的订单」模拟支付；运营后台可继续发货、审核售后。</div>`,
        `<button class="secondary-btn" type="button" data-modal-close>再想想</button><button class="primary-btn small" type="button" data-action="confirm-order">提交订单</button>`);
    } else if (action === "mock-order") {
      closeModal();
      toast("请选择商品后提交订单");
    } else if (action === "points") {
      openModal("积分明细", `<div class="list-link"><span>购物消费奖励</span><span>+320</span></div><div class="list-link"><span>签到积分</span><span>+10</span></div><div class="list-link"><span>积分兑换</span><span>−100</span></div>`);
    } else if (action === "profile-item") {
      event.preventDefault();
      const title = control.dataset.title || "服务";
      openModal(title, `<div style="padding:5px 0;color:#7c7f83;font-size:11px;line-height:1.8">${title === "积分" ? `当前可用积分：${state.points.toLocaleString()} 分。` : `${title}功能为演示入口，可在正式项目中接入对应服务。`}</div>`);
    } else if (action === "banner-dot") {
      const carousel = document.getElementById("hero-carousel");
      if (!carousel) return;
      const slides = [...carousel.querySelectorAll(".hero-slide")];
      const dots = [...carousel.querySelectorAll(".carousel-dot")];
      slides.forEach((slide, index) => slide.classList.toggle("active", index === Number(control.dataset.index)));
      dots.forEach((dot, index) => dot.classList.toggle("active", index === Number(control.dataset.index)));
    }
  });

  document.addEventListener("click", event => {
    const modalAction = event.target.closest("[data-action]");
    if (modalAction?.dataset.action === "modal-add-cart") {
      addToCart(modalAction.dataset.id);
      closeModal();
    } else if (modalAction?.dataset.action === "mock-order") {
      closeModal();
      toast("请选择商品后提交订单");
    } else if (modalAction?.dataset.action === "confirm-order") {
      try {
        const selected = state.cart.filter(item => item.selected);
        const addressText = document.getElementById("checkout-address")?.value.trim();
        if (!addressText) throw new Error("请填写收货地址");
        const order = window.MallOps.createOrder({
          lines: selected.map(item => ({ productId: item.productId, qty: item.qty })),
          address: { name: state.user.name, phone: state.user.phone, text: addressText },
          couponId: document.getElementById("checkout-coupon")?.value || "",
          remark: document.getElementById("checkout-remark")?.value.trim() || "",
          shareTokenId: sessionStorage.getItem("mall-pending-share-token") || params.get("share") || ""
        });
        sessionStorage.removeItem("mall-pending-share-token");
        state = read();
        state.cart = state.cart.filter(item => !selected.some(row => row.productId === item.productId));
        write(state);
        closeModal();
        location.href = `mini-orders.html?status=pending_payment&order=${encodeURIComponent(order.id)}`;
      } catch (error) {
        toast(error.message || "订单创建失败");
      }
    } else if (event.target.closest("[data-modal-close]")) {
      closeModal();
    }
  });

  window.addEventListener("storage", event => {
    if (event.key !== window.MallData.KEY) return;
    state = read();
    if (root.dataset.page === "home") renderHome();
    else if (root.dataset.page === "membership") renderMembership();
  });

  const page = root.dataset.page;
  captureShareLanding();
  if (page === "home") renderHome();
  else if (page === "membership") renderMembership();
  else if (page === "cart") renderCart();
  else if (page === "profile") renderProfile();
  else if (page === "shop") renderShop();
  else if (page === "zone") renderZone();
})();
