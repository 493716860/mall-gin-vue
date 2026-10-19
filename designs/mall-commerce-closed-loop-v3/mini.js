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
  let phoneCodeRequested = false;

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
  const cents = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const addressText = address => [address?.province, address?.city, address?.district, address?.detail].filter(Boolean).join("");
  const selectedAddress = source => source.selectedAddress || source.addresses?.find(item => item.isDefault) || source.addresses?.[0];

  function cartPricing(rows, couponId = "", address = selectedAddress(state)) {
    const subtotal = cents(rows.reduce((sum, { item, sku }) => sum + Number(sku.price) * Number(item.qty), 0));
    const tier = currentTier();
    const memberRate = Number(tier?.discount || 100) / 100;
    const memberDiscount = cents(subtotal * (1 - memberRate));
    const claim = state.claimedCoupons?.find(item => (item.claimId || item.id) === couponId && item.status === "available");
    const coupon = claim && state.coupons?.find(item => item.id === (claim.couponId || claim.id));
    let couponDiscount = 0;
    const couponValue = Number(coupon?.value);
    if (coupon && subtotal >= Number(coupon.threshold || 0) && Number.isFinite(couponValue) && couponValue > 0
      && (coupon.type !== "rate" || couponValue <= 100)) {
      couponDiscount = coupon.type === "rate"
        ? cents(subtotal * memberRate * (1 - couponValue / 100))
        : cents(couponValue);
    }
    const discount = Math.min(subtotal, memberDiscount + couponDiscount);
    const shipping = window.MallOps.quoteShipping(rows.map(({ item, product, sku }) => ({
      productId: product?.id || item?.productId,
      price: sku?.price,
      qty: item?.qty
    })), address, state);
    const shippingFee = shipping.fee;
    return { subtotal, memberDiscount, couponDiscount, discount, shippingFee, shipping, total: cents(Math.max(0, subtotal - discount + shippingFee)), coupon };
  }

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
    root.querySelector(".mini-head-row")?.insertAdjacentHTML("beforeend", window.MallUI.messageEntry());
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
        <section class="section white-card"><a class="list-link" href="mini-points.html"><strong>积分明细</strong><span>查看获取与使用记录 ${icon("chevron")}</span></a>
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
    const subtotal = selected.reduce((sum, { item, sku }) => sum + Number(sku.price) * item.qty, 0);
    const availableCoupons = (state.claimedCoupons || []).filter(claim => {
      const coupon = state.coupons?.find(entry => entry.id === (claim.couponId || claim.id));
      return claim.status === "available" && coupon && subtotal >= Number(coupon.threshold || 0);
    });
    if (!availableCoupons.some(item => (item.claimId || item.id) === state.selectedCartCouponId)) state.selectedCartCouponId = "";
    const deliveryAddress = selectedAddress(state);
    const pricing = cartPricing(selected, state.selectedCartCouponId, deliveryAddress);
    const allSelected = rows.length > 0 && selected.length === rows.length;
    const cartRows = rows.map(({ item, product, sku }) => `<div class="cart-row">
      <input class="check" type="checkbox" data-action="cart-select" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" ${item.selected ? "checked" : ""} aria-label="选择${esc(product.name)}">
      <div class="cart-thumb"><img src="${sku.image || product.image}" alt="${esc(product.name)}"></div>
      <div class="cart-info"><div class="cart-name">${esc(product.name)}</div>
        ${product.skus?.length > 1 ? `<label class="cart-sku-picker"><span class="sr-only">选择商品规格</span><select data-action="cart-sku" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" aria-label="选择${esc(product.name)}规格">
          ${product.skus.filter(option => option.status === "on").map(option => `<option value="${esc(option.id)}" ${option.id === sku.id ? "selected" : ""} ${Number(option.stock) <= 0 ? "disabled" : ""}>${esc(option.label || option.specs?.map(spec => spec.value).join(" / ") || "标准版")} · ${money(option.price)}${Number(option.stock) <= 0 ? "（缺货）" : ""}</option>`).join("")}
        </select></label>` : `<div class="cart-spec">${esc(sku.label || product.subtitle || "标准版")}</div>`}
        <div class="cart-bottom"><strong class="price" style="font-size:13px">${money(sku.price)}</strong>
          <div style="display:flex;align-items:center;gap:7px"><button type="button" class="text-action danger cart-remove" data-action="cart-remove" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" style="display:none">删除</button>
          <div class="stepper"><button type="button" data-action="cart-qty" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" data-delta="-1">−</button><output>${item.qty}</output><button type="button" data-action="cart-qty" data-id="${esc(product.id)}" data-sku-id="${esc(sku.id)}" data-delta="1">＋</button></div></div>
        </div></div></div>`).join("");
    const empty = `<div class="empty-state"><div class="empty-illustration"></div><strong>购物车还是空的</strong><p>好物正在等你带回家</p><a class="primary-btn small" href="mini-shop.html">去逛逛</a></div>`;
    miniShell({
      active: "cart",
      header: `<div class="mini-head-row"><span class="mini-title">购物车</span><button class="head-link" type="button" data-action="cart-edit" style="border:0;background:none;padding:6px">${rows.length ? "编辑" : ""}</button></div>`,
      content: `<div class="mini-content" style="padding-top:2px">${rows.length ? `<a class="cart-delivery-link" href="mini-addresses.html?return=cart"><span><strong>配送至 ${esc(deliveryAddress ? addressText(deliveryAddress) : "请选择收货地址")}</strong><small>${deliveryAddress?.name ? `${esc(deliveryAddress.name)} ${esc(deliveryAddress.phone || "")} · 运费按地区规则计算` : "选择地址后显示对应运费"}</small></span>${icon("chevron")}</a><div class="white-card" style="padding:0 13px">${cartRows}</div><div class="mini-notice">已选 ${selected.length} 件商品</div>` : empty}</div>`,
      bottom: rows.length ? `<div class="cart-checkout">
        <details class="cart-discount">
          <summary><span>优惠明细</span><span>已优惠 ${money(pricing.discount)}　配送 ${pricing.shippingFee ? money(pricing.shippingFee) : "免运费"}</span></summary>
          <div class="cart-discount-body">
            <div><span>商品金额</span><span>${money(pricing.subtotal)}</span></div>
            <div><span>${esc(currentTier()?.name || "会员")}折扣</span><span class="discount-value">−${money(pricing.memberDiscount)}</span></div>
            <div class="cart-coupon-line"><label for="cart-coupon">优惠券</label><select id="cart-coupon" data-action="cart-coupon"><option value="">不使用优惠券</option>${availableCoupons.map(claim => {
              const coupon = state.coupons.find(entry => entry.id === (claim.couponId || claim.id));
              const claimId = claim.claimId || claim.id;
              return `<option value="${esc(claimId)}" ${claimId === state.selectedCartCouponId ? "selected" : ""}>${esc(coupon.name)}（−${money(coupon.type === "rate" ? cents(pricing.subtotal * (Number(currentTier()?.discount || 100) / 100) * (1 - Number(coupon.value) / 100)) : coupon.value)}）</option>`;
            }).join("")}</select><span class="discount-value">−${money(pricing.couponDiscount)}</span></div>
            <div><span>配送费</span><span>${pricing.shippingFee ? money(pricing.shippingFee) : "免运费"}</span></div>
          </div>
        </details>
        <div class="checkoutbar">
          <label class="checkout-label"><input class="check" type="checkbox" data-action="cart-select-all" ${allSelected ? "checked" : ""}> 全选</label>
          <div class="checkout-total">应付金额<strong>${money(pricing.total)}</strong></div>
          <button class="primary-btn" type="button" data-action="checkout">去结算${selected.length ? ` (${selected.length})` : ""}</button>
        </div>
      </div>` : ""
    });
    let edit = false;
    root.querySelector('[data-action="cart-edit"]')?.addEventListener("click", event => {
      edit = !edit;
      event.currentTarget.textContent = edit ? "完成" : "编辑";
      root.querySelectorAll(".cart-remove").forEach(button => { button.style.display = edit ? "inline" : "none"; });
    });
    if (params.get("checkout") === "1" && !root.dataset.checkoutOpened) {
      root.dataset.checkoutOpened = "true";
      window.setTimeout(openCheckoutModal, 0);
    }
  }

  function openCheckoutModal() {
    state = read();
    const selected = state.cart.filter(item => item.selected);
    if (!selected.length) return toast("请先选择商品");
    const lines = selected.map(item => {
      const product = productById(item.productId);
      return { item, product, sku: product?.skus?.find(row => row.id === item.skuId) || product?.skus?.[0] };
    }).filter(row => row.product && row.sku);
    const address = selectedAddress(state);
    const pricing = cartPricing(lines, state.selectedCartCouponId || "", address);
    const coupon = state.selectedCartCouponId || "";
    const text = addressText(address);
    openModal("确认订单", `<div style="font-size:11px;color:#777;line-height:1.8">已选择 ${selected.length} 件商品 · 优惠及运费与订单规则一致</div>
      <div class="checkout-address-card"><div><strong>${esc(address?.name || "尚未选择收货地址")}</strong><span>${esc(address?.phone || "")}</span></div><p>${esc(text || "请先添加或选择收货地址")}</p><a href="mini-addresses.html?return=checkout">选择地址</a></div>
      <div class="form-grid" style="margin-top:14px">
        <label class="field" style="grid-column:1/-1">使用优惠券<select id="checkout-coupon" data-action="checkout-coupon"><option value="">不使用优惠券</option>${(state.claimedCoupons || []).filter(item => item.status === "available").map(item => {
          const couponData = state.coupons.find(entry => entry.id === (item.couponId || item.id));
          const claimId = item.claimId || item.id;
          return couponData && pricing.subtotal >= Number(couponData.threshold || 0) ? `<option value="${esc(claimId)}" ${claimId === coupon ? "selected" : ""}>${esc(couponData.name)}</option>` : "";
        }).join("")}</select></label>
        <label class="field" style="grid-column:1/-1">订单备注<textarea id="checkout-remark" rows="2" placeholder="选填"></textarea></label>
      </div><div class="checkout-modal-total"><div class="checkout-shipping-line"><span>配送费 ${address?.province ? `· ${esc(address.province)}` : ""}</span><strong>${pricing.shippingFee ? money(pricing.shippingFee) : "包邮"}</strong></div><div>预估应付 <strong>${money(pricing.total)}</strong>（含配送费）</div></div>
      <div class="inline-help" style="margin-top:10px">创建后可在「我的订单」模拟支付；运营后台可继续发货、审核售后。</div>`,
      `<button class="secondary-btn" type="button" data-modal-close>再想想</button><button class="primary-btn small" type="button" data-action="confirm-order">提交订单</button>`);
  }

  function renderProfile() {
    state = read();
    const tier = currentTier();
    const pendingReviewCount = state.orders
      .filter(order => order.userId === state.user.id && order.status === "completed")
      .reduce((count, order) => count + order.items.filter(item => !item.reviewId).length, 0);
    miniShell({
      active: "profile",
      header: `<div class="mini-head-row"><span class="mini-title">我的</span><a href="mini-profile.html?view=settings" class="head-link" aria-label="设置">${icon("settings")}</a></div>`,
      content: `<div class="profile-hero">
          <a class="profile-id profile-profile-link" href="mini-profile.html?view=personal">
            ${avatarMarkup(state.user, "avatar")}
            <span class="profile-link-copy"><strong class="profile-name">${esc(state.user.name || "商城用户")}</strong><small>个人信息与会员权益</small></span>
            <span class="profile-link-arrow">${icon("chevron")}</span>
          </a>
          <a class="profile-member" href="mini-membership.html">${icon("member")} ${esc(tier.name)}　查看会员中心 ${icon("chevron")}</a>
      </div>
      <div class="mini-content" style="padding-top:12px">
        <section class="white-card" style="padding:13px 9px 10px">
          <div class="section-head" style="padding:0 5px"><h2 style="font-size:13px">我的订单</h2><a href="mini-orders.html">全部订单 ${icon("chevron")}</a></div>
          <div class="profile-quick">
            ${[["待付款","bag","pending_payment"],["待发货","box","to_ship"],["待收货","truck","to_receive"],["待评价","chat","pending-review"],["退款/售后","service","after-sale"]].map(([label, glyph, status]) => `<a href="mini-orders.html?status=${status}" class="order-shortcut">${icon(glyph)}${status === "pending-review" && pendingReviewCount ? `<span class="order-shortcut-count">${pendingReviewCount > 99 ? "99+" : pendingReviewCount}</span>` : ""}<span>${label}</span></a>`).join("")}
          </div>
        </section>
        <section class="profile-tools-section white-card">
          <div class="section-head"><h2>我的服务</h2></div>
          <div class="profile-tools-grid">
            ${[["营销中心","gift","mini-promotions.html"],["优惠券","tag","mini-coupons.html"],["分销中心","chart","mini-distribution.html"],["收货地址","homeGoods","mini-addresses.html"],["积分","member","mini-points.html"],["在线客服","service","mini-profile.html?view=chat"],["爱宠档案","heart","mini-profile.html?view=pets"],["设置","settings","mini-profile.html?view=settings"]].map(([label, glyph, href]) => `<a href="${href}" class="profile-tool-tile"><span class="profile-tool-icon">${icon(glyph)}</span><strong>${label}</strong></a>`).join("")}
          </div>
        </section>
        <div class="mini-notice">Mi Store · 认真生活，好好购物</div>
      </div>`
    });
  }

  function avatarMarkup(user, className = "avatar") {
    return user.avatarDataUrl
      ? `<span class="${className} avatar-photo"><img src="${esc(user.avatarDataUrl)}" alt="头像"></span>`
      : `<span class="${className}">${esc((user.name || user.avatar || "用").slice(0, 1))}</span>`;
  }

  function petAge(birthday) {
    if (!birthday) return "年龄待完善";
    const born = new Date(`${birthday}T00:00:00`);
    if (Number.isNaN(born.getTime()) || born > new Date()) return "年龄待完善";
    const now = new Date();
    const months = Math.max(0, (now.getFullYear() - born.getFullYear()) * 12 + now.getMonth() - born.getMonth() - (now.getDate() < born.getDate() ? 1 : 0));
    return months >= 12 ? `${Math.floor(months / 12)} 岁${months % 12 ? ` ${months % 12} 个月` : ""}` : `${months} 个月`;
  }

  function renderAccountPage(title, content, backView = "settings", pageClass = "") {
    const backUrl = backView === "profile" ? "mini-profile.html" : `mini-profile.html?view=${encodeURIComponent(backView)}`;
    const settingsAction = title === "设置" ? "" : `<a class="head-link" href="mini-profile.html?view=settings" aria-label="设置">${icon("settings")}</a>`;
    miniShell({
      active: "profile",
      header: `<div class="mini-head-row"><a class="head-link" href="${backUrl}" aria-label="返回">${icon("chevron")}</a><span class="mini-title">${esc(title)}</span>${settingsAction}</div>`,
      content: `<div class="mini-content account-page ${pageClass}">${content}</div>`
    });
    root.querySelector(".mini-shell")?.classList.add("account-shell");
  }

  function navigateProfileView(view) {
    history.replaceState(null, "", `mini-profile.html?view=${encodeURIComponent(view)}`);
    params.set("view", view);
  }

  function maskedPhone(phone = "") {
    return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
  }

  function renderPersonal() {
    state = read();
    const user = state.user;
    user.pets ||= [];
    const region = [user.province, user.city, user.district].filter(Boolean).join(" ");
    renderAccountPage("个人信息", `
      <div class="account-page-intro profile-page-intro"><span class="account-eyebrow">MY ACCOUNT</span><strong>个人资料</strong><span>管理你的账户信息与宠物档案</span></div>
      <section class="account-section profile-details-card">
        <div class="profile-identity-row">
          ${avatarMarkup(user, "avatar account-avatar")}
          <span class="profile-identity-copy"><strong>${esc(user.name || "商城用户")}</strong><small>${esc(maskedPhone(user.phone || "尚未绑定手机号"))}</small></span>
          <label class="avatar-upload-label">更换头像<input id="avatar-upload" type="file" accept="image/*" hidden>${icon("edit")}</label>
        </div>
        <form id="personal-info-form" class="profile-info-form">
          <div class="profile-form-heading"><strong>基本信息</strong><small>完善后用于账号识别与服务联系</small></div>
          <div class="profile-data-list">
            <label class="profile-data-row"><span>姓名</span><input name="name" required maxlength="30" value="${esc(user.name || "")}" placeholder="请输入姓名"></label>
            <label class="profile-data-row"><span>性别</span><select name="gender"><option value="">请选择</option><option value="女" ${user.gender === "女" ? "selected" : ""}>女</option><option value="男" ${user.gender === "男" ? "selected" : ""}>男</option><option value="不便透露" ${user.gender === "不便透露" ? "selected" : ""}>不便透露</option></select></label>
            <label class="profile-data-row"><span>生日</span><input name="birthday" type="date" value="${esc(user.birthday || "")}"></label>
            <label class="profile-data-row"><span>所在地区</span><input name="region" value="${esc(region)}" placeholder="省 / 市 / 区"></label>
          </div>
          <a class="account-address-link profile-address-link" href="mini-addresses.html"><span><strong>收货地址</strong><small>配送地址与默认地址</small></span><span>${state.addresses?.length || 0} 个地址 ${icon("chevron")}</span></a>
          <div class="profile-form-footer"><small>手机号：${esc(maskedPhone(user.phone || "尚未绑定"))}</small><a href="mini-profile.html?view=change-phone&back=personal">更换 ${icon("arrow")}</a></div>
          <button class="primary-btn account-save-button" type="submit">保存资料</button>
        </form>
      </section>
      <a class="settings-pet-entry" href="mini-profile.html?view=pets"><span class="settings-row-icon">${icon("heart")}</span><span class="settings-row-copy"><strong>爱宠档案</strong><small>记录宠物生日、品种与成长信息</small></span><span class="pet-entry-count">${user.pets?.length || 0} 只</span>${icon("chevron")}</a>
      `, "profile", "personal-page");

    root.querySelector("#personal-info-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state = read();
      state.user.name = String(form.get("name") || "").trim();
      state.user.gender = String(form.get("gender") || "");
      state.user.birthday = String(form.get("birthday") || "");
      const parts = String(form.get("region") || "").trim().split(/[，,\s]+/).filter(Boolean);
      [state.user.province, state.user.city, state.user.district] = [parts[0] || "", parts[1] || "", parts.slice(2).join("") || ""];
      write(state);
      renderPersonal();
      toast("基本信息已保存");
    });
    root.querySelector("#avatar-upload")?.addEventListener("change", event => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 1_000_000) return toast("头像图片不能超过 1 MB");
      const reader = new FileReader();
      reader.onload = () => {
        state = read();
        state.user.avatarDataUrl = String(reader.result || "");
        write(state);
        renderPersonal();
        toast("头像已更新");
      };
      reader.onerror = () => toast("图片读取失败，请重试");
      reader.readAsDataURL(file);
    });
  }

  function renderPetArchive() {
    state = read();
    state.user.pets ||= [];
    const pets = state.user.pets.map(pet => `<article class="pet-editor-card pet-profile-card">
      <form class="pet-editor-form" data-pet-id="${esc(pet.id)}">
        <div class="pet-editor-head">
          <span class="pet-mark">${icon("heart")}</span>
          <span class="pet-title-copy"><strong>${esc(pet.name || "新宠物")}</strong><small>${esc(pet.kind || "宠物")} · ${esc(pet.breed || "品种待完善")} · ${esc(petAge(pet.birthday))}</small></span>
          <button type="button" class="text-action" data-action="pet-delete" data-id="${esc(pet.id)}">移除</button>
        </div>
        <div class="pet-profile-grid">
          <label class="field">宠物昵称<input name="name" required maxlength="20" value="${esc(pet.name || "")}" placeholder="如：团团"></label>
          <label class="field">宠物类型<select name="kind"><option ${pet.kind === "猫咪" ? "selected" : ""}>猫咪</option><option ${pet.kind === "狗狗" ? "selected" : ""}>狗狗</option><option ${pet.kind && !["猫咪", "狗狗"].includes(pet.kind) ? "selected" : ""}>其他</option></select></label>
          <label class="field">品种<input name="breed" maxlength="30" value="${esc(pet.breed || "")}" placeholder="如：英短"></label>
          <label class="field">生日<input name="birthday" type="date" value="${esc(pet.birthday || "")}"></label>
        </div>
        <button class="pet-save-button" type="submit">保存爱宠档案 ${icon("arrow")}</button>
      </form>
    </article>`).join("");
    renderAccountPage("爱宠档案", `<div class="account-page-intro"><span class="account-eyebrow">LIFE COMPANIONS</span><strong>爱宠档案</strong><span>记录爱宠的生日、品种与成长信息</span></div>
      <section class="account-section pet-profile-section">
        <div class="account-section-head"><span><strong>我的爱宠</strong><small>档案信息仅用于个性化服务</small></span><button type="button" class="secondary-btn" data-action="pet-add">${icon("plus")} 添加</button></div>
        ${pets || `<div class="white-card account-empty">还没有爱宠档案，点击“添加”开始记录。</div>`}
      </section>`, "settings", "pet-archive-page");
    root.querySelectorAll(".pet-editor-form").forEach(formElement => {
      formElement.addEventListener("submit", event => {
        event.preventDefault();
        const form = new FormData(formElement);
        state = read();
        const pet = state.user.pets?.find(item => item.id === formElement.dataset.petId);
        if (!pet) return;
        pet.name = String(form.get("name") || "").trim();
        pet.kind = String(form.get("kind") || "其他");
        pet.breed = String(form.get("breed") || "").trim();
        pet.birthday = String(form.get("birthday") || "");
        write(state);
        renderPetArchive();
        toast("爱宠档案已保存");
      });
    });
  }

  function renderSettings() {
    state = read();
    const user = state.user;
    const userRegion = [user.province, user.city, user.district].filter(Boolean).join(" ") || "未填写";
    renderAccountPage("设置", `
      <div class="account-page-intro settings-page-intro"><span class="account-eyebrow">PREFERENCES</span><strong>个人设置</strong><span>管理个人资料、账号安全与隐私偏好</span></div>
      <section class="settings-section">
        <details class="settings-profile-details" open>
          <summary class="settings-section-heading settings-profile-summary"><span><strong>个人信息</strong><small>${esc(user.name || "尚未填写姓名")} · ${esc(maskedPhone(user.phone || "尚未绑定手机号"))}</small></span><span>PROFILE ${icon("chevron")}</span></summary>
          <div class="settings-profile-card">
            <div class="settings-profile-identity">${avatarMarkup(user, "avatar account-avatar")}<span><strong>${esc(user.name || "商城用户")}</strong><small>${esc(maskedPhone(user.phone || "尚未绑定手机号"))}</small></span></div>
            <div class="settings-profile-grid">
              <div><small>性别</small><strong>${esc(user.gender || "未填写")}</strong></div>
              <div><small>生日</small><strong>${esc(user.birthday || "未填写")}</strong></div>
              <div><small>所在地区</small><strong>${esc(userRegion)}</strong></div>
              <div><small>收货地址</small><strong>${state.addresses?.length || 0} 个地址</strong></div>
            </div>
            <a class="settings-profile-edit" href="mini-profile.html?view=personal">编辑个人资料 ${icon("arrow")}</a>
          </div>
        </details>
      </section>
      <a class="settings-pet-entry settings-pet-entry-card" href="mini-profile.html?view=pets"><span class="settings-row-icon">${icon("heart")}</span><span class="settings-row-copy"><strong>爱宠档案</strong><small>记录宠物生日、品种与成长信息</small></span><span class="pet-entry-count">${user.pets?.length || 0} 只</span>${icon("chevron")}</a>
      <section class="settings-section">
        <div class="settings-section-heading"><strong>账号与安全</strong><span>ACCOUNT</span></div>
        <div class="settings-card">
          <a class="account-menu-row" href="mini-profile.html?view=change-phone"><span class="settings-row-icon">${icon("phone")}</span><span class="settings-row-copy"><strong>手机号</strong><small>${esc(maskedPhone(state.user.phone || "尚未绑定"))}</small></span>${icon("chevron")}</a>
          <a class="account-menu-row" href="mini-profile.html?view=set-password"><span class="settings-row-icon">${icon("settings")}</span><span class="settings-row-copy"><strong>登录密码</strong><small>${state.user.passwordConfigured ? `最近更新 ${esc(state.user.passwordUpdatedAt || "—")}` : "尚未设置"}</small></span>${icon("chevron")}</a>
          <a class="account-menu-row" href="mini-profile.html?view=permissions"><span class="settings-row-icon">${icon("service")}</span><span class="settings-row-copy"><strong>授权管理</strong><small>位置、相机、相册与消息通知</small></span>${icon("chevron")}</a>
          <a class="account-menu-row" href="mini-profile.html?view=security"><span class="settings-row-icon">${icon("member")}</span><span class="settings-row-copy"><strong>安全中心</strong><small>实名认证、注销与常见问题</small></span>${icon("chevron")}</a>
        </div>
      </section>
      <section class="settings-section">
        <div class="settings-section-heading"><strong>协议与隐私</strong><span>PRIVACY</span></div>
        <div class="settings-card">
          <a class="account-menu-row" href="mini-profile.html?view=legal"><span class="settings-row-icon">${icon("file")}</span><span class="settings-row-copy"><strong>协议与规则</strong><small>隐私声明、商城协议与服务规则</small></span>${icon("chevron")}</a>
          <a class="account-menu-row" href="mini-profile.html?view=collection"><span class="settings-row-icon">${icon("order")}</span><span class="settings-row-copy"><strong>个人信息收集清单</strong><small>了解信息类别与使用目的</small></span>${icon("chevron")}</a>
        </div>
      </section>
      <p class="settings-footnote">账号设置仅在本地演示环境保存，不连接真实认证服务。</p>`, "profile", "settings-page");
  }

  function renderPermissions() {
    state = read();
    state.user.authorizations ||= {};
    const items = [
      ["location", "位置信息", "用于自动填写收货地址与配送范围判断"],
      ["camera", "相机", "用于拍摄头像、商品问题及客服图片"],
      ["album", "相册与媒体", "用于选择头像及向客服发送图片、视频"],
      ["notifications", "消息通知", "用于订单状态、客服回复与活动消息提醒"]
    ];
    renderAccountPage("授权管理", `<div class="account-page-intro"><strong>应用权限</strong><span>你可以随时调整可选权限</span></div>
      <section class="white-card account-menu-group">${items.map(([key, title, description]) => `<label class="permission-row"><span><strong>${title}</strong><small>${description}</small></span><input type="checkbox" data-action="authorization-toggle" data-key="${key}" ${state.user.authorizations[key] ? "checked" : ""}></label>`).join("")}</section>
      <div class="inline-help">关闭权限后，对应功能可能需要你手动输入信息或无法使用媒体能力。必要的订单信息处理不受此处开关影响。</div>`);
    root.querySelectorAll("[data-action='authorization-toggle']").forEach(control => {
      control.addEventListener("change", () => {
        state = read();
        state.user.authorizations ||= {};
        state.user.authorizations[control.dataset.key] = control.checked;
        write(state);
        toast(`${control.checked ? "已开启" : "已关闭"}${control.closest(".permission-row")?.querySelector("strong")?.textContent || "权限"}`);
      });
    });
  }

  function renderLegalDocuments() {
    state = read();
    const documents = (state.legalDocuments || []).filter(item => item.status !== "inactive");
    renderAccountPage("协议与规则", `<div class="account-page-intro"><strong>协议与规则</strong><span>内容由商城运营维护，更新后同步展示</span></div>
      <section class="white-card account-menu-group">${documents.map(document => `<button class="account-menu-row account-menu-button" type="button" data-action="legal-open" data-id="${esc(document.id)}"><span><strong>${esc(document.title)}</strong><small>${esc(document.category || "商城规则")} · ${esc(document.version || "当前版本")} · 更新于 ${esc(document.updatedAt || "—")}</small></span>${icon("chevron")}</button>`).join("") || `<div class="account-empty">暂无已发布的协议与规则</div>`}</section>
      <p class="mini-notice">具体适用范围与生效时间以运营后台发布版本为准。</p>`);
  }

  function renderInformationCollection() {
    const rows = [
      ["账号与联系方式", "姓名、手机号", "账号识别、登录保护及客服联系"],
      ["配送与订单", "收货人、地址、商品、支付及物流状态", "完成下单、配送、售后与交易记录查询"],
      ["设备与权限", "设备基础信息、系统授权状态", "保障服务运行、问题排查与权限调用"],
      ["客服沟通", "文字、图片、视频及会话时间", "处理咨询、投诉和售后问题"],
      ["个人自愿资料", "性别、生日、地区、宠物资料", "个性化展示、会员服务及相关商品推荐"]
    ];
    renderAccountPage("个人信息收集清单", `<div class="account-page-intro"><strong>我们收集的信息</strong><span>按功能必要性使用，不同信息对应不同服务目的</span></div>
      <section class="white-card collection-list">${rows.map(([title, data, purpose], index) => `<article class="collection-row"><span class="collection-index">0${index + 1}</span><div><strong>${title}</strong><small>信息范围：${data}</small><small>使用目的：${purpose}</small></div></article>`).join("")}</section>
      <div class="inline-help">你可在授权管理中关闭非必要设备权限；订单履约所需信息会在订单、售后及法律要求的期限内处理。</div>`);
  }

  function renderSecurityCenter() {
    state = read();
    const realNameStatus = state.user.realName?.status || "未认证";
    renderAccountPage("安全中心", `<div class="account-page-intro"><strong>账号安全</strong><span>认证状态：${esc(realNameStatus)}</span></div>
      <section class="white-card account-menu-group">
        <a class="account-menu-row" href="mini-profile.html?view=real-name"><span><strong>更新实名认证信息</strong><small>${esc(state.user.realName?.name || "尚未认证")} · ${esc(state.user.realName?.maskedId || "未填写证件信息")}</small></span>${icon("chevron")}</a>
        <a class="account-menu-row" href="mini-profile.html?view=set-password&back=security"><span><strong>登录密码</strong><small>${state.user.passwordConfigured ? `上次更新：${esc(state.user.passwordUpdatedAt || "—")}` : "尚未设置登录密码"}</small></span>${icon("chevron")}</a>
        <a class="account-menu-row" href="mini-profile.html?view=faq"><span><strong>常见问题</strong><small>手机号、安全验证、账号和隐私</small></span>${icon("chevron")}</a>
        <a class="account-menu-row danger-link" href="mini-profile.html?view=cancel-account"><span><strong>注销账号</strong><small>${state.user.accountDeletionRequest?.status === "pending" ? "注销申请处理中" : "提交后将由客服核验处理"}</small></span>${icon("chevron")}</a>
      </section>
      <div class="inline-help">为保护你的权益，账号注销申请需要完成身份核验；本原型只记录申请，不会真实删除账号或订单数据。</div>`, "settings");
  }

  function renderChangePhone() {
    state = read();
    renderAccountPage("更换手机号", `<div class="account-page-intro"><strong>验证新手机号</strong><span>更换后将用于账号登录与重要通知</span></div>
      <section class="white-card account-form-card"><form id="change-phone-form">
        <label class="field">当前手机号<input value="${esc(maskedPhone(state.user.phone || "未绑定"))}" disabled></label>
        <label class="field">新手机号<input name="phone" type="tel" inputmode="numeric" pattern="1[3-9][0-9]{9}" maxlength="11" required placeholder="请输入 11 位手机号"></label>
        <label class="field">短信验证码<span class="phone-code-row"><input name="code" inputmode="numeric" maxlength="6" required placeholder="演示验证码：123456"><button type="button" class="secondary-btn" data-action="send-phone-code">获取验证码</button></span></label>
        <button class="primary-btn account-save-button" type="submit">确认更换</button>
      </form></section><div class="inline-help">原型验证码固定为 123456，仅用于演示流程，不会发送真实短信。</div>`, params.get("back") || "settings");
    root.querySelector("#change-phone-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const phone = String(form.get("phone") || "").trim();
      if (!phoneCodeRequested) return toast("请先获取短信验证码");
      if (String(form.get("code")) !== "123456") return toast("验证码错误，请输入 123456");
      state = read();
      state.user.phone = phone;
      state.user.phoneUpdatedAt = new Date().toISOString().slice(0, 10);
      write(state);
      phoneCodeRequested = false;
      navigateProfileView("personal");
      renderPersonal();
      toast("手机号已更新");
    });
  }

  function renderSetPassword() {
    renderAccountPage("设置登录密码", `<div class="account-page-intro"><strong>设置新的登录密码</strong><span>至少 8 位，建议包含字母与数字</span></div>
      <section class="white-card account-form-card"><form id="password-form">
        <label class="field">新密码<input name="password" type="password" minlength="8" maxlength="64" autocomplete="new-password" required placeholder="至少 8 位字符"></label>
        <label class="field">确认新密码<input name="confirm" type="password" minlength="8" maxlength="64" autocomplete="new-password" required placeholder="再次输入新密码"></label>
        <button class="primary-btn account-save-button" type="submit">保存密码</button>
      </form></section><div class="inline-help">演示环境不会保存密码明文，只记录密码已设置及更新时间。</div>`, params.get("back") || "settings");
    root.querySelector("#password-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      if (form.get("password") !== form.get("confirm")) return toast("两次输入的密码不一致");
      state = read();
      state.user.passwordConfigured = true;
      state.user.passwordUpdatedAt = new Date().toISOString().slice(0, 10);
      write(state);
      navigateProfileView("security");
      renderSecurityCenter();
      toast("登录密码已更新");
    });
  }

  function renderRealName() {
    state = read();
    const profile = state.user.realName || {};
    renderAccountPage("更新实名认证信息", `<div class="account-page-intro"><strong>实名认证</strong><span>当前状态：${esc(profile.status || "未认证")}</span></div>
      <section class="white-card account-form-card"><form id="real-name-form">
        <label class="field">真实姓名<input name="name" required maxlength="30" value="${esc(profile.name || "")}" placeholder="请输入证件姓名"></label>
        <label class="field">身份证号码<input name="idNumber" inputmode="numeric" minlength="15" maxlength="18" required placeholder="${profile.maskedId ? `当前 ${esc(profile.maskedId)}，请输入新证件号码` : "请输入 15 或 18 位身份证号码"}"></label>
        <button class="primary-btn account-save-button" type="submit">提交核验申请</button>
      </form></section><div class="inline-help">演示仅保存姓名、脱敏证件尾号和待核验状态，不保留完整证件号码。</div>`, "security");
    root.querySelector("#real-name-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const idNumber = String(form.get("idNumber") || "").trim();
      if (!/^(\d{15}|\d{17}[\dXx])$/.test(idNumber)) return toast("请输入有效的身份证号码");
      state = read();
      state.user.realName = { name: String(form.get("name") || "").trim(), maskedId: `${"*".repeat(idNumber.length - 4)}${idNumber.slice(-4)}`, status: "待核验", updatedAt: new Date().toISOString().slice(0, 10) };
      write(state);
      navigateProfileView("security");
      renderSecurityCenter();
      toast("实名认证更新申请已提交");
    });
  }

  function renderAccountFaq() {
    const questions = [
      ["如何更换绑定手机号？", "在设置中选择“更换手机号”，输入新手机号并完成演示验证码校验。正式服务需通过短信或其他安全验证。"],
      ["忘记登录密码怎么办？", "通过已绑定手机号完成身份验证后重设密码；本原型只演示设置流程，不连接真实认证服务。"],
      ["如何撤回应用授权？", "进入设置 - 授权管理，可随时关闭位置、相机、相册或通知权限。"],
      ["提交注销申请后会立即删除数据吗？", "不会。注销申请需要核验身份并处理未完成订单、售后及法定留存义务后完成。"]
    ];
    renderAccountPage("常见问题", `<div class="account-page-intro"><strong>账号与隐私常见问题</strong><span>点击查看处理说明</span></div>
      <section class="white-card account-menu-group">${questions.map(([question, answer], index) => `<details class="faq-row" ${index === 0 ? "open" : ""}><summary>${question}<span>＋</span></summary><p>${answer}</p></details>`).join("")}</section>`, "security");
  }

  function renderCancelAccount() {
    state = read();
    const request = state.user.accountDeletionRequest;
    renderAccountPage("注销账号", `<div class="account-warning-card"><strong>提交前请了解</strong><p>注销申请提交后，客服将核验身份并确认未完成订单、退款与售后状态。完成注销后，账号服务及未使用权益可能无法恢复。</p></div>
      ${request?.status === "pending" ? `<section class="white-card account-form-card"><strong>申请处理中</strong><p class="inline-help">提交时间：${esc(request.requestedAt || "—")} · 请等待客服联系你完成核验。</p></section>` : `<section class="white-card account-form-card"><form id="cancel-account-form">
        <label class="field">注销原因<select name="reason"><option>不再使用</option><option>隐私顾虑</option><option>账号问题</option><option>其他原因</option></select></label>
        <label class="permission-row cancel-confirm"><span><strong>我已了解注销影响</strong><small>确认提交账号注销申请，后续由客服进行身份核验</small></span><input type="checkbox" name="confirm" required></label>
        <button class="danger-button account-save-button" type="submit">提交注销申请</button>
      </form></section>`}
      <div class="inline-help">本原型只记录待处理申请，不会删除账号或个人数据。</div>`, "security");
    root.querySelector("#cancel-account-form")?.addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      if (!form.get("confirm")) return toast("请先确认已了解注销影响");
      state = read();
      state.user.accountDeletionRequest = { status: "pending", reason: String(form.get("reason") || ""), requestedAt: new Date().toLocaleString("zh-CN") };
      write(state);
      renderCancelAccount();
      toast("注销申请已提交");
    });
  }

  function renderProfileView() {
    const view = params.get("view") || "";
    if (view === "chat") renderChat();
    else if (view === "personal") renderPersonal();
    else if (view === "pets") renderPetArchive();
    else if (view === "settings") renderSettings();
    else if (view === "permissions") renderPermissions();
    else if (view === "legal") renderLegalDocuments();
    else if (view === "collection") renderInformationCollection();
    else if (view === "security") renderSecurityCenter();
    else if (view === "change-phone") renderChangePhone();
    else if (view === "set-password") renderSetPassword();
    else if (view === "real-name") renderRealName();
    else if (view === "faq") renderAccountFaq();
    else if (view === "cancel-account") renderCancelAccount();
    else renderProfile();
  }

  function chatTime() {
    return new Date().toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function renderChat() {
    state = read();
    state.chatMessages ||= [];
    let changed = false;
    state.chatMessages.forEach(message => {
      if (message.sender === "staff" && !message.read) {
        message.read = true;
        changed = true;
      }
    });
    if (changed) write(state);
    const messages = state.chatMessages.map(message => {
      const isStaff = message.sender === "staff";
      const media = message.type === "image"
        ? `<img class="chat-media-image" src="${esc(message.mediaData || "")}" alt="${esc(message.fileName || "客服图片")}">`
        : message.type === "video"
          ? `<video class="chat-media-video" controls preload="metadata" src="${esc(message.mediaData || "")}"></video>`
          : "";
      return `<article class="chat-message ${isStaff ? "staff" : "user"}">
        <span class="chat-avatar">${isStaff ? "客" : "我"}</span><div class="chat-message-content">
          <div class="chat-bubble">${message.text ? `<p>${esc(message.text)}</p>` : ""}${media ? `<div class="chat-attachment">${media}</div>` : ""}</div>
          <time>${esc(message.createdAt || "")}</time>
        </div>
      </article>`;
    }).join("");
    miniShell({
      active: "profile",
      header: `<div class="mini-head-row"><a href="mini-profile.html" aria-label="返回" class="head-link">${icon("chevron")}</a><span class="mini-title">在线客服</span><span class="chat-head-note">本地演示会话</span></div>`,
      content: `<div class="chat-page">
        <div class="chat-service-note"><strong>商城在线客服</strong><span>留言后将收到模拟回复，正式接入可替换为微信客服接口。</span></div>
        <div class="chat-stream" id="chat-stream">${messages || `<div class="chat-time-divider">开始咨询</div>`}</div>
      </div>`,
      bottom: `<div class="chat-composer">
        <div class="chat-tools">
          <label class="chat-tool">图片<input type="file" data-action="chat-image" accept="image/*"></label>
          <label class="chat-tool">视频<input type="file" data-action="chat-video" accept="video/*"></label>
          <span class="chat-upload-hint">单个 ≤ 1.5 MB · 会话合计 ≤ 2.5 MB</span>
        </div>
        <div class="chat-compose-row"><textarea id="chat-input" rows="1" maxlength="1000" placeholder="输入消息..."></textarea><button type="button" class="primary-btn small" data-action="chat-send">发送</button></div>
      </div>`
    });
    const stream = root.querySelector("#chat-stream");
    if (stream) stream.scrollTop = stream.scrollHeight;
  }

  function appendChatMessage(message) {
    state = read();
    state.chatMessages ||= [];
    state.chatMessages.push({ id: `CS-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: chatTime(), ...message });
    try {
      write(state);
      return true;
    } catch {
      toast("本地存储空间不足，消息未能保存");
      return false;
    }
  }

  function scheduleChatReply() {
    window.setTimeout(() => {
      const chatIsOpen = new URLSearchParams(location.search).get("view") === "chat";
      appendChatMessage({
        sender: "staff",
        type: "text",
        text: "收到您的消息，我们已为您记录，客服将尽快跟进。",
        read: chatIsOpen
      });
      if (chatIsOpen) renderChat();
    }, 900);
  }

  function sendChatText() {
    const input = root.querySelector("#chat-input");
    const text = input?.value.trim();
    if (!text) return toast("请输入消息内容");
    if (!appendChatMessage({ sender: "user", type: "text", text, read: true })) return;
    renderChat();
    scheduleChatReply();
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("文件读取失败"));
      reader.readAsDataURL(file);
    });
  }

  async function sendChatMedia(input, type) {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith(`${type}/`)) return toast(`请选择有效的${type === "image" ? "图片" : "视频"}文件`);
    if (file.size > 1_500_000) return toast("演示版单个附件不能超过 1.5 MB");
    state = read();
    const savedBytes = (state.chatMessages || []).reduce((sum, message) => sum + Number(message.mediaBytes || 0), 0);
    if (savedBytes + file.size > 2_500_000) return toast("本地会话附件空间已满，请减少或清理附件");
    try {
      const mediaData = await readFileAsDataUrl(file);
      if (!appendChatMessage({ sender: "user", type, text: "", mediaData, mediaBytes: file.size, fileName: file.name, read: true })) return;
      renderChat();
      scheduleChatReply();
    } catch (error) {
      toast(error.message || "附件发送失败");
    }
  }

  root.addEventListener("click", event => {
    if (event.target.closest('[data-action="chat-send"]')) sendChatText();
  });
  root.addEventListener("change", event => {
    const input = event.target.closest('[data-action="chat-image"],[data-action="chat-video"]');
    if (input) sendChatMedia(input, input.dataset.action === "chat-image" ? "image" : "video");
  });
  root.addEventListener("keydown", event => {
    if (event.target.id === "chat-input" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendChatText();
    }
  });

  function addressReturnUrl() {
    const target = params.get("return");
    if (target === "product") {
      const productQuery = new URLSearchParams({ id: params.get("id") || "" });
      if (params.get("sku")) productQuery.set("sku", params.get("sku"));
      return `mini-product.html?${productQuery}`;
    }
    if (target === "checkout") return "mini-cart.html?checkout=1";
    if (target === "cart") return "mini-cart.html";
    return "mini-profile.html";
  }

  function renderAddresses() {
    state = read();
    state.addresses = state.addresses || [];
    const returnTarget = params.get("return") || "";
    const activeAddress = selectedAddress(state);
    const addressCards = state.addresses.map(address => {
      const active = activeAddress?.id === address.id;
      return `<article class="address-card ${active ? "selected" : ""}">
        <button class="address-card-main" type="button" data-action="address-select" data-id="${esc(address.id)}">
          <span class="address-check">${active ? "✓" : ""}</span><span class="address-card-copy">
            <span class="address-recipient"><strong>${esc(address.name)}</strong><span>${esc(address.phone)}</span>${address.isDefault ? `<em>默认</em>` : ""}</span>
            <span class="address-full">${esc(addressText(address))}</span>
          </span>
        </button>
        <div class="address-card-actions">
          <button type="button" data-action="address-default" data-id="${esc(address.id)}">${address.isDefault ? "默认地址" : "设为默认"}</button>
          <button type="button" data-action="address-edit" data-id="${esc(address.id)}">编辑</button>
          <button type="button" data-action="address-delete" data-id="${esc(address.id)}">删除</button>
          ${returnTarget ? `<button type="button" class="address-use" data-action="address-use" data-id="${esc(address.id)}">使用此地址</button>` : ""}
        </div>
      </article>`;
    }).join("");
    miniShell({
      active: "profile",
      header: `<div class="mini-head-row"><a class="head-link" href="${esc(addressReturnUrl())}" aria-label="返回">${icon("chevron")}</a><span class="mini-title">收货地址</span><button class="head-link" type="button" data-action="address-add">新增</button></div>`,
      content: `<div class="mini-content address-page">
        <div class="address-page-intro"><strong>我的收货地址</strong><span>${state.addresses.length} 个地址</span></div>
        ${addressCards || `<div class="empty-state address-empty"><strong>还没有收货地址</strong><p>添加地址后可用于商品配送和订单结算</p></div>`}
        <button class="address-add-button" type="button" data-action="address-add">＋ 新增收货地址</button>
        <p class="mini-notice">地址仅保存在当前浏览器，用于本原型的本地配送演示。</p>
      </div>`
    });
  }

  function openAddressForm(address = {}) {
    const backdrop = openModal(address.id ? "编辑收货地址" : "新增收货地址", `<form id="address-form">
      <div class="address-locate-row"><button type="button" class="secondary-btn" data-action="address-locate">自动获取当前位置</button><span id="address-location-status">需授权定位；网络可用时会用 OpenStreetMap 解析地址</span></div>
      <div class="form-grid">
        <label class="field">收货人<input name="name" required maxlength="30" value="${esc(address.name || state.user.name || "")}"></label>
        <label class="field">联系电话<input name="phone" required maxlength="20" value="${esc(address.phone || state.user.phone || "")}"></label>
        <label class="field">省份<input name="province" required value="${esc(address.province || "")}" placeholder="例如：上海市"></label>
        <label class="field">城市<input name="city" required value="${esc(address.city || "")}" placeholder="例如：上海市"></label>
        <label class="field">区县<input name="district" required value="${esc(address.district || "")}" placeholder="例如：徐汇区"></label>
        <label class="field" style="grid-column:1/-1">详细地址<input name="detail" required value="${esc(address.detail || "")}" placeholder="街道、门牌号等"></label>
      </div>
      <label class="address-default-choice"><input type="checkbox" name="isDefault" ${address.isDefault || !state.addresses.length ? "checked" : ""}> 设为默认收货地址</label>
      <input type="hidden" name="id" value="${esc(address.id || "")}">
    </form>`, `<button type="button" class="secondary-btn" data-modal-close>取消</button><button type="button" class="primary-btn small" data-action="address-save">保存</button>`);
    backdrop.querySelector("[data-action='address-locate']")?.addEventListener("click", () => {
      const status = backdrop.querySelector("#address-location-status");
      const form = backdrop.querySelector("#address-form");
      if (!navigator.geolocation) {
        status.textContent = "当前浏览器不支持定位，请手动填写地址";
        return;
      }
      status.textContent = "正在获取当前位置...";
      navigator.geolocation.getCurrentPosition(async position => {
        const { latitude, longitude } = position.coords;
        status.textContent = `已获取坐标 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}，正在解析地址...`;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=zh-CN`;
          const response = await fetch(url);
          if (!response.ok) throw new Error("地址解析服务暂不可用");
          const result = await response.json();
          const region = result.address || {};
          form.elements.province.value = region.state || region.province || "";
          form.elements.city.value = region.city || region.municipality || region.town || region.village || region.county || "";
          form.elements.district.value = region.city_district || region.district || region.suburb || region.county || "";
          form.elements.detail.value = [region.road, region.neighbourhood, region.house_number].filter(Boolean).join("");
          status.textContent = result.address ? "已填入定位地址，请核对并补充门牌号" : "已获取坐标，未解析出地址，请手动补全";
        } catch {
          form.elements.detail.value = `当前位置坐标 ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          status.textContent = "坐标已获取但地址解析失败，请手动补全省市区和门牌号";
        }
      }, error => {
        status.textContent = error.code === 1 ? "定位权限未授权，请允许浏览器访问位置" : "定位失败，请检查系统定位权限或手动填写";
      }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
    });
    backdrop.querySelector("[data-action='address-save']")?.addEventListener("click", () => {
      const form = backdrop.querySelector("#address-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const id = String(values.get("id") || `ADDR-${Date.now()}`);
      const addressData = {
        id,
        name: String(values.get("name")).trim(),
        phone: String(values.get("phone")).trim(),
        province: String(values.get("province")).trim(),
        city: String(values.get("city")).trim(),
        district: String(values.get("district")).trim(),
        detail: String(values.get("detail")).trim(),
        isDefault: values.get("isDefault") === "on"
      };
      if (addressData.isDefault || !state.addresses.length) state.addresses = state.addresses.map(item => ({ ...item, isDefault: false }));
      const existingIndex = state.addresses.findIndex(item => item.id === id);
      if (existingIndex >= 0) state.addresses[existingIndex] = addressData;
      else state.addresses.unshift(addressData);
      if (addressData.isDefault || state.selectedAddress?.id === id || !selectedAddress(state)) state.selectedAddress = addressData;
      write(state);
      closeModal();
      renderAddresses();
      toast("地址已保存");
    });
  }

  function renderPoints() {
    state = read();
    const balance = Number(state.user?.points ?? state.points ?? 0);
    const ledger = [
      { title: "购物消费奖励", date: "2026-10-18", detail: "订单完成后发放", amount: 320 },
      { title: "每日签到", date: "2026-10-17", detail: "连续签到奖励", amount: 10 },
      { title: "积分兑换", date: "2026-10-16", detail: "兑换会员礼品", amount: -100 },
      { title: "活动奖励", date: "2026-10-12", detail: "会员周末活动", amount: 240 }
    ];
    miniShell({
      active: "profile",
      header: `<div class="mini-head-row"><a class="head-link" href="mini-profile.html" aria-label="返回">${icon("chevron")}</a><span class="mini-title">积分明细</span><span></span></div>`,
      content: `<div class="mini-content points-page">
        <section class="points-balance-card"><span>当前可用积分</span><strong>${balance.toLocaleString()}</strong><small>积分可用于会员等级成长及商城权益</small></section>
        <section class="points-ledger white-card"><div class="section-head"><h2>积分记录</h2><span>全部</span></div>
          ${ledger.map(item => `<article class="points-ledger-row"><span class="points-ledger-icon">${item.amount > 0 ? "+" : "−"}</span><span class="points-ledger-copy"><strong>${esc(item.title)}</strong><small>${esc(item.date)} · ${esc(item.detail)}</small></span><strong class="${item.amount > 0 ? "points-positive" : "points-negative"}">${item.amount > 0 ? "+" : ""}${item.amount.toLocaleString()}</strong></article>`).join("")}
        </section>
        <p class="mini-notice">当前余额读取本地账户数据；下方积分记录为交互原型演示内容，不会改变积分余额。</p>
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
    const reviews = (product.reviews || []).filter(review => review.status !== "hidden");
    const skuSpecs = sku => sku.specs?.length ? sku.specs : [{ name: "版本", value: "标准版" }];
    const selectedSpecs = Object.fromEntries(skuSpecs(currentSku).map(spec => [spec.name, spec.value]));
    const selectedAddress = state.selectedAddress || state.addresses?.find(item => item.isDefault) || state.addresses?.[0];
    const addressLine = selectedAddress
      ? `${selectedAddress.province || ""}${selectedAddress.city || ""}${selectedAddress.district || ""}${selectedAddress.detail || ""}`
      : "请选择收货地址";
    const shippingPreview = window.MallOps.quoteShipping(
      [{ productId: product.id, price: currentSku.price, qty: detailQty }],
      selectedAddress,
      state
    );
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
          <span class="detail-address-icon">${icon("homeGoods")}</span><span><strong>配送至</strong><small>${esc(addressLine)}　${selectedAddress ? `${esc(selectedAddress.name || "")} ${esc(selectedAddress.phone || "")}` : ""} · ${shippingPreview.fee ? `运费 ${money(shippingPreview.fee)}` : "包邮"}</small></span>${icon("chevron")}
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
          ${reviews.slice(0, 3).map(review => `<article class="detail-review"><div class="detail-review-head"><strong>${esc(review.name || "商城用户")}</strong><span>${esc(review.date || "")}</span></div><div class="detail-stars">${"★".repeat(Math.max(1, Math.min(5, Number(review.rating || 5)))).padEnd(5, "☆")}</div><p>${esc(review.text || "用户已提交评分")}</p>${review.images?.length ? `<div class="detail-review-images">${review.images.map(src => `<img src="${esc(src)}" alt="用户评价图片">`).join("")}</div>` : ""}${review.reply?.text ? `<div class="detail-review-reply"><strong>${esc(review.reply.operator || "商家回复")}</strong><span>${esc(review.reply.text)}</span></div>` : ""}</article>`).join("")}
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
    const query = new URLSearchParams({ return: "product", id: params.get("id") || "" });
    if (detailSkuId) query.set("sku", detailSkuId);
    location.href = `mini-addresses.html?${query}`;
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
          address: { ...address, text: [address.province, address.city, address.district, address.detail].filter(Boolean).join("") },
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
    } else if (action === "cart-edit") {
      return;
    } else if (action === "checkout") {
      openCheckoutModal();
    } else if (action === "mock-order") {
      closeModal();
      toast("请选择商品后提交订单");
    } else if (action === "points") {
      location.href = "mini-points.html";
    } else if (action === "address-add") {
      openAddressForm();
    } else if (action === "address-edit") {
      const address = state.addresses?.find(item => item.id === control.dataset.id);
      if (address) openAddressForm(address);
    } else if (action === "address-select" || action === "address-default" || action === "address-use") {
      state = read();
      const address = state.addresses?.find(item => item.id === control.dataset.id);
      if (!address) return;
      state.selectedAddress = address;
      if (action === "address-default") state.addresses = state.addresses.map(item => ({ ...item, isDefault: item.id === address.id }));
      write(state);
      if (action === "address-use") location.href = addressReturnUrl();
      else renderAddresses();
    } else if (action === "address-delete") {
      state = read();
      const address = state.addresses?.find(item => item.id === control.dataset.id);
      if (!address) return;
      state.addresses = state.addresses.filter(item => item.id !== address.id);
      if (state.selectedAddress?.id === address.id) state.selectedAddress = state.addresses.find(item => item.isDefault) || state.addresses[0] || null;
      if (address.isDefault && state.addresses.length) state.addresses[0].isDefault = true;
      write(state);
      renderAddresses();
      toast("地址已删除");
    } else if (action === "pet-add") {
      state = read();
      state.user.pets ||= [];
      state.user.pets.push({ id: `PET-${Date.now()}`, name: "", kind: "猫咪", breed: "", birthday: "" });
      write(state);
      renderPetArchive();
    } else if (action === "pet-delete") {
      state = read();
      state.user.pets = (state.user.pets || []).filter(pet => pet.id !== control.dataset.id);
      write(state);
      renderPetArchive();
      toast("宠物信息已删除");
    } else if (action === "send-phone-code") {
      phoneCodeRequested = true;
      toast("演示验证码已发送：123456");
    } else if (action === "legal-open") {
      state = read();
      const document = state.legalDocuments?.find(item => item.id === control.dataset.id && item.status !== "inactive");
      if (document) openModal(document.title, `<article class="legal-document-body"><div>${esc(document.category || "商城规则")} · ${esc(document.version || "当前版本")} · 更新于 ${esc(document.updatedAt || "—")}</div><p>${esc(document.content || "").replace(/\r?\n/g, "<br>")}</p></article>`);
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

  document.addEventListener("change", event => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    if (control.dataset.action === "cart-sku") {
      state = read();
      const product = productById(control.dataset.id);
      const sourceSkuId = control.dataset.skuId;
      const targetSku = product?.skus?.find(item => item.id === control.value && item.status === "on");
      const sourceIndex = state.cart.findIndex(item => item.productId === control.dataset.id
        && (item.skuId || product?.skus?.[0]?.id) === sourceSkuId);
      const source = state.cart[sourceIndex];
      if (!source || !targetSku || Number(targetSku.stock) <= 0) {
        toast("该规格暂不可售");
        renderCart();
        return;
      }
      const targetIndex = state.cart.findIndex((item, index) => index !== sourceIndex
        && item.productId === control.dataset.id
        && (item.skuId || product?.skus?.[0]?.id) === targetSku.id);
      const target = targetIndex >= 0 ? state.cart[targetIndex] : null;
      const nextQty = Number(source.qty) + Number(target?.qty || 0);
      if (nextQty > Number(targetSku.stock)) {
        toast(`目标规格库存不足，当前仅剩 ${Number(targetSku.stock)} 件`);
        renderCart();
        return;
      }
      if (target) {
        target.qty = nextQty;
        target.selected = Boolean(target.selected || source.selected);
        state.cart.splice(sourceIndex, 1);
      } else source.skuId = targetSku.id;
      write(state);
      renderCart();
    } else if (control.dataset.action === "cart-coupon") {
      state = read();
      state.selectedCartCouponId = control.value || "";
      write(state);
      renderCart();
    } else if (control.dataset.action === "checkout-coupon") {
      state = read();
      state.selectedCartCouponId = control.value || "";
      write(state);
      const selected = state.cart.filter(item => item.selected).map(item => {
        const product = productById(item.productId);
        return { item, product, sku: product?.skus?.find(sku => sku.id === item.skuId) || product?.skus?.[0] };
      }).filter(item => item.sku);
      const pricing = cartPricing(selected, state.selectedCartCouponId, selectedAddress(state));
      const total = document.querySelector(".checkout-modal-total");
      const address = selectedAddress(state);
      if (total) total.innerHTML = `<div class="checkout-shipping-line"><span>配送费 ${address?.province ? `· ${esc(address.province)}` : ""}</span><strong>${pricing.shippingFee ? money(pricing.shippingFee) : "包邮"}</strong></div><div>预估应付 <strong>${money(pricing.total)}</strong>（含配送费）</div>`;
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
        state = read();
        const address = selectedAddress(state);
        if (!address) throw new Error("请先添加或选择收货地址");
        const orderAddress = { ...address, text: addressText(address) };
        const order = window.MallOps.createOrder({
          lines: selected.map(item => ({ productId: item.productId, skuId: item.skuId || productById(item.productId)?.skus?.[0]?.id, qty: item.qty })),
          address: orderAddress,
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
    else if (root.dataset.page === "cart") renderCart();
    else if (root.dataset.page === "profile") renderProfileView();
    else if (root.dataset.page === "addresses") renderAddresses();
    else if (root.dataset.page === "points") renderPoints();
  });

  const page = root.dataset.page;
  captureShareLanding();
  if (page === "home") renderHome();
  else if (page === "membership") renderMembership();
  else if (page === "cart") renderCart();
  else if (page === "profile") renderProfileView();
  else if (page === "addresses") renderAddresses();
  else if (page === "points") renderPoints();
  else if (page === "shop") renderShop();
  else if (page === "zone") renderZone();
  else if (page === "product-detail") renderProductDetail();
})();
