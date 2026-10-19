(() => {
  const { read, write, image } = window.MallData;
  const { icon, escapeHtml: esc, money, toast, openModal, closeModal, adminShell } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;

  let state = read();
  let productQuery = "";
  let productCategory = "all";
  let productStatus = "all";
  const tagNames = { top: "畅销", new: "新品", recommend: "推荐" };
  const categoryName = (parent, subcat) => {
    const zone = state.zones.find(item => item.id === parent);
    return `${zone?.name || "未分类"} / ${zone?.subcats?.find(item => item.id === subcat)?.name || "其他"}`;
  };

  function pageHead(title, description, actions = "") {
    return `<div class="admin-page-head"><div><h1>${title}</h1><p>${description}</p></div><div class="admin-actions">${actions}</div></div>`;
  }

  function stat(label, value, note, trend = "") {
    return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-number">${value}</div><div class="stat-foot">${trend ? `<em>${trend}</em>　` : ""}${note}</div></div>`;
  }

  function tagButtons(product) {
    return `<div class="tag-control">${Object.entries(tagNames).map(([key, name]) =>
      `<button type="button" class="tag-toggle ${key} ${(product.tags || []).includes(key) ? "active" : ""}" data-action="toggle-tag" data-id="${esc(product.id)}" data-tag="${key}">${name}</button>`
    ).join("")}</div>`;
  }

  function renderProductRows() {
    const rows = state.products.filter(product => {
      const qMatch = !productQuery || `${product.name} ${product.subtitle}`.toLowerCase().includes(productQuery.toLowerCase());
      const cMatch = productCategory === "all" || product.parent === productCategory;
      const sMatch = productStatus === "all" || product.status === productStatus;
      return qMatch && cMatch && sMatch;
    });
    const tbody = root.querySelector("#product-rows");
    if (!tbody) return;
    tbody.innerHTML = rows.length ? rows.map(product => `<tr>
      <td><div class="product-cell"><img src="${product.image}" alt="${esc(product.name)}"><div><strong>${esc(product.name)}</strong><small>${esc(product.subtitle || "")}</small></div></div></td>
      <td><strong style="color:#e96219">${money(product.price)}</strong><div style="margin-top:3px;color:#aaa;text-decoration:line-through;font-size:9px">${product.original ? money(product.original) : "—"}</div></td>
      <td>${Number(product.stock).toLocaleString()}</td>
      <td>${esc(categoryName(product.parent, product.category))}</td>
      <td>${tagButtons(product)}</td>
      <td><span class="status ${product.status === "on" ? "" : "off"}">${product.status === "on" ? "销售中" : "已下架"}</span></td>
      <td><div class="row-actions"><button class="text-action" data-action="edit-product" data-id="${esc(product.id)}">编辑</button><button class="text-action" data-action="toggle-status" data-id="${esc(product.id)}">${product.status === "on" ? "下架" : "上架"}</button></div></td>
    </tr>`).join("") : `<tr><td colspan="7"><div class="admin-empty">没有符合条件的商品</div></td></tr>`;
    root.querySelector("#visible-count").textContent = `${rows.length} 件商品`;
  }

  function renderProducts() {
    state = read();
    const onShelf = state.products.filter(product => product.status === "on").length;
    const topCount = state.products.filter(product => product.tags?.includes("top")).length;
    const lowStock = state.products.filter(product => Number(product.stock) < 50).length;
    const actions = `<button class="admin-btn" data-action="export-products">${icon("file")}导出</button><button class="admin-btn primary" data-action="add-product">${icon("plus")}新增商品</button>`;
    root.innerHTML = adminShell("products", `${pageHead("商品管理", "管理商品信息、分类与首页展示标签。畅销标签会同步到小程序首页。", actions)}
      <div class="stats-row">
        ${stat("在售商品", onShelf, `共 ${state.products.length} 件商品`, "+8.2%")}
        ${stat("首页畅销", topCount, "首页最多展示 8 件")}
        ${stat("库存预警", lowStock, "库存低于 50 件")}
        ${stat("已配置分类", state.zones.length, "一级分类专区", "+2")}
      </div>
      <section class="panel">
        <div class="panel-head"><span class="panel-title">商品列表</span><span class="panel-note" id="visible-count"></span></div>
        <div class="panel-body" style="padding-bottom:12px">
          <div class="filters">
            <label class="admin-search">${icon("search")}<input id="product-search" type="search" placeholder="搜索商品名称"></label>
            <select class="admin-select" id="product-category"><option value="all">全部分类</option>${state.zones.map(zone => `<option value="${esc(zone.id)}">${esc(zone.name)}</option>`).join("")}</select>
            <select class="admin-select" id="product-status"><option value="all">全部状态</option><option value="on">销售中</option><option value="off">已下架</option></select>
            <span class="inline-help" style="margin-left:auto">点击标签即可切换首页推荐规则</span>
          </div>
        </div>
        <div class="table-wrap"><table class="admin-table"><thead><tr><th>商品</th><th>售价</th><th>库存</th><th>分类</th><th>展示标签</th><th>状态</th><th>操作</th></tr></thead><tbody id="product-rows"></tbody></table></div>
        <div class="pagination"><span>商品展示由后台数据实时驱动小程序</span><div class="page-numbers"><button class="page-num active">1</button><button class="page-num">2</button><button class="page-num">›</button></div></div>
      </section>`);
    renderProductRows();
    root.querySelector("#product-search").addEventListener("input", event => { productQuery = event.target.value; renderProductRows(); });
    root.querySelector("#product-category").addEventListener("change", event => { productCategory = event.target.value; renderProductRows(); });
    root.querySelector("#product-status").addEventListener("change", event => { productStatus = event.target.value; renderProductRows(); });
  }

  function productForm(product = null) {
    const editing = Boolean(product);
    const item = product || { id: "", name: "", subtitle: "", price: 0, original: 0, stock: 0, parent: state.zones[0]?.id || "digital", category: state.zones[0]?.subcats?.[0]?.id || "phones", tags: [], status: "on" };
    const parentOptions = state.zones.map(zone => `<option value="${esc(zone.id)}" ${item.parent === zone.id ? "selected" : ""}>${esc(zone.name)}</option>`).join("");
    const subcatOptions = state.zones.find(zone => zone.id === item.parent)?.subcats || [];
    const tagOptions = Object.entries(tagNames).map(([key, name]) => `<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" name="tags" value="${key}" ${(item.tags || []).includes(key) ? "checked" : ""}>${name}</label>`).join("");
    const backdrop = openModal(editing ? "编辑商品" : "新增商品", `<form id="product-form">
      <div class="form-grid">
        <label class="field" style="grid-column:1/-1">商品名称<input name="name" required value="${esc(item.name)}" placeholder="填写商品名称"></label>
        <label class="field" style="grid-column:1/-1">商品副标题<input name="subtitle" value="${esc(item.subtitle || "")}" placeholder="规格或卖点"></label>
        <label class="field">售价（元）<input name="price" type="number" min="0" step="0.01" required value="${Number(item.price)}"></label>
        <label class="field">库存<input name="stock" type="number" min="0" required value="${Number(item.stock)}"></label>
        <label class="field">一级分类<select name="parent">${parentOptions}</select></label>
        <label class="field">二级分类<select name="category">${subcatOptions.map(option => `<option value="${esc(option.id)}" ${item.category === option.id ? "selected" : ""}>${esc(option.name)}</option>`).join("")}</select></label>
        <label class="field">商品状态<select name="status"><option value="on" ${item.status === "on" ? "selected" : ""}>销售中</option><option value="off" ${item.status === "off" ? "selected" : ""}>已下架</option></select></label>
        <div class="field">首页标签<div style="display:flex;gap:12px;padding:7px 0">${tagOptions}</div></div>
      </div>
      <input type="hidden" name="id" value="${esc(item.id)}">
    </form>`, `<button type="button" class="secondary-btn" data-modal-close>取消</button><button type="submit" form="product-form" class="primary-btn small">保存商品</button>`);
    backdrop.querySelector('[name="parent"]').addEventListener("change", event => {
      const options = state.zones.find(zone => zone.id === event.target.value)?.subcats || [];
      backdrop.querySelector('[name="category"]').innerHTML = options.map(option => `<option value="${esc(option.id)}">${esc(option.name)}</option>`).join("");
    });
    backdrop.querySelector("#product-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const parent = form.get("parent");
      const data = {
        id: form.get("id") || `p${Date.now().toString().slice(-6)}`,
        name: String(form.get("name")).trim(),
        subtitle: String(form.get("subtitle") || "").trim(),
        price: Number(form.get("price")),
        original: editing ? item.original : Number(form.get("price")),
        stock: Number(form.get("stock")),
        parent,
        category: form.get("category"),
        tags: form.getAll("tags"),
        status: form.get("status"),
        image: editing ? item.image : image(`Premium ecommerce product photography for ${String(form.get("name")).trim()}, clean bright white studio background, no text`)
      };
      const index = state.products.findIndex(entry => entry.id === data.id);
      if (index >= 0) state.products[index] = data;
      else state.products.unshift(data);
      write(state);
      closeModal();
      renderProducts();
      toast("商品信息已保存，小程序将同步更新");
    });
  }

  function renderMembership() {
    state = read();
    const tiers = [...state.tiers].sort((a, b) => a.points - b.points);
    const actions = `<button class="admin-btn" data-action="preview-member">${icon("member")}预览小程序</button><button class="admin-btn primary" data-action="add-tier">${icon("plus")}新增等级</button>`;
    const cards = tiers.map((tier, index) => `<article class="tier-admin-card">
      <div class="tier-admin-top"><span class="tier-admin-name">${esc(tier.name)}</span><span>LEVEL 0${index + 1}</span></div>
      <div class="tier-admin-discount">${tier.discount === 100 ? "会员价" : `${Number(tier.discount) / 10} 折`}<small>　全场购物</small></div>
      <div class="tier-admin-foot">门槛：${Number(tier.points).toLocaleString()} 积分<br>${esc(tier.benefits)}</div>
      <div class="tier-admin-actions"><button class="text-action" data-action="edit-tier" data-id="${esc(tier.id)}">编辑规则 ${icon("chevron")}</button></div>
    </article>`).join("");
    root.innerHTML = adminShell("membership", `${pageHead("会员等级与折扣", "配置成长门槛与会员权益，保存后同步到小程序会员中心。", actions)}
      <div class="stats-row">
        ${stat("会员等级", tiers.length, "支持按成长积分升级")}
        ${stat("当前会员", "12,680", "近 30 天活跃会员", "+12.6%")}
        ${stat("最高折扣", `${Math.min(...tiers.map(t => t.discount)) / 10} 折`, `${tiers.at(-1)?.name || "最高等级"}专享`)}
        ${stat("升级积分", Number(tiers.at(-1)?.points || 0).toLocaleString(), "最高等级成长门槛")}
      </div>
      <div class="section-head" style="margin:0 0 10px"><h2 style="font-size:13px">等级配置</h2><span class="inline-help">拖动排序暂不启用，等级按积分门槛自动排序</span></div>
      <div class="tiers-grid">${cards}</div>
      <div class="compare-layout">
        <section class="panel"><div class="panel-head"><span class="panel-title">小程序权益展示预览</span><span class="panel-note">读取当前已保存规则</span></div>
          <div class="comparison-preview">${tiers.map(tier => `<div><strong>${esc(tier.name)}</strong><span>${tier.discount === 100 ? "会员价" : `${Number(tier.discount) / 10} 折`}</span><small>${Number(tier.points).toLocaleString()} 积分起</small></div>`).join("")}</div>
        </section>
        <section class="panel"><div class="panel-head"><span class="panel-title">升级规则说明</span></div><div class="panel-body"><div class="rule-list">
          <div class="rule-item"><span class="rule-bullet">1</span><span>用户达到对应成长积分门槛后，自动升级至最高可达等级。</span></div>
          <div class="rule-item"><span class="rule-bullet">2</span><span>折扣按订单商品金额计算；保存后小程序会员页展示最新折扣。</span></div>
          <div class="rule-item"><span class="rule-bullet">3</span><span>调整门槛时请保持等级梯度递增，避免成长区间重叠。</span></div>
        </div></div></section>
      </div>`);
  }

  function tierForm(tier = null) {
    const editing = Boolean(tier);
    const item = tier || { id: "", name: "", points: "", discount: 95, benefits: "" };
    const backdrop = openModal(editing ? "编辑会员等级" : "新增会员等级", `<form id="tier-form"><div class="form-grid">
      <label class="field">等级名称<input name="name" required value="${esc(item.name)}" placeholder="例如：金卡会员"></label>
      <label class="field">成长积分门槛<input name="points" type="number" min="0" required value="${item.points}" placeholder="例如：5000"></label>
      <label class="field">全场折扣（折）<input name="discount" type="number" min="1" max="10" step=".1" required value="${Number(item.discount) / 10}"></label>
      <label class="field" style="grid-column:1/-1">核心权益描述<input name="benefits" required value="${esc(item.benefits)}" placeholder="例如：每月专属礼券 · 新品优先购"></label>
      <div class="inline-help" style="grid-column:1/-1">折扣填写 9 代表 9 折；积分和折扣规则会同步至会员中心。</div>
      <input type="hidden" name="id" value="${esc(item.id)}">
    </div></form>`, `<button class="secondary-btn" type="button" data-modal-close>取消</button><button class="primary-btn small" form="tier-form" type="submit">保存等级</button>`);
    backdrop.querySelector("#tier-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const data = { id: form.get("id") || `tier-${Date.now()}`, name: String(form.get("name")).trim(), points: Number(form.get("points")), discount: Number(form.get("discount")) * 10, benefits: String(form.get("benefits")).trim() };
      const index = state.tiers.findIndex(entry => entry.id === data.id);
      if (index >= 0) state.tiers[index] = data;
      else state.tiers.push(data);
      state.tiers.sort((a, b) => a.points - b.points);
      write(state);
      closeModal();
      renderMembership();
      toast("会员等级已保存，小程序刷新后生效");
    });
  }

  function renderBanners() {
    state = read();
    const bannerRows = [...state.banners].sort((a, b) => (a.order || 0) - (b.order || 0)).map((banner, index) => `<div class="banner-row">
      <div class="banner-thumb"><img src="${banner.image}" alt="${esc(banner.title)}"></div>
      <div class="banner-text"><strong>${esc(banner.title)}</strong><small>${esc(banner.subtitle || "")}</small></div>
      <div class="banner-meta">位置：${index + 1}</div>
      <div class="banner-meta">${banner.enabled ? '<span class="status">已启用</span>' : '<span class="status off">已停用</span>'}</div>
      <div class="row-actions"><button class="text-action" data-action="edit-banner" data-id="${esc(banner.id)}">编辑</button><button class="text-action" title="上移" data-action="move-banner" data-id="${esc(banner.id)}" data-delta="-1">↑</button><button class="text-action" title="下移" data-action="move-banner" data-id="${esc(banner.id)}" data-delta="1">↓</button></div>
    </div>`).join("");
    const zoneCards = [...state.zones].sort((a, b) => (a.order || 0) - (b.order || 0)).map((zone, index) => `<article class="zone-admin-card">
      <div class="zone-admin-card-head"><span class="zone-admin-icon">${icon(zone.icon)}</span><button class="text-action" data-action="edit-zone" data-id="${esc(zone.id)}">编辑</button></div>
      <strong>${esc(zone.name)}</strong><p>${(zone.subcats || []).map(item => esc(item.name)).join(" · ")}</p>
      <div class="zone-card-actions"><span class="inline-help">排序 ${index + 1}</span><button class="text-action" title="上移" data-action="move-zone" data-id="${esc(zone.id)}" data-delta="-1">↑</button><button class="text-action" title="下移" data-action="move-zone" data-id="${esc(zone.id)}" data-delta="1">↓</button></div>
    </article>`).join("");
    const actions = `<button class="admin-btn primary" data-action="add-banner">${icon("plus")}新增 Banner</button>`;
    root.innerHTML = adminShell("banners", `${pageHead("Banner 与专区管理", "维护小程序首页轮播与一级分类入口，统一配置图片、排序和跳转。", actions)}
      <section class="panel" style="margin-bottom:14px">
        <div class="panel-head"><span class="panel-title">首页 Banner</span><span class="panel-note">${state.banners.length} 张轮播图 · 小程序首页自动读取</span></div>
        <div class="panel-body"><div class="banner-list">${bannerRows || `<div class="admin-empty">还没有 Banner，点击右上角新增</div>`}</div></div>
      </section>
      <section class="panel">
        <div class="panel-head"><span class="panel-title">首页专区入口</span><div style="display:flex;align-items:center;gap:12px"><span class="panel-note">一级分类关联二级分类，专区页按分类筛选商品</span><button class="admin-btn" data-action="add-zone">${icon("plus")}新增专区</button></div></div>
        <div class="panel-body"><div class="zone-admin-grid">${zoneCards}</div></div>
      </section>`);
  }

  function bannerForm(banner = null) {
    const editing = Boolean(banner);
    const item = banner || { id: "", title: "", subtitle: "", label: "精选推荐", target: "mini-shop.html", image: image("Premium ecommerce hero banner, minimalist white product composition with warm orange accent, no text", "landscape_16_9"), enabled: true };
    const backdrop = openModal(editing ? "编辑 Banner" : "新增 Banner", `<form id="banner-form"><div class="form-grid">
      <label class="field" style="grid-column:1/-1">主标题<input name="title" required value="${esc(item.title)}" placeholder="例如：影像旗舰 新一代"></label>
      <label class="field" style="grid-column:1/-1">副标题<input name="subtitle" value="${esc(item.subtitle || "")}" placeholder="一行简短描述"></label>
      <label class="field">角标<input name="label" value="${esc(item.label || "")}" placeholder="新品上市"></label>
      <label class="field">跳转链接<input name="target" value="${esc(item.target || "mini-shop.html")}" placeholder="mini-shop.html"></label>
      <label class="field" style="grid-column:1/-1">上传图片<label class="upload-box">${icon("upload")}<span>　选择图片，建议宽图 16:9</span><input name="file" type="file" accept="image/*"></label><span class="inline-help">不上传则保留当前图片。</span></label>
      <label class="field">状态<select name="enabled"><option value="true" ${item.enabled ? "selected" : ""}>启用</option><option value="false" ${!item.enabled ? "selected" : ""}>停用</option></select></label>
      <input type="hidden" name="id" value="${esc(item.id)}">
    </div></form>`, `<button type="button" class="secondary-btn" data-modal-close>取消</button><button type="submit" form="banner-form" class="primary-btn small">保存 Banner</button>`);
    backdrop.querySelector('[name="file"]').addEventListener("change", event => {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 900000) {
        toast("图片请控制在 900KB 以内");
        event.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onload = () => { backdrop.dataset.imageData = reader.result; };
      reader.readAsDataURL(file);
    });
    backdrop.querySelector("#banner-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const data = {
        id: form.get("id") || `b${Date.now()}`,
        title: String(form.get("title")).trim(),
        subtitle: String(form.get("subtitle") || "").trim(),
        label: String(form.get("label") || "").trim(),
        target: String(form.get("target") || "mini-shop.html").trim(),
        image: backdrop.dataset.imageData || item.image,
        enabled: form.get("enabled") === "true",
        order: editing ? item.order : state.banners.length
      };
      const index = state.banners.findIndex(entry => entry.id === data.id);
      if (index >= 0) state.banners[index] = data;
      else state.banners.push(data);
      write(state);
      closeModal();
      renderBanners();
      toast("Banner 已保存");
    });
  }

  function zoneForm(zone = null) {
    const editing = Boolean(zone);
    const item = zone || { id: "", name: "", icon: "grid", subcats: [], order: state.zones.length };
    const backdrop = openModal(editing ? "编辑专区" : "新增专区", `<form id="zone-form"><div class="form-grid">
      <label class="field">专区名称<input name="name" required value="${esc(item.name)}" placeholder="例如：手机数码"></label>
      <label class="field">图标<select name="icon">${["phone","home","bag","coffee","spark","run","sun","grid"].map(name => `<option value="${name}" ${item.icon === name ? "selected" : ""}>${name}</option>`).join("")}</select></label>
      <label class="field" style="grid-column:1/-1">二级分类（每行一项，格式：分类ID,分类名称）<textarea name="subcats" rows="5" required>${(item.subcats || []).map(subcat => `${subcat.id},${subcat.name}`).join("\n")}</textarea><span class="inline-help">商品编辑时选择相同分类，即会出现在对应专区页。</span></label>
      <input type="hidden" name="id" value="${esc(item.id)}">
    </div></form>`, `<button class="secondary-btn" type="button" data-modal-close>取消</button><button class="primary-btn small" form="zone-form" type="submit">保存专区</button>`);
    backdrop.querySelector("#zone-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name")).trim();
      const subcats = String(form.get("subcats")).split("\n").map(line => line.trim()).filter(Boolean).map(line => {
        const [id, ...label] = line.split(",");
        return { id: id.trim(), name: label.join(",").trim() || id.trim() };
      });
      const data = { id: form.get("id") || `zone-${Date.now()}`, name, icon: form.get("icon"), subcats, order: editing ? item.order : state.zones.length };
      const index = state.zones.findIndex(entry => entry.id === data.id);
      if (index >= 0) state.zones[index] = data;
      else state.zones.push(data);
      write(state);
      closeModal();
      renderBanners();
      toast("专区设置已保存");
    });
  }

  root.addEventListener("click", event => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    const id = control.dataset.id;
    if (action === "toggle-tag") {
      const product = state.products.find(item => item.id === id);
      if (!product) return;
      product.tags ||= [];
      product.tags = product.tags.includes(control.dataset.tag) ? product.tags.filter(tag => tag !== control.dataset.tag) : [...product.tags, control.dataset.tag];
      write(state);
      renderProducts();
      toast("首页商品标签已更新");
    } else if (action === "edit-product") productForm(state.products.find(item => item.id === id));
    else if (action === "add-product") productForm();
    else if (action === "toggle-status") {
      const product = state.products.find(item => item.id === id);
      if (product) product.status = product.status === "on" ? "off" : "on";
      write(state); renderProducts(); toast("商品状态已更新");
    } else if (action === "export-products") {
      const blob = new Blob([JSON.stringify(state.products, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob); link.download = "mall-products.json"; link.click(); URL.revokeObjectURL(link.href);
      toast("商品数据已导出");
    } else if (action === "add-tier") tierForm();
    else if (action === "edit-tier") tierForm(state.tiers.find(item => item.id === id));
    else if (action === "preview-member") window.open("mini-membership.html", "_blank");
    else if (action === "add-banner") bannerForm();
    else if (action === "edit-banner") bannerForm(state.banners.find(item => item.id === id));
    else if (action === "move-banner") {
      const banners = [...state.banners].sort((a, b) => (a.order || 0) - (b.order || 0));
      const index = banners.findIndex(item => item.id === id);
      const target = Math.max(0, Math.min(banners.length - 1, index + Number(control.dataset.delta)));
      if (index >= 0 && index !== target) {
        [banners[index], banners[target]] = [banners[target], banners[index]];
        banners.forEach((item, order) => { item.order = order; });
        state.banners = banners; write(state); renderBanners(); toast("Banner 顺序已调整");
      }
    } else if (action === "add-zone") zoneForm();
    else if (action === "edit-zone") zoneForm(state.zones.find(item => item.id === id));
    else if (action === "move-zone") {
      const zones = [...state.zones].sort((a, b) => (a.order || 0) - (b.order || 0));
      const index = zones.findIndex(item => item.id === id);
      const target = Math.max(0, Math.min(zones.length - 1, index + Number(control.dataset.delta)));
      if (index >= 0 && index !== target) {
        [zones[index], zones[target]] = [zones[target], zones[index]];
        zones.forEach((item, order) => { item.order = order; });
        state.zones = zones; write(state); renderBanners(); toast("专区顺序已调整");
      }
    }
  });

  document.addEventListener("click", event => {
    if (event.target.closest("[data-modal-close]")) closeModal();
  });

  window.addEventListener("storage", event => {
    if (event.key !== window.MallData.KEY) return;
    state = read();
    if (root.dataset.page === "products") renderProducts();
    else if (root.dataset.page === "membership") renderMembership();
    else if (root.dataset.page === "banners") renderBanners();
  });

  const page = root.dataset.page;
  if (page === "products") renderProducts();
  else if (page === "membership") renderMembership();
  else if (page === "banners") renderBanners();
})();
