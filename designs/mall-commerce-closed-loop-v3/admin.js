(() => {
  const { read, write, image } = window.MallData;
  const { icon, escapeHtml: esc, money, toast, openModal, closeModal, adminShell } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;

  let state = read();
  let productQuery = "";
  let productCategory = "all";
  let productStatus = "all";
  let reviewQuery = "";
  let reviewFilter = "all";
  const view = new URLSearchParams(location.search).get("view") || "";
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
      <td><div class="product-cell"><img src="${product.image}" alt="${esc(product.name)}"><div><strong>${esc(product.name)}</strong><small>${esc(product.subtitle || "")}</small><small class="product-spu-id">SPU ${esc(product.spuId || product.id)}</small></div></div></td>
      <td><strong style="color:#e96219">${(product.skus || []).length > 1 ? `¥${Math.min(...product.skus.map(sku => Number(sku.price))).toFixed(2)} 起` : money(product.price)}</strong><div style="margin-top:3px;color:#aaa;text-decoration:line-through;font-size:9px">${product.original ? money(product.original) : "—"}</div></td>
      <td>${Number(product.stock).toLocaleString()}</td>
      <td>${(product.skus || []).length} 个 SKU</td>
      <td>${esc(categoryName(product.parent, product.category))}</td>
      <td>${tagButtons(product)}</td>
      <td><span class="status ${product.status === "on" ? "" : "off"}">${product.status === "on" ? "销售中" : "已下架"}</span></td>
      <td><div class="row-actions"><button class="text-action" data-action="edit-product" data-id="${esc(product.id)}">编辑 SPU / SKU</button><button class="text-action" data-action="preview-product" data-id="${esc(product.id)}">预览详情</button><button class="text-action" data-action="toggle-status" data-id="${esc(product.id)}">${product.status === "on" ? "下架" : "上架"}</button></div></td>
    </tr>`).join("") : `<tr><td colspan="8"><div class="admin-empty">没有符合条件的商品</div></td></tr>`;
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
        <div class="panel-head"><span class="panel-title">SPU 商品列表</span><span class="panel-note" id="visible-count"></span></div>
        <div class="panel-body" style="padding-bottom:12px">
          <div class="filters">
            <label class="admin-search">${icon("search")}<input id="product-search" type="search" placeholder="搜索商品名称"></label>
            <select class="admin-select" id="product-category"><option value="all">全部分类</option>${state.zones.map(zone => `<option value="${esc(zone.id)}">${esc(zone.name)}</option>`).join("")}</select>
            <select class="admin-select" id="product-status"><option value="all">全部状态</option><option value="on">销售中</option><option value="off">已下架</option></select>
            <span class="inline-help" style="margin-left:auto">点击标签即可切换首页推荐规则</span>
          </div>
        </div>
        <div class="table-wrap"><table class="admin-table"><thead><tr><th>SPU 商品</th><th>售价</th><th>总库存</th><th>SKU</th><th>分类</th><th>展示标签</th><th>状态</th><th>操作</th></tr></thead><tbody id="product-rows"></tbody></table></div>
        <div class="pagination"><span>SPU 维护商品内容；SKU 独立维护规格、价格与库存</span><div class="page-numbers"><button class="page-num active">1</button><button class="page-num">2</button><button class="page-num">›</button></div></div>
      </section>`);
    renderProductRows();
    root.querySelector("#product-search").addEventListener("input", event => { productQuery = event.target.value; renderProductRows(); });
    root.querySelector("#product-category").addEventListener("change", event => { productCategory = event.target.value; renderProductRows(); });
    root.querySelector("#product-status").addEventListener("change", event => { productStatus = event.target.value; renderProductRows(); });
  }

  function allReviews() {
    return state.products.flatMap(product => (product.reviews || []).map(review => ({ ...review, productName: product.name })));
  }

  function reviewImagesMarkup(images, className) {
    if (!Array.isArray(images) || !images.length) return "";
    return `<div class="${className}">${images.map((source, index) => `<button type="button" class="review-image-button" data-review-image="${esc(source)}" aria-label="查看评价图片 ${index + 1}"><img src="${esc(source)}" alt="评价图片 ${index + 1}"></button>`).join("")}</div>`;
  }

  function openReviewImage(source) {
    openModal("评价图片", `<img class="review-image-large" src="${esc(source)}" alt="用户评价图片">`);
  }

  function renderReviews() {
    state = read();
    const reviews = allReviews().filter(review => {
      const queryMatch = !reviewQuery || `${review.productName} ${review.name} ${review.text} ${review.orderId || ""}`.toLowerCase().includes(reviewQuery.toLowerCase());
      const replyMatch = reviewFilter === "all" || (reviewFilter === "replied" ? Boolean(review.reply?.text) : !review.reply?.text);
      return queryMatch && replyMatch && review.status !== "hidden";
    });
    const total = allReviews();
    const waiting = total.filter(review => !review.reply?.text).length;
    const replied = total.length - waiting;
    const rows = reviews.map(review => `<tr>
      <td><strong>${esc(review.productName)}</strong><small class="review-meta">${esc(review.skuLabel || "商品评价")}</small></td>
      <td><strong>${esc(review.name || "商城用户")}</strong><small class="review-meta">${esc(review.orderId || "演示评价")}</small></td>
      <td><span class="review-admin-stars">${"★".repeat(Math.max(1, Math.min(5, Number(review.rating || 5))))}</span><small class="review-meta">${Number(review.rating || 5)} 分</small></td>
      <td class="review-admin-text">${esc(review.text || "仅评分")}${reviewImagesMarkup(review.images, "review-admin-images")}</td>
      <td>${esc(review.date || review.createdAt || "")}</td>
      <td>${review.reply?.text ? `<span class="status">已回复</span><small class="review-reply-preview">${esc(review.reply.text)}</small>` : `<span class="status off">待回复</span>`}</td>
      <td><button class="text-action" data-action="reply-review" data-id="${esc(review.id)}">${review.reply?.text ? "编辑回复" : "回复用户"}</button></td>
    </tr>`).join("");
    const actions = `<a class="admin-btn" href="admin-products.html">返回商品管理</a>`;
    root.innerHTML = adminShell("reviews", `${pageHead("评论管理", "查看用户对商品的评价并回复，回复内容会同步展示在小程序商品详情。", actions)}
      <div class="stats-row">
        ${stat("评价总数", total.length, "包含小程序用户评价")}
        ${stat("待回复", waiting, "及时回应用户问题")}
        ${stat("已回复", replied, "回复同步至商品详情")}
        ${stat("当前筛选", reviews.length, "可按商品、用户或订单搜索")}
      </div>
      <section class="panel">
        <div class="panel-head"><span class="panel-title">用户评价列表</span><span class="panel-note">共 ${reviews.length} 条</span></div>
        <div class="panel-body"><div class="filters">
          <label class="admin-search">${icon("search")}<input id="review-search" type="search" value="${esc(reviewQuery)}" placeholder="搜索商品、用户、订单或评价"></label>
          <select class="admin-select" id="review-filter"><option value="all" ${reviewFilter === "all" ? "selected" : ""}>全部回复状态</option><option value="unreplied" ${reviewFilter === "unreplied" ? "selected" : ""}>待回复</option><option value="replied" ${reviewFilter === "replied" ? "selected" : ""}>已回复</option></select>
        </div></div>
        <div class="table-wrap"><table class="admin-table review-admin-table"><thead><tr><th>商品</th><th>用户 / 订单</th><th>评分</th><th>评价内容</th><th>时间</th><th>运营回复</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="admin-empty">暂无符合条件的评价</div></td></tr>`}</tbody></table></div>
      </section>`);
    root.querySelector("#review-search")?.addEventListener("input", event => { reviewQuery = event.target.value; renderReviews(); });
    root.querySelector("#review-filter")?.addEventListener("change", event => { reviewFilter = event.target.value; renderReviews(); });
    root.querySelectorAll("[data-review-image]").forEach(button => {
      button.addEventListener("click", () => openReviewImage(button.dataset.reviewImage));
    });
  }

  function replyReviewForm(reviewId) {
    state = read();
    const review = allReviews().find(item => item.id === reviewId);
    if (!review) return toast("评价记录不存在");
    const backdrop = openModal("回复用户评价", `<div class="review-reply-context"><strong>${esc(review.productName)} · ${esc(review.name || "商城用户")}</strong><p>${esc(review.text || "用户仅提交了评分")}</p>${reviewImagesMarkup(review.images, "review-reply-images")}</div>
      <form id="review-reply-form"><label class="field">运营回复<textarea name="reply" rows="4" maxlength="500" required placeholder="礼貌、清晰地回应用户">${esc(review.reply?.text || "")}</textarea></label></form>`,
      `<button type="button" class="secondary-btn" data-modal-close>取消</button><button type="button" class="primary-btn small" data-action="save-review-reply">保存回复</button>`);
    backdrop.querySelectorAll("[data-review-image]").forEach(button => {
      button.addEventListener("click", () => openReviewImage(button.dataset.reviewImage));
    });
    backdrop.querySelector("[data-action='save-review-reply']")?.addEventListener("click", () => {
      const form = backdrop.querySelector("#review-reply-form");
      if (!form.reportValidity()) return;
      try {
        window.MallOps.replyReview(reviewId, new FormData(form).get("reply"));
        state = read();
        closeModal();
        renderReviews();
        toast("回复已保存并同步到小程序商品详情");
      } catch (error) {
        toast(error.message || "回复失败");
      }
    });
  }

  function productForm(product = null) {
    const editing = Boolean(product);
    const item = product || { id: "", spuId: "", name: "", subtitle: "", price: 0, original: 0, stock: 0, parent: state.zones[0]?.id || "digital", category: state.zones[0]?.subcats?.[0]?.id || "phones", tags: [], status: "on", skus: [{ specs: [{ name: "版本", value: "标准版" }], label: "版本=标准版", price: 0, originalPrice: 0, stock: 0, status: "on" }] };
    const parentOptions = state.zones.map(zone => `<option value="${esc(zone.id)}" ${item.parent === zone.id ? "selected" : ""}>${esc(zone.name)}</option>`).join("");
    const subcatOptions = state.zones.find(zone => zone.id === item.parent)?.subcats || [];
    const selectedShippingTemplateId = item.shippingTemplateId || state.shippingTemplates?.[0]?.id || "";
    const shippingTemplateOptions = (state.shippingTemplates || []).map(template => `<option value="${esc(template.id)}" ${template.id === selectedShippingTemplateId ? "selected" : ""}>${esc(template.name)}</option>`).join("");
    const tagOptions = Object.entries(tagNames).map(([key, name]) => `<label style="display:flex;align-items:center;gap:5px"><input type="checkbox" name="tags" value="${key}" ${(item.tags || []).includes(key) ? "checked" : ""}>${name}</label>`).join("");
    const skuRows = (item.skus || []).map(sku => `<div class="sku-editor-row" data-sku-row>
      <label class="field"><span>规格组合</span><input data-sku-specs required value="${esc(sku.label || sku.specs?.map(spec => `${spec.name}=${spec.value}`).join(" / ") || "版本=标准版")}" placeholder="颜色=曜石黑 / 容量=512GB"></label>
      <label class="field"><span>SKU 编码</span><input data-sku-id value="${esc(sku.id || "")}" placeholder="保存时自动生成"></label>
      <label class="field"><span>售价</span><input data-sku-price type="number" min="0" step="0.01" required value="${Number(sku.price || 0)}"></label>
      <label class="field"><span>划线价</span><input data-sku-original type="number" min="0" step="0.01" value="${Number(sku.originalPrice ?? sku.price ?? 0)}"></label>
      <label class="field"><span>库存</span><input data-sku-stock type="number" min="0" step="1" required value="${Number(sku.stock || 0)}"></label>
      <label class="field"><span>SKU 状态</span><select data-sku-status><option value="on" ${sku.status !== "off" ? "selected" : ""}>可售</option><option value="off" ${sku.status === "off" ? "selected" : ""}>停售</option></select></label>
      <label class="field"><span>会员专享价（等级=价格）</span><input data-sku-member-prices value="${esc(Object.entries(sku.memberPrices || {}).map(([tierId, price]) => `${tierId}=${price}`).join(", "))}" placeholder="silver=1249, gold=1199"></label>
      <button type="button" class="sku-remove" data-action="remove-sku" aria-label="删除此 SKU">删除</button>
    </div>`).join("");
    const backdrop = openModal(editing ? "编辑商品 · SPU / SKU" : "新增商品 · SPU / SKU", `<form id="product-form" class="product-editor-form">
      <section class="product-editor-section"><div class="product-editor-heading"><span>01</span><div><strong>SPU 基础信息</strong><small>描述商品主体、分类和小程序列表呈现</small></div></div>
        <div class="form-grid">
          <label class="field">商品主标题<input name="name" required value="${esc(item.name)}" placeholder="例如：旗舰降噪耳机"></label>
          <label class="field">SPU 编码<input name="id" value="${esc(item.spuId || item.id)}" ${editing ? "readonly" : ""} placeholder="留空自动生成"></label>
          <label class="field" style="grid-column:1/-1">副标题 / 卖点<input name="subtitle" value="${esc(item.subtitle || "")}" placeholder="核心卖点、型号信息或服务承诺"></label>
          <label class="field">一级分类<select name="parent">${parentOptions}</select></label>
          <label class="field">二级分类<select name="category">${subcatOptions.map(option => `<option value="${esc(option.id)}" ${item.category === option.id ? "selected" : ""}>${esc(option.name)}</option>`).join("")}</select></label>
          <label class="field">SPU 状态<select name="status"><option value="on" ${item.status === "on" ? "selected" : ""}>销售中</option><option value="off" ${item.status === "off" ? "selected" : ""}>已下架</option></select></label>
          <label class="field">配送模板<select name="shippingTemplateId"><option value="">使用平台默认配送</option>${shippingTemplateOptions}</select><small class="inline-help">运费按收货省份及模板规则在小程序结算时计算</small></label>
          <div class="field">首页标签<div class="product-tag-options">${tagOptions}</div></div>
        </div>
      </section>
      <section class="product-editor-section"><div class="product-editor-heading"><span>02</span><div><strong>SKU 规格与库存</strong><small>每个 SKU 独立售价、库存、状态和会员专享价；会员价格式：等级 ID=价格，多个用逗号分隔</small></div></div>
        <div class="sku-editor-head"><span>规格组合</span><span>SKU 编码</span><span>售价 / 划线价 / 库存</span><span>状态</span></div>
        <div id="sku-editor-rows">${skuRows}</div>
        <button type="button" class="sku-add-button" data-action="add-sku">＋ 添加 SKU 规格</button>
      </section>
      <section class="product-editor-section"><div class="product-editor-heading"><span>03</span><div><strong>商品主图与详情</strong><small>图片地址一行一张；详情介绍会与图片依次呈现</small></div></div>
        <div class="form-grid">
          <label class="field" style="grid-column:1/-1">多张主图（每行一个图片地址）<textarea name="gallery" rows="3" placeholder="留空将自动生成演示主图">${esc((item.gallery || [item.image]).filter(Boolean).join("\n"))}</textarea></label>
          <label class="field" style="grid-column:1/-1">详情介绍<textarea name="detailIntro" rows="4" placeholder="材质、功能、使用场景、服务保障等商品介绍">${esc(item.detailIntro || "")}</textarea></label>
          <label class="field" style="grid-column:1/-1">详情图片（每行一个图片地址）<textarea name="detailImages" rows="3" placeholder="留空将生成图文详情演示图">${esc((item.detailImages || []).join("\n"))}</textarea></label>
        </div>
      </section>
      <input type="hidden" name="editingId" value="${esc(item.id)}">
    </form>`, `<button type="button" class="secondary-btn" data-modal-close>取消</button><button type="submit" form="product-form" class="primary-btn small">保存 SPU 与 SKU</button>`);
    backdrop.querySelector(".modal").classList.add("product-editor-modal");
    backdrop.querySelector('[name="parent"]').addEventListener("change", event => {
      const options = state.zones.find(zone => zone.id === event.target.value)?.subcats || [];
      backdrop.querySelector('[name="category"]').innerHTML = options.map(option => `<option value="${esc(option.id)}">${esc(option.name)}</option>`).join("");
    });
    backdrop.querySelector("[data-action='add-sku']").addEventListener("click", () => {
      const container = backdrop.querySelector("#sku-editor-rows");
      const row = document.createElement("div");
      row.className = "sku-editor-row";
      row.dataset.skuRow = "";
      row.innerHTML = `<label class="field"><span>规格组合</span><input data-sku-specs required value="" placeholder="颜色=曜石黑 / 容量=512GB"></label>
        <label class="field"><span>SKU 编码</span><input data-sku-id value="" placeholder="保存时自动生成"></label>
        <label class="field"><span>售价</span><input data-sku-price type="number" min="0" step="0.01" required value="0"></label>
        <label class="field"><span>划线价</span><input data-sku-original type="number" min="0" step="0.01" value="0"></label>
        <label class="field"><span>库存</span><input data-sku-stock type="number" min="0" step="1" required value="0"></label>
        <label class="field"><span>SKU 状态</span><select data-sku-status><option value="on">可售</option><option value="off">停售</option></select></label>
        <label class="field"><span>会员专享价（等级=价格）</span><input data-sku-member-prices value="" placeholder="silver=1249, gold=1199"></label>
        <button type="button" class="sku-remove" data-action="remove-sku" aria-label="删除此 SKU">删除</button>`;
      container.appendChild(row);
      row.querySelector("[data-sku-specs]").focus();
    });
    backdrop.addEventListener("click", event => {
      const removeButton = event.target.closest("[data-action='remove-sku']");
      if (removeButton) removeButton.closest("[data-sku-row]")?.remove();
    });
    backdrop.querySelector("#product-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const parent = form.get("parent");
      const name = String(form.get("name")).trim();
      const spuId = String(form.get("id") || "").trim() || `SPU-${Date.now().toString().slice(-8)}`;
      const parseLines = value => String(value || "").split("\n").map(line => line.trim()).filter(Boolean);
      const galleryInput = parseLines(form.get("gallery"));
      const gallery = galleryInput.length ? galleryInput : [
        image(`Premium ecommerce product photography for ${name}, clean bright white studio background, no text`),
        image(`Product detail view of ${name}, premium neutral studio photography, no text`),
        image(`Close-up product material detail of ${name}, bright soft light, no text`)
      ];
      const skuRowsData = [...backdrop.querySelectorAll("[data-sku-row]")].map((row, index) => {
        const specLabel = row.querySelector("[data-sku-specs]").value.trim();
        const parts = specLabel.split(/[\/；;]+/).map(value => value.trim()).filter(Boolean).map(value => {
          const [key, ...rest] = value.split(/[=:：]/);
          return { name: (key || "规格").trim(), value: rest.join("=").trim() || key.trim() };
        });
        const skuPrice = Number(row.querySelector("[data-sku-price]").value);
        const skuStock = Number(row.querySelector("[data-sku-stock]").value);
        if (!specLabel || !Number.isFinite(skuPrice) || skuPrice < 0 || !Number.isInteger(skuStock) || skuStock < 0) throw new Error("请检查每个 SKU 的规格、售价和整数库存");
        const memberPrices = {};
        String(row.querySelector("[data-sku-member-prices]").value || "").split(/[,，]/).map(value => value.trim()).filter(Boolean).forEach(entry => {
          const [tierId, rawPrice] = entry.split(/[=:：]/).map(value => value.trim());
          const memberPrice = Number(rawPrice);
          if (!state.tiers.some(tier => tier.id === tierId) || !Number.isFinite(memberPrice) || memberPrice <= 0 || memberPrice > skuPrice) {
            throw new Error("会员专享价需使用有效等级 ID，且价格须大于 0、不高于 SKU 售价");
          }
          memberPrices[tierId] = memberPrice;
        });
        return {
          id: row.querySelector("[data-sku-id]").value.trim() || `${spuId}-SKU-${String(index + 1).padStart(3, "0")}`,
          spuId,
          specs: parts,
          label: specLabel.replace(/[=:：]/g, " ").replace(/[\/；;]/g, " / "),
          price: skuPrice,
          originalPrice: Number(row.querySelector("[data-sku-original]").value || skuPrice),
          memberPrices,
          stock: skuStock,
          image: gallery[0],
          salesCount: Number(item.skus?.find(sku => sku.id === row.querySelector("[data-sku-id]").value.trim())?.salesCount || 0),
          status: row.querySelector("[data-sku-status]").value
        };
      });
      if (!skuRowsData.length) throw new Error("至少添加一个 SKU 规格");
      const activeSkus = skuRowsData.filter(sku => sku.status === "on");
      if (form.get("status") === "on" && !activeSkus.length) throw new Error("在售 SPU 至少需要一个可售 SKU");
      const skuIds = skuRowsData.map(sku => sku.id);
      const otherSkuIds = state.products.filter(entry => entry.id !== item.id).flatMap(entry => (entry.skus || []).map(sku => sku.id));
      if (new Set(skuIds).size !== skuIds.length || skuIds.some(skuId => otherSkuIds.includes(skuId))) throw new Error("SKU 编码不能重复");
      const detailImageInput = parseLines(form.get("detailImages"));
      const detailImages = detailImageInput.length ? detailImageInput : [
        image(`Long-form ecommerce detail image for ${name}, premium product in a calm modern home, no text`, "portrait_4_3"),
        image(`Close-up product feature image for ${name}, bright clean commercial photography, no text`, "portrait_4_3")
      ];
      const data = {
        id: spuId,
        spuId,
        name,
        subtitle: String(form.get("subtitle") || "").trim(),
        price: Math.min(...(activeSkus.length ? activeSkus : skuRowsData).map(sku => sku.price)),
        original: Math.min(...(activeSkus.length ? activeSkus : skuRowsData).map(sku => sku.originalPrice)),
        stock: skuRowsData.reduce((sum, sku) => sum + sku.stock, 0),
        skus: skuRowsData,
        gallery,
        salesCount: Number(item.salesCount || 0),
        rating: Number(item.rating || 4.8),
        reviewCount: Number(item.reviewCount || 0),
        detailIntro: String(form.get("detailIntro") || "").trim() || `${name} ${String(form.get("subtitle") || "").trim()}。精选品质与实用设计，为日常使用带来可靠体验。`,
        detailImages,
        reviews: item.reviews || [],
        shippingTemplateId: String(form.get("shippingTemplateId") || state.shippingTemplates?.[0]?.id || ""),
        parent,
        category: form.get("category"),
        tags: form.getAll("tags"),
        status: form.get("status"),
        image: gallery[0]
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

  function renderLegalDocuments() {
    state = read();
    state.legalDocuments ||= [];
    const activeCount = state.legalDocuments.filter(item => item.status !== "inactive").length;
    const rows = state.legalDocuments.map(document => `<tr>
      <td><strong>${esc(document.title)}</strong><small class="review-meta">${esc(document.id)}</small></td>
      <td>${esc(document.category || "商城规则")}</td>
      <td>${esc(document.version || "—")}</td>
      <td>${esc(document.updatedAt || "—")}</td>
      <td><span class="status ${document.status === "inactive" ? "off" : ""}">${document.status === "inactive" ? "未发布" : "已发布"}</span></td>
      <td><div class="row-actions"><button class="text-action" data-action="edit-legal" data-id="${esc(document.id)}">编辑内容</button><button class="text-action" data-action="toggle-legal" data-id="${esc(document.id)}">${document.status === "inactive" ? "发布" : "下线"}</button></div></td>
    </tr>`).join("");
    const actions = `<button class="admin-btn primary" data-action="add-legal">${icon("plus")}新增协议规则</button>`;
    root.innerHTML = adminShell("legal", `${pageHead("协议与规则", "维护小程序展示的隐私声明、商城协议及业务规则，发布后实时同步。", actions)}
      <div class="stats-row">
        ${stat("协议与规则", state.legalDocuments.length, "所有版本均在本地演示数据中维护")}
        ${stat("已发布", activeCount, "用户端可查看")}
        ${stat("已下线", state.legalDocuments.length - activeCount, "下线内容不在小程序展示")}
        ${stat("同步状态", "实时", "保存后前台读取最新内容")}
      </div>
      <section class="panel">
        <div class="panel-head"><span class="panel-title">文档列表</span><span class="panel-note">支持编辑、发布与下线</span></div>
        <div class="table-wrap"><table class="admin-table"><thead><tr><th>文档名称</th><th>分类</th><th>版本</th><th>更新时间</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="admin-empty">暂无协议文档</div></td></tr>`}</tbody></table></div>
      </section>
      <div class="inline-help">正式上线前请由法务审核条款，并在发布前确认版本、生效时间及用户告知方式。</div>`);
  }

  function legalDocumentForm(document = null) {
    const editing = Boolean(document);
    const item = document || { id: `LEGAL-${Date.now()}`, title: "", category: "商城规则", version: "v1.0", content: "", status: "active" };
    const backdrop = openModal(editing ? "编辑协议与规则" : "新增协议与规则", `<form id="legal-document-form">
      <div class="form-grid">
        <label class="field">文档名称<input name="title" required maxlength="60" value="${esc(item.title)}" placeholder="如：隐私声明"></label>
        <label class="field">分类<input name="category" required maxlength="30" value="${esc(item.category || "")}" placeholder="隐私政策 / 服务协议 / 业务规则"></label>
        <label class="field">版本号<input name="version" required maxlength="20" value="${esc(item.version || "v1.0")}"></label>
        <label class="field">更新时间<input name="updatedAt" type="date" value="${esc(item.updatedAt || new Date().toISOString().slice(0, 10))}"></label>
        <label class="field" style="grid-column:1/-1">协议正文<textarea name="content" rows="10" maxlength="10000" required placeholder="请输入经过审核的协议或规则内容">${esc(item.content || "")}</textarea></label>
      </div>
    </form>`, `<button type="button" class="secondary-btn" data-modal-close>取消</button><button type="button" class="primary-btn small" data-action="save-legal" data-id="${esc(item.id)}">保存${editing ? "修改" : "并发布"}</button>`);
    backdrop.querySelector("[data-action='save-legal']")?.addEventListener("click", () => {
      const form = backdrop.querySelector("#legal-document-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      state = read();
      state.legalDocuments ||= [];
      const next = {
        ...item,
        title: String(values.get("title") || "").trim(),
        category: String(values.get("category") || "").trim(),
        version: String(values.get("version") || "").trim(),
        updatedAt: String(values.get("updatedAt") || new Date().toISOString().slice(0, 10)),
        content: String(values.get("content") || "").trim(),
        status: "active"
      };
      const index = state.legalDocuments.findIndex(entry => entry.id === item.id);
      if (index >= 0) state.legalDocuments[index] = next;
      else state.legalDocuments.unshift(next);
      write(state);
      closeModal();
      renderLegalDocuments();
      toast("协议内容已保存并发布到小程序");
    });
  }

  function renderMembership() {
    state = read();
    const tiers = [...state.tiers].sort((a, b) => a.points - b.points);
    state.membershipSettings ||= { birthdayCouponId: "" };
    const actions = `<button class="admin-btn" data-action="preview-member">${icon("member")}预览小程序</button><button class="admin-btn primary" data-action="add-tier">${icon("plus")}新增等级</button>`;
    const cards = tiers.map((tier, index) => `<article class="tier-admin-card">
      <div class="tier-admin-top"><span class="tier-admin-name">${esc(tier.name)}</span><span>LEVEL 0${index + 1}</span></div>
      <div class="tier-admin-discount">${tier.discount === 100 ? "会员价" : `${Number(tier.discount) / 10} 折`}<small>　全场购物</small></div>
      <div class="tier-admin-foot">门槛：${Number(tier.points).toLocaleString()} 积分 · 积分倍率 ×${Number(tier.pointsMultiplier || 1)}<br>${esc(tier.benefits)}</div>
      <div class="tier-admin-actions"><button class="text-action" data-action="edit-tier" data-id="${esc(tier.id)}">编辑规则 ${icon("chevron")}</button></div>
    </article>`).join("");
    const birthdayCouponOptions = state.coupons.map(coupon =>
      `<option value="${esc(coupon.id)}" ${coupon.id === state.membershipSettings.birthdayCouponId ? "selected" : ""}>${esc(coupon.name)}${coupon.status === "active" ? "" : "（已暂停）"}</option>`
    ).join("");
    const configuredBirthdayCoupon = state.coupons.find(item => item.id === state.membershipSettings.birthdayCouponId);
    const currentYearIssues = (state.birthdayCouponIssues || []).filter(item => Number(item.year) === new Date().getFullYear()).length;
    root.innerHTML = adminShell("membership", `${pageHead("会员等级与折扣", "配置成长门槛与会员权益，保存后同步到小程序会员中心。", actions)}
      <div class="stats-row">
        ${stat("会员等级", tiers.length, "支持按成长积分升级")}
        ${stat("当前会员", "12,680", "近 30 天活跃会员", "+12.6%")}
        ${stat("最高折扣", `${Math.min(...tiers.map(t => t.discount)) / 10} 折`, `${tiers.at(-1)?.name || "最高等级"}专享`)}
        ${stat("升级积分", Number(tiers.at(-1)?.points || 0).toLocaleString(), "最高等级成长门槛")}
      </div>
      <div class="section-head" style="margin:0 0 10px"><h2 style="font-size:13px">等级配置</h2><span class="inline-help">拖动排序暂不启用，等级按积分门槛自动排序</span></div>
      <div class="tiers-grid">${cards}</div>
      <section class="panel" style="margin:14px 0">
        <div class="panel-head"><span class="panel-title">生日月统一优惠券</span><span class="panel-note">${configuredBirthdayCoupon ? esc(configuredBirthdayCoupon.name) : "未配置"}</span></div>
        <div class="panel-body" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <label class="field" style="min-width:260px">生日券模板<select id="birthday-coupon-select"><option value="">不发放</option>${birthdayCouponOptions}</select></label>
          <button class="admin-btn primary" data-action="save-birthday-coupon">保存配置</button>
          <span class="inline-help">生日月首次访问时模拟发放，月底到期；每位会员每年一次。当前演示账户本年已发 ${currentYearIssues} 次。</span>
        </div>
      </section>
      <div class="compare-layout">
        <section class="panel"><div class="panel-head"><span class="panel-title">小程序权益展示预览</span><span class="panel-note">读取当前已保存规则</span></div>
          <div class="comparison-preview">${tiers.map(tier => `<div><strong>${esc(tier.name)}</strong><span>${tier.discount === 100 ? "会员价" : `${Number(tier.discount) / 10} 折`}</span><small>${Number(tier.points).toLocaleString()} 积分起 · 积分 ×${Number(tier.pointsMultiplier || 1)}</small></div>`).join("")}</div>
        </section>
        <section class="panel"><div class="panel-head"><span class="panel-title">升级规则说明</span></div><div class="panel-body"><div class="rule-list">
          <div class="rule-item"><span class="rule-bullet">1</span><span>用户达到对应成长积分门槛后，自动升级至最高可达等级。</span></div>
          <div class="rule-item"><span class="rule-bullet">2</span><span>SKU 会员价优先于等级折扣，二者不叠加；未配置 SKU 会员价时再用全场等级折扣。</span></div>
          <div class="rule-item"><span class="rule-bullet">3</span><span>确认收货按商品实付净额乘积分倍率发放积分，不含运费。</span></div>
          <div class="rule-item"><span class="rule-bullet">4</span><span>调整门槛时请保持等级梯度递增；生日券发放需选择有效优惠券模板。</span></div>
        </div></div></section>
      </div>`);
  }

  function tierForm(tier = null) {
    const editing = Boolean(tier);
    const item = tier || { id: "", name: "", points: "", discount: 95, pointsMultiplier: 1, benefits: "" };
    const backdrop = openModal(editing ? "编辑会员等级" : "新增会员等级", `<form id="tier-form"><div class="form-grid">
      <label class="field">等级名称<input name="name" required value="${esc(item.name)}" placeholder="例如：金卡会员"></label>
      <label class="field">成长积分门槛<input name="points" type="number" min="0" required value="${item.points}" placeholder="例如：5000"></label>
      <label class="field">全场折扣（折）<input name="discount" type="number" min="1" max="10" step=".1" required value="${Number(item.discount) / 10}"></label>
      <label class="field">积分倍率<input name="pointsMultiplier" type="number" min="1" max="10" step=".1" required value="${Number(item.pointsMultiplier || 1)}"></label>
      <label class="field" style="grid-column:1/-1">核心权益描述<input name="benefits" required value="${esc(item.benefits)}" placeholder="例如：每月专属礼券 · 新品优先购"></label>
      <div class="inline-help" style="grid-column:1/-1">折扣填写 9 代表 9 折；积分倍率按商品实付金额计算。</div>
      <input type="hidden" name="id" value="${esc(item.id)}">
    </div></form>`, `<button class="secondary-btn" type="button" data-modal-close>取消</button><button class="primary-btn small" form="tier-form" type="submit">保存等级</button>`);
    backdrop.querySelector("#tier-form").addEventListener("submit", event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const data = {
        id: form.get("id") || `tier-${Date.now()}`,
        name: String(form.get("name")).trim(),
        points: Number(form.get("points")),
        discount: Number(form.get("discount")) * 10,
        pointsMultiplier: Number(form.get("pointsMultiplier")),
        benefits: String(form.get("benefits")).trim()
      };
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
    if (action === "reply-review") {
      replyReviewForm(id);
    } else if (action === "add-legal") {
      legalDocumentForm();
    } else if (action === "edit-legal") {
      legalDocumentForm(state.legalDocuments.find(item => item.id === id));
    } else if (action === "toggle-legal") {
      const document = state.legalDocuments.find(item => item.id === id);
      if (!document) return;
      document.status = document.status === "inactive" ? "active" : "inactive";
      document.updatedAt = new Date().toISOString().slice(0, 10);
      write(state);
      renderLegalDocuments();
      toast(document.status === "active" ? "协议已发布" : "协议已下线");
    } else if (action === "remove-sku") {
      control.closest("[data-sku-row]")?.remove();
    } else if (action === "preview-product") {
      window.open(`mini-product.html?id=${encodeURIComponent(id)}`, "_blank");
    } else if (action === "toggle-tag") {
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
    else if (action === "save-birthday-coupon") {
      const couponId = root.querySelector("#birthday-coupon-select")?.value || "";
      if (couponId && !state.coupons.some(item => item.id === couponId)) return toast("所选生日券不存在");
      state.membershipSettings ||= {};
      state.membershipSettings.birthdayCouponId = couponId;
      write(state);
      renderMembership();
      toast(couponId ? "生日券规则已保存" : "已关闭生日券发放");
    }
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
    if (root.dataset.page === "products") view === "reviews" ? renderReviews() : renderProducts();
    else if (root.dataset.page === "membership") renderMembership();
    else if (root.dataset.page === "banners") renderBanners();
    else if (root.dataset.page === "legal") renderLegalDocuments();
  });

  const page = root.dataset.page;
  if (page === "products") view === "reviews" ? renderReviews() : renderProducts();
  else if (page === "membership") renderMembership();
  else if (page === "banners") renderBanners();
  else if (page === "legal") renderLegalDocuments();
})();
