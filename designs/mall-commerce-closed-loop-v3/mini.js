(() => {
  const { read, write, image } = window.MallData;
  const { icon, escapeHtml: esc, money, toast, openModal, closeModal, tabbar } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  let state = read();
  let activeZoneFilter = "all";
  let carouselTimer;
  let detailGalleryIndex = 0;
  let detailQty = 1;
  let detailSkuId = params.get("sku") || "";

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
    const price = Math.min(...(product.skus || []).map(sku => Number(sku.price)).filter(Number.isFinite), Number(product.price || 0));
    return `<article class="product-card" data-action="detail" data-id="${esc(product.id)}">
      <div class="product-image"><img loading="lazy" src="${product.image}" alt="${esc(product.name)}"></div>
      <div class="product-copy">
        <div class="product-name">${esc(product.name)}</div>
        <div class="product-sub">${esc(product.subtitle || "")}</div>
        <div class="product-price-row">
          <span class="price"><small>¥</small>${price.toLocaleString("zh-CN")}</span>
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
    const rows = state.cart.map(item => {
      const product = productById(item.productId);
      const sku = product?.skus?.find(row => row.id === item.skuId) || product?.skus?.[0];
      return { item, product, sku };
    }).filter(entry => entry.product && entry.sku);
    const selected = rows.filter(({ item }) => item.selected);
    const total = selected.reduce((sum, { item, sku }) => sum + Number(sku.price) * item.qty, 0);
    const allSelected = rows.length > 0 && selected.length === rows.length;
    let edit = false;
    const cartRows = rows.map(({ item, product, sku }) => `<div class="cart-row">
      <input class="check" type="checkbox" data-action="cart-select" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" ${item.selected ? "checked" : ""} aria-label="选择${esc(product.name)}">
      <div class="cart-thumb"><img src="${sku.image || product.image}" alt="${esc(product.name)}"></div>
      <div class="cart-info"><div class="cart-name">${esc(product.name)}</div><div class="cart-spec">${esc(sku.label || product.subtitle || "标准版")}</div>
        <div class="cart-bottom"><strong class="price" style="font-size:13px">${money(sku.price)}</strong>
          <div style="display:flex;align-items:center;gap:7px"><button type="button" class="text-action danger cart-remove" data-action="cart-remove" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" style="display:none">删除</button>
          <div class="stepper"><button type="button" data-action="cart-qty" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" data-delta="-1">−</button><output>${item.qty}</output><button type="button" data-action="cart-qty" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" data-delta="1">＋</button></div></div>
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

  function addToCart(productId, skuId = "", quantity = 1) {
    const product = productById(productId);
    if (!product) return;
    const sku = product.skus?.find(item => item.id === skuId) || product.skus?.[0];
    if (!sku || sku.status !== "on") return toast("该商品规格暂不可购买");
    const existing = state.cart.find(item => item.productId === productId && (item.skuId || product.skus?.[0]?.id) === sku.id);
    const nextQty = Number(existing?.qty || 0) + Number(quantity || 1);
    if (nextQty > Number(sku.stock || 0)) return toast(`库存不足，当前规格仅剩 ${Number(sku.stock || 0)} 件`);
    if (existing) {
      existing.skuId = sku.id;
      existing.qty = nextQty;
    } else state.cart.push({ productId, skuId: sku.id, qty: Number(quantity || 1), selected: true });
    write(state);
    toast("已加入购物车");
  }

  function showProduct(productId) {
    location.href = `mini-product.html?id=${encodeURIComponent(productId)}`;
  }

  function renderProductDetail() {
    state = read();
    const product = productById(params.get("id"));
    if (!product || product.status !== "on") {
      miniShell({
        pageTitle: "商品详情",
        header: `<div class="mini-head-row"><a href="javascript:history.back()" aria-label="返回商城" style="color:#666">${icon("chevron")}</a><span class="mini-title small">商品详情</span><a href="mini-cart.html" style="color:#666">${icon("cart")}</a></div>`,
        content: `<div class="empty-state"><strong>商品暂不可查看</strong><p>商品可能已下架或链接已失效</p><a class="primary-btn small" href="mini-shop.html">返回商城</a></div>`
      });
      return;
    }
    const skus = (product.skus || []).filter(sku => sku.status === "on");
    const currentSku = skus.find(sku => sku.id === detailSkuId) || skus.find(sku => Number(sku.stock) > 0) || skus[0];
    if (!currentSku) {
      miniShell({ pageTitle: "商品详情", content: `<div class="empty-state"><strong>暂时无可售规格</strong><a class="primary-btn small" href="mini-shop.html">返回商城</a></div>` });
      return;
    }
    detailSkuId = currentSku.id;
    detailQty = Math.min(Math.max(1, detailQty), Math.max(1, Number(currentSku.stock || 0)));
    const productGallery = product.gallery?.length ? product.gallery : [product.image];
    const gallery = currentSku.image && currentSku.image !== productGallery[0]
      ? [currentSku.image, ...productGallery.filter(src => src !== currentSku.image)]
      : productGallery;
    detailGalleryIndex = Math.min(detailGalleryIndex, gallery.length - 1);
    const galleryImg = gallery[detailGalleryIndex] || product.image;
    const ranked = [...state.products].filter(item => item.status === "on").sort((a, b) => Number(b.salesCount || 0) - Number(a.salesCount || 0));
    const rank = ranked.findIndex(item => item.id === product.id);
    const topProducts = ranked.slice(0, 10);
    const reviews = product.reviews || [];
    const skuSpecs = sku => sku.specs?.length ? sku.specs : [{ name: "版本", value: "标准版" }];
    const selectedSpecs = Object.fromEntries(skuSpecs(currentSku).map(spec => [spec.name, spec.value]));
    const selectedAddress = state.selectedAddress || state.addresses?.find(item => item.isDefault) || state.addresses?.[0];
    const addressLine = selectedAddress
      ? `${selectedAddress.province || ""}${selectedAddress.city || ""}${selectedAddress.district || ""}${selectedAddress.detail || ""}`
      : "请选择收货地址";
    const galleryThumbs = gallery.map((src, index) => `<button class="detail-thumb ${index === detailGalleryIndex ? "active" : ""}" type="button" data-action="gallery-image" data-index="${index}" aria-label="查看第 ${index + 1} 张商品图片"><img src="${esc(src)}" alt=""></button>`).join("");
    const specNames = [...new Set(skus.flatMap(sku => skuSpecs(sku).map(spec => spec.name)))];
    const skuOptions = specNames.map(specName => {
      const values = [...new Set(skus.flatMap(sku => skuSpecs(sku).filter(spec => spec.name === specName).map(spec => spec.value)))];
      return `<div class="detail-spec-group"><strong>${esc(specName)}</strong><div class="detail-sku-list">${values.map(value => {
        const candidate = skus.find(sku => skuSpecs(sku).some(spec => spec.name === specName && spec.value === value)
          && skuSpecs(sku).every(spec => spec.name === specName || selectedSpecs[spec.name] === spec.value));
        const soldOut = !candidate || Number(candidate.stock) <= 0;
        return `<button type="button" class="detail-sku ${selectedSpecs[specName] === value ? "active" : ""}" data-action="select-spec" data-spec-name="${esc(specName)}" data-spec-value="${esc(value)}" ${soldOut ? "disabled" : ""}>${esc(value)}${soldOut ? " · 售罄" : ""}</button>`;
      }).join("")}</div></div>`;
    }).join("");
    const recommendations = [...state.products].filter(item => item.id !== product.id && item.status === "on" && (item.parent === product.parent || item.tags?.includes("recommend"))).slice(0, 4);
    const rankCopy = rank >= 0 && rank < 10 ? `销量榜 TOP ${rank + 1}` : "品质精选";
    miniShell({
      pageTitle: "商品详情",
      header: `<div class="mini-head-row"><a href="javascript:history.back()" aria-label="返回商城" style="color:#666">${icon("chevron")}</a><span class="mini-title small">商品详情</span><a href="mini-cart.html" aria-label="购物车" style="color:#666">${icon("cart")}</a></div>`,
      content: `<div class="product-detail">
        <section class="detail-gallery" aria-label="商品主图">
          <img class="detail-main-image" src="${esc(galleryImg)}" alt="${esc(product.name)}">
          <span class="detail-image-count">${detailGalleryIndex + 1} / ${gallery.length}</span>
          <div class="detail-thumbs">${galleryThumbs}</div>
        </section>
        <section class="detail-price-block">
          <div class="detail-price-line"><strong>${money(currentSku.price)}</strong>${Number(currentSku.originalPrice || product.original) > Number(currentSku.price) ? `<del>${money(currentSku.originalPrice || product.original)}</del>` : ""}<span class="detail-rank">${esc(rankCopy)}</span></div>
          <div class="detail-sales-line"><span>已售 ${Number(product.salesCount || 0).toLocaleString()} 件</span><span>剩余库存 ${Number(currentSku.stock || 0)} 件</span><span>${Number(product.rating || 4.8).toFixed(1)} 分</span></div>
        </section>
        <section class="detail-title-block"><div class="detail-tags">${productTags(product)}</div><h1>${esc(product.name)}</h1><p>${esc(product.subtitle || "")}</p>
          <div class="detail-title-actions"><span class="detail-spu-id">SPU ${esc(product.spuId || product.id)}</span><button type="button" class="detail-share-button" data-action="share-product">${icon("share")}<span>分享</span></button></div>
        </section>
        <section class="detail-card">
          <div class="detail-row-head"><strong>选择规格</strong><span>${esc(currentSku.label || "标准版")}</span></div>
          <div class="detail-spec-groups">${skuOptions}</div>
          <div class="detail-selected-stock">当前规格剩余 ${Number(currentSku.stock || 0)} 件</div>
          <div class="detail-row-head detail-quantity"><strong>购买数量</strong><div class="stepper"><button type="button" data-action="detail-qty" data-delta="-1" aria-label="减少数量">−</button><output>${detailQty}</output><button type="button" data-action="detail-qty" data-delta="1" aria-label="增加数量">＋</button></div></div>
        </section>
        <button class="detail-card detail-address" type="button" data-action="choose-address">
          <span class="detail-address-icon">${icon("homeGoods")}</span><span><strong>配送至</strong><small>${esc(addressLine)}　${selectedAddress ? `${esc(selectedAddress.name || "")} ${esc(selectedAddress.phone || "")}` : ""}</small></span>${icon("chevron")}
        </button>
        <section class="detail-service"><span>✓ 正品保障</span><span>✓ 7 天退换</span><span>✓ 快速配送</span></section>
        <nav class="detail-anchor-nav"><a href="#detail-top10">销量榜</a><a href="#detail-reviews">评价 ${Number(product.reviewCount || 0).toLocaleString()}</a><a href="#detail-description">商品详情</a><a href="#detail-related">推荐商品</a></nav>
        <details class="detail-top10" id="detail-top10">
          <summary class="detail-top10-summary"><span><strong>热销商品 TOP 10</strong><small>按已售数量排序 · 共 ${topProducts.length} 款</small></span><span class="detail-top10-chevron" aria-hidden="true"></span></summary>
          <div class="detail-top10-body">
          <ol class="detail-top10-list">${topProducts.map((item, index) => {
            const itemPrice = Math.min(...(item.skus || []).filter(sku => sku.status === "on").map(sku => Number(sku.price)).filter(Number.isFinite), Number(item.price || 0));
            return `<li class="detail-top10-item ${item.id === product.id ? "current" : ""}">
              <button type="button" class="detail-top10-link" data-action="detail" data-id="${esc(item.id)}">
                <span class="detail-top10-rank rank-${index + 1}">${String(index + 1).padStart(2, "0")}</span>
                <img src="${esc(item.image)}" alt="">
                <span class="detail-top10-copy"><strong>${esc(item.name)}</strong><small>已售 ${Number(item.salesCount || 0).toLocaleString()} 件</small></span>
                <span class="detail-top10-price">${money(itemPrice)}</span>
                ${item.id === product.id ? `<span class="detail-top10-current">当前</span>` : ""}
              </button>
            </li>`;
          }).join("")}</ol>
          <p class="detail-top10-note">销量数据为本地原型演示数据，正式环境应由订单数据实时汇总。</p>
          </div>
        </details>
        <section class="detail-card detail-reviews" id="detail-reviews">
          <div class="detail-section-title"><h2>用户评价</h2><a href="#detail-reviews">好评率 98%　›</a></div>
          <div class="detail-rating"><strong>${Number(product.rating || 4.8).toFixed(1)}</strong><span>★★★★★</span><small>${Number(product.reviewCount || 0).toLocaleString()} 条评价</small></div>
          ${reviews.slice(0, 3).map(review => `<article class="detail-review"><div class="detail-review-head"><strong>${esc(review.name || "商城用户")}</strong><span>${esc(review.date || "")}</span></div><div class="detail-stars">★★★★★</div><p>${esc(review.text || "")}</p>${review.images?.length ? `<div class="detail-review-images">${review.images.map(src => `<img src="${esc(src)}" alt="用户评价图片">`).join("")}</div>` : ""}</article>`).join("")}
        </section>
        <section class="detail-description" id="detail-description">
          <div class="detail-description-title"><span></span><strong>商品详情</strong><span></span></div>
          <p>${esc(product.detailIntro || product.subtitle || product.name)}</p>
          ${(product.detailImages || []).map((src, index) => `<img loading="lazy" src="${esc(src)}" alt="${esc(product.name)} 商品详情图 ${index + 1}">`).join("")}
          <div class="detail-description-foot">产品参数与服务说明以实际商品包装及售后政策为准</div>
        </section>
        <section class="detail-related" id="detail-related"><div class="detail-section-title"><h2>为你推荐</h2><span>更多好物</span></div><div class="detail-related-grid">${recommendations.map(item => `<button type="button" class="detail-related-card" data-action="detail" data-id="${esc(item.id)}"><img src="${esc(item.image)}" alt="${esc(item.name)}"><strong>${esc(item.name)}</strong><span>${money(Math.min(...(item.skus || []).map(sku => Number(sku.price)).filter(Number.isFinite), Number(item.price || 0)))}</span></button>`).join("")}</div></section>
      </div>`,
      bottom: `<div class="detail-buybar"><a href="mini-cart.html" class="detail-cart-link">${icon("cart")}<span>购物车</span></a><button type="button" class="detail-add-btn" data-action="detail-add" ${Number(currentSku.stock) <= 0 ? "disabled" : ""}>加入购物车</button><button type="button" class="detail-buy-btn" data-action="detail-buy" ${Number(currentSku.stock) <= 0 ? "disabled" : ""}>立即购买</button></div>`
    });
    const galleryBox = root.querySelector(".detail-gallery");
    let startX = 0;
    galleryBox?.addEventListener("touchstart", event => { startX = event.touches[0].clientX; }, { passive: true });
    galleryBox?.addEventListener("touchend", event => {
      const delta = event.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 28) {
        detailGalleryIndex = (detailGalleryIndex + (delta < 0 ? 1 : gallery.length - 1)) % gallery.length;
        renderProductDetail();
      }
    }, { passive: true });
  }

  function chooseDeliveryAddress() {
    const addresses = state.addresses || [];
    const current = state.selectedAddress || addresses.find(item => item.isDefault) || addresses[0] || {};
    const backdrop = openModal("配送地址", `<form id="detail-address-form"><div class="form-grid">
      <label class="field" style="grid-column:1/-1">收货人<input name="name" required value="${esc(current.name || state.user.name || "")}"></label>
      <label class="field" style="grid-column:1/-1">联系电话<input name="phone" required value="${esc(current.phone || state.user.phone || "")}"></label>
      <label class="field" style="grid-column:1/-1">详细地址<input name="detail" required value="${esc([current.province, current.city, current.district, current.detail].filter(Boolean).join(""))}" placeholder="省市区、街道门牌号"></label>
    </div><p class="inline-help" style="margin-top:12px">此原型仅保存本地演示地址，不会提交到真实物流服务。</p></form>`, `<button type="button" class="secondary-btn" data-modal-close>取消</button><button type="button" class="primary-btn small" data-action="save-detail-address">保存地址</button>`);
    backdrop.querySelector("[data-action='save-detail-address']").addEventListener("click", () => {
      const form = backdrop.querySelector("#detail-address-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const address = { id: current.id || `ADDR-${Date.now()}`, name: String(values.get("name")).trim(), phone: String(values.get("phone")).trim(), detail: String(values.get("detail")).trim(), isDefault: true };
      state.addresses = (state.addresses || []).map(item => ({ ...item, isDefault: false }));
      if (!state.addresses.some(item => item.id === address.id)) state.addresses.unshift(address);
      else state.addresses = state.addresses.map(item => item.id === address.id ? address : item);
      state.selectedAddress = address;
      write(state);
      closeModal();
      renderProductDetail();
    });
  }

  function openProductShare() {
    const product = productById(params.get("id"));
    const sku = product?.skus?.find(item => item.id === detailSkuId) || product?.skus?.[0];
    if (!product || !sku) return toast("商品信息暂不可分享");
    const backdrop = openModal("分享商品", `<div class="product-share-dialog">
      <p class="product-share-intro">好友打开商品链接后，会直接进入此商品详情页。</p>
      <div class="product-share-options">
        <button type="button" data-share-channel="wechat_friend"><span class="share-option-mark friend">微</span><strong>微信好友</strong><small>复制链接后粘贴发送</small></button>
        <button type="button" data-share-channel="wechat_moments"><span class="share-option-mark moments">圈</span><strong>朋友圈</strong><small>复制链接后发布到朋友圈</small></button>
        <button type="button" data-share-channel="poster"><span class="share-option-mark poster">海</span><strong>商品海报</strong><small>预览后打印或保存</small></button>
      </div>
      <div class="share-result" aria-live="polite"></div>
      <p class="product-share-foot">分享链接包含商品详情地址和来源标识；本原型模拟链接跳转与来源记录。</p>
    </div>`, `<button type="button" class="secondary-btn" data-modal-close>关闭</button>`);
    const result = backdrop.querySelector(".share-result");
    const copyLink = async input => {
      input.focus();
      input.select();
      try {
        if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(input.value);
        else if (!document.execCommand?.("copy")) throw new Error("clipboard unavailable");
        toast("商品链接已复制");
      } catch {
        toast("请长按链接复制");
      }
    };
    backdrop.querySelectorAll("[data-share-channel]").forEach(button => {
      button.addEventListener("click", () => {
        try {
          const channel = button.dataset.shareChannel;
          const token = window.MallOps.createShareToken({ productId: product.id, channel });
          const url = new URL("mini-product.html", location.href);
          url.searchParams.set("id", product.id);
          url.searchParams.set("sku", sku.id);
          url.searchParams.set("share", token.token);
          const link = url.href;
          if (channel === "poster") {
            backdrop.classList.add("poster-print-open");
            result.innerHTML = `<article class="product-poster">
                <div class="product-poster-brand"><span>MI SELECT</span><small>品质好物 · 值得分享</small></div>
                <img src="${esc(sku.image || product.gallery?.[0] || product.image)}" alt="${esc(product.name)}">
                <div class="product-poster-copy"><small>为你精选</small><h2>${esc(product.name)}</h2><p>${esc(product.subtitle || "")}</p>
                  <strong>${money(sku.price)}</strong><span>规格：${esc(sku.label || "标准版")}</span></div>
                <div class="product-poster-link">${esc(link)}</div>
              </article>
              <input class="share-poster-url" type="url" readonly value="${esc(link)}" aria-label="海报商品链接">
              <div class="share-poster-controls"><button type="button" class="secondary-btn" data-copy-share>复制商品链接</button><button type="button" class="primary-btn small" data-print-poster>打印 / 保存海报</button></div>`;
          } else {
            backdrop.classList.remove("poster-print-open");
            const channelName = channel === "wechat_moments" ? "朋友圈" : "微信好友";
            result.innerHTML = `<div class="share-link-result"><strong>${channelName}商品链接已生成</strong><p>复制链接后粘贴到${channelName}；好友点击即可进入此商品详情。</p>
                <label class="field">商品详情链接<input type="url" readonly value="${esc(link)}"></label>
                <button type="button" class="primary-btn small" data-copy-share>复制链接</button></div>`;
          }
          const copyButton = result.querySelector("[data-copy-share]");
          copyButton?.addEventListener("click", () => copyLink(result.querySelector('input[type="url"]')));
          result.querySelector("[data-print-poster]")?.addEventListener("click", () => window.print());
        } catch (error) {
          toast(error.message || "暂时无法生成分享链接");
        }
      });
    });
  }

  root.addEventListener("click", event => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    if (action === "add-cart") {
      event.preventDefault();
      event.stopPropagation();
      addToCart(control.dataset.id, control.dataset.skuId || "");
    } else if (action === "detail") {
      showProduct(control.dataset.id);
    } else if (action === "share-product") {
      openProductShare();
    } else if (action === "modal-add-cart") {
      addToCart(control.dataset.id, control.dataset.skuId || "");
      closeModal();
    } else if (action === "gallery-image") {
      detailGalleryIndex = Number(control.dataset.index || 0);
      renderProductDetail();
    } else if (action === "select-sku") {
      detailSkuId = control.dataset.skuId;
      detailQty = 1;
      renderProductDetail();
    } else if (action === "select-spec") {
      const product = productById(params.get("id"));
      const selectedSku = product?.skus?.find(item => item.id === detailSkuId);
      const selected = Object.fromEntries((selectedSku?.specs || []).map(spec => [spec.name, spec.value]));
      const nextSku = product?.skus?.filter(item => item.status === "on").find(item =>
        (item.specs || []).some(spec => spec.name === control.dataset.specName && spec.value === control.dataset.specValue)
        && (item.specs || []).every(spec => spec.name === control.dataset.specName
          || selected[spec.name] === spec.value)
        && Number(item.stock) > 0);
      if (!nextSku) return toast("该规格组合暂不可售");
      detailSkuId = nextSku.id;
      detailQty = 1;
      detailGalleryIndex = 0;
      renderProductDetail();
    } else if (action === "detail-qty") {
      const product = productById(params.get("id"));
      const sku = product?.skus?.find(item => item.id === detailSkuId);
      detailQty = Math.min(Number(sku?.stock || 1), Math.max(1, detailQty + Number(control.dataset.delta)));
      renderProductDetail();
    } else if (action === "choose-address") {
      chooseDeliveryAddress();
    } else if (action === "detail-add") {
      addToCart(params.get("id"), detailSkuId, detailQty);
    } else if (action === "detail-buy") {
      try {
        const address = state.selectedAddress || state.addresses?.find(item => item.isDefault) || state.addresses?.[0];
        if (!address) return chooseDeliveryAddress();
        const order = window.MallOps.createOrder({
          lines: [{ productId: params.get("id"), skuId: detailSkuId, qty: detailQty }],
          address: { name: address.name, phone: address.phone, text: [address.province, address.city, address.district, address.detail].filter(Boolean).join("") },
          shareTokenId: sessionStorage.getItem("mall-pending-share-token") || params.get("share") || ""
        });
        sessionStorage.removeItem("mall-pending-share-token");
        location.href = `mini-orders.html?status=pending_payment&order=${encodeURIComponent(order.id)}`;
      } catch (error) {
        toast(error.message || "暂时无法提交订单");
      }
    } else if (action === "shop-filter") {
      params.set("category", control.dataset.category);
      params.delete("q");
      location.href = `mini-shop.html?category=${encodeURIComponent(control.dataset.category)}`;
    } else if (action === "zone-filter") {
      activeZoneFilter = control.dataset.category;
      renderZone();
    } else if (action === "cart-qty") {
      const row = state.cart.find(item => item.productId === control.dataset.id && (item.skuId || productById(item.productId)?.skus?.[0]?.id) === control.dataset.skuId);
      if (row) {
        const sku = productById(row.productId)?.skus?.find(item => item.id === control.dataset.skuId);
        const nextQty = Math.max(1, row.qty + Number(control.dataset.delta));
        if (nextQty > Number(sku?.stock || 0)) return toast(`库存不足，当前规格仅剩 ${Number(sku?.stock || 0)} 件`);
        row.qty = nextQty;
      }
      write(state);
      renderCart();
    } else if (action === "cart-remove") {
      state.cart = state.cart.filter(item => !(item.productId === control.dataset.id && (item.skuId || productById(item.productId)?.skus?.[0]?.id) === control.dataset.skuId));
      write(state);
      renderCart();
      toast("已从购物车移除");
    } else if (action === "cart-select") {
      const row = state.cart.find(item => item.productId === control.dataset.id && (item.skuId || productById(item.productId)?.skus?.[0]?.id) === control.dataset.skuId);
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
          lines: selected.map(item => ({ productId: item.productId, skuId: item.skuId || productById(item.productId)?.skus?.[0]?.id, qty: item.qty })),
          address: { name: state.user.name, phone: state.user.phone, text: addressText },
          couponId: document.getElementById("checkout-coupon")?.value || "",
          remark: document.getElementById("checkout-remark")?.value.trim() || "",
          shareTokenId: sessionStorage.getItem("mall-pending-share-token") || params.get("share") || ""
        });
        sessionStorage.removeItem("mall-pending-share-token");
        state = read();
        state.cart = state.cart.filter(item => !selected.some(row => row.productId === item.productId && (row.skuId || productById(row.productId)?.skus?.[0]?.id) === (item.skuId || productById(item.productId)?.skus?.[0]?.id)));
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
  else if (page === "product-detail") renderProductDetail();
})();
