(() => {
  const { read } = window.MallData;
  const { icon, escapeHtml: esc, money, toast, openModal, closeModal, tabbar } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;

  const statusNames = {
    pending_payment: "待付款",
    to_ship: "待发货",
    to_receive: "待收货",
    completed: "已完成",
    "pending-review": "待评价",
    cancelled: "已取消",
    refunded: "已退款",
    recoverable: "退款待追回",
    pending: "等待商家审核",
    approved_wait_return: "待寄回商品",
    return_in_transit: "退货运输中",
    return_received: "退货已签收",
    refund_processing: "退款处理中",
    inspection_failed: "验收未通过",
    rejected: "售后申请未通过"
  };
  let state = read();
  window.MallOps.refreshMembershipBenefits();
  state = read();
  let filter = new URLSearchParams(location.search).get("status") || "all";

  function shell(title, content) {
    root.innerHTML = `<div class="phone-stage"><div class="phone"><div class="mini-shell">
      <header class="mini-head"><div class="mini-head-row"><a href="mini-profile.html" aria-label="返回" style="color:#666">${icon("chevron")}</a><span class="mini-title small">${title}</span><a href="index.html" class="head-link">总览</a></div></header>
      <main class="mini-main"><div class="mini-content">${content}</div></main>${tabbar("profile")}
    </div></div></div>`;
    root.querySelector(".mini-head-row")?.insertAdjacentHTML("beforeend", window.MallUI.messageEntry());
  }

  function orderStatus(order) {
    const activeTicket = state.afterSales.find(item => item.orderId === order.id
      && ["pending", "approved_wait_return", "return_in_transit", "return_received", "refund_processing"].includes(item.status));
    if (activeTicket) return `售后 · ${statusNames[activeTicket.status] || "处理中"}`;
    return statusNames[order.status] || order.status;
  }

  function ticketLabel(ticket) {
    return statusNames[ticket.status] || "处理中";
  }

  function ticketReservedQty(orderId, itemIndex) {
    return state.afterSales.filter(ticket => ticket.orderId === orderId
      && ["pending", "approved_wait_return", "return_in_transit", "return_received", "refund_processing", "refunded"].includes(ticket.status))
      .reduce((sum, ticket) => sum + (ticket.items || []).filter(line => Number(line.orderItemIndex) === itemIndex)
        .reduce((qty, line) => qty + Number(line.qty || 0), 0), 0);
  }

  function compressReviewImage(file) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) return reject(new Error("请选择图片文件"));
      if (file.size > 8 * 1024 * 1024) return reject(new Error("原始图片不能超过 8 MB"));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("图片读取失败"));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => reject(new Error("无法识别这张图片"));
        image.onload = () => {
          const scale = Math.min(1, 1000 / Math.max(image.width, image.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext("2d");
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const result = canvas.toDataURL("image/jpeg", 0.72);
          if (result.length > 400_000) return reject(new Error("图片压缩后仍过大，请换一张图片"));
          resolve(result);
        };
        image.src = String(reader.result || "");
      };
      reader.readAsDataURL(file);
    });
  }

  function renderOrders() {
    state = read();
    const filters = [["all", "全部"], ["pending_payment", "待付款"], ["to_ship", "待发货"], ["to_receive", "待收货"], ["pending-review", "待评价"], ["completed", "已完成"], ["after-sale", "退款/售后"]];
    const userOrders = state.orders.filter(order => order.userId === state.user.id);
    const pendingReviewCount = userOrders
      .filter(order => order.status === "completed")
      .reduce((count, order) => count + order.items.filter(item => !item.reviewId).length, 0);
    const orders = userOrders.filter(order => filter === "all"
      || (filter === "after-sale" ? Boolean(order.afterSaleId) || order.status === "refunded"
        : filter === "pending-review" ? order.status === "completed" && order.items.some(item => !item.reviewId)
          : order.status === filter));
    shell("我的订单", `${pendingReviewCount ? `<a class="review-pending-banner" href="mini-orders.html?status=pending-review"><span class="review-pending-icon">${icon("chat")}</span><span class="review-pending-copy"><strong>还有 ${pendingReviewCount} 件商品待评价</strong><small>分享真实体验，帮助其他用户做选择</small></span><span class="review-pending-cta">立即评价 ${icon("chevron")}</span></a>` : ""}
      <div class="toolbar-row">${filters.map(([value, label]) => `<button class="filter-chip ${filter === value ? "active" : ""}" data-action="filter" data-value="${value}">${label}</button>`).join("")}</div>
      ${orders.length ? orders.map(order => {
        const tickets = state.afterSales.filter(item => item.orderId === order.id);
        const items = order.items.map((item, itemIndex) => `<div class="order-item"><div class="cart-row" style="grid-template-columns:58px 1fr;padding:10px 0">
          <div class="cart-thumb" style="width:58px;height:58px"><img src="${item.image}" alt="${esc(item.name)}"></div>
          <div class="cart-info"><div class="cart-name">${esc(item.name)}</div><div class="cart-spec">${esc(item.skuLabel || item.skuSpecs?.map(spec => spec.value).join(" / ") || "")}</div><div class="cart-bottom"><span class="cart-spec">× ${item.qty}</span><strong class="price" style="font-size:12px">${money(item.price)}</strong></div></div>
        </div>${order.status === "completed" ? `<div class="order-review-row"><span>${item.reviewId ? "已评价" : "待评价"}</span>${item.reviewId ? `<button class="secondary-btn" disabled>已评价</button>` : `<button class="primary-btn small" data-action="review" data-id="${esc(order.id)}" data-index="${itemIndex}">去评价</button>`}</div>` : ""}</div>`).join("");
        const tracking = (order.tracking || []).slice(0, 2).map(item => `<div style="padding:4px 0;color:#888;font-size:9px">${esc(item.time)}　${esc(item.text)}</div>`).join("");
        const actions = order.status === "pending_payment"
          ? `<button class="secondary-btn" data-action="cancel" data-id="${esc(order.id)}">取消订单</button><button class="primary-btn small" data-action="pay" data-id="${esc(order.id)}">模拟支付</button>`
          : order.status === "to_receive"
            ? `<button class="secondary-btn" data-action="after-sale" data-id="${esc(order.id)}">申请售后</button><button class="secondary-btn" data-action="track" data-id="${esc(order.id)}">物流详情</button><button class="primary-btn small" data-action="receive" data-id="${esc(order.id)}">确认收货</button>`
            : ["to_ship", "completed"].includes(order.status)
              ? `<button class="secondary-btn" data-action="after-sale" data-id="${esc(order.id)}">申请售后</button>${order.status === "to_ship" ? `<a class="secondary-btn" href="mini-profile.html?view=chat">联系商家</a>` : ""}`
              : "";
        return `<article class="white-card section" style="padding:12px">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#999"><span>订单号 ${esc(order.id)}</span><strong style="color:var(--orange)">${orderStatus(order)}</strong></div>
          <div style="margin-top:6px">${items}</div>
          ${tickets.length ? `<div style="margin-top:8px;padding:8px;background:#fafafa;color:#777;font-size:10px">${tickets.map(ticket => `<div style="padding:4px 0;border-bottom:1px solid #eee">售后 ${esc(ticket.id)}：${esc(ticket.reason)} · ${ticketLabel(ticket)} · 退款 ${money(ticket.amount)}${ticket.returnShipment?.trackingNo ? `<div>${esc(ticket.returnShipment.carrier)} ${esc(ticket.returnShipment.trackingNo)}</div>` : ""}${ticket.status === "approved_wait_return" ? `<button class="secondary-btn" style="margin-top:5px" data-action="return-shipment" data-id="${esc(ticket.id)}">填写退货物流</button>` : ""}</div>`).join("")}</div>` : ""}
          ${order.tracking?.length ? `<div style="margin-top:7px;border-top:1px solid #f1f1f1;padding-top:6px">${tracking}</div>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:9px;border-top:1px solid #f1f1f1"><span class="cart-spec">${esc(order.createdAt || "")}</span><strong style="font-size:12px">实付 ${money(order.total)}</strong></div>
          ${actions ? `<div style="display:flex;justify-content:flex-end;gap:7px;margin-top:10px">${actions}</div>` : ""}
        </article>`;
      }).join("") : filter === "pending-review"
        ? `<div class="empty-state" style="min-height:300px"><strong>暂无待评价商品</strong><p>已完成评价的商品会显示在“已完成”订单中</p><a class="secondary-btn" href="mini-orders.html?status=completed">查看已完成订单</a></div>`
        : `<div class="empty-state" style="min-height:300px"><strong>暂无相关订单</strong><p>去商城发现适合你的好物</p><a class="primary-btn small" href="mini-shop.html">去逛逛</a></div>`}
      <div class="mini-notice">订单与运营后台共享演示数据 · 支付和物流均为模拟</div>`);
  }

  function renderPromotions() {
    state = read();
    const coupons = state.coupons.filter(item => item.status === "active").map(coupon => {
      const claimed = state.claimedCoupons.some(item => (item.couponId || item.id) === coupon.id);
      return `<article class="white-card section" style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px">
        <div><strong style="color:var(--orange);font-size:16px">${esc(coupon.name)}</strong><div class="cart-spec" style="margin-top:5px">有效期 ${coupon.validDays} 天 · 剩余 ${coupon.stock}</div></div>
        <button class="${claimed ? "secondary-btn" : "primary-btn small"}" data-action="claim" data-id="${esc(coupon.id)}" ${claimed ? "disabled" : ""}>${claimed ? "已领取" : "立即领取"}</button>
      </article>`;
    }).join("");
    const campaigns = state.campaigns.filter(item => item.status === "active").map(item => {
      const joined = (state.campaignParticipations || []).some(row => row.campaignId === item.id && row.userId === state.user.id);
      return `<article class="white-card section" style="padding:13px"><div class="hero-kicker">${esc(item.badge || "限时活动")}</div><strong style="display:block;margin-top:5px;font-size:14px">${esc(item.name)}</strong><p class="cart-spec" style="line-height:1.6">${esc(item.subtitle)}</p><button class="${joined ? "secondary-btn" : "primary-btn small"}" data-action="campaign" data-id="${esc(item.id)}">${joined ? "已报名" : "立即报名"}</button></article>`;
    }).join("");
    const flashes = state.flashSales.filter(sale => sale.status === "active" && Number(sale.sold) < Number(sale.quota)).map(sale => {
      const product = state.products.find(item => item.id === sale.productId);
      return `<article class="white-card section" style="padding:13px"><div style="display:flex;justify-content:space-between;align-items:center"><div><span class="tag top">限时秒杀</span><strong style="display:block;margin-top:7px">${esc(product?.name || "限时商品")}</strong></div><strong class="price">${money(sale.price)}</strong></div><div class="cart-spec" style="margin:8px 0">原价 ${money(sale.originalPrice)} · 已售 ${sale.sold}/${sale.quota} · ${esc(sale.startAt)}–${esc(sale.endAt)}</div><button class="primary-btn small" data-action="flash" data-id="${esc(sale.id)}">立即抢购</button></article>`;
    }).join("");
    const groups = state.groupDeals.filter(deal => deal.status === "active").map(deal => {
      const product = state.products.find(item => item.id === deal.productId);
      return `<article class="white-card section" style="padding:13px"><div style="display:flex;justify-content:space-between;align-items:center"><div><span class="tag recommend">好友拼团</span><strong style="display:block;margin-top:7px">${esc(product?.name || deal.title)}</strong></div><strong class="price">${money(deal.groupPrice)}</strong></div><div class="cart-spec" style="margin:8px 0">${Number(deal.targetMembers) - Number(deal.joined || 0)} 人成团 · 已参与 ${deal.joined || 0} 人 · ${esc(deal.expiresIn || "限时")}</div><button class="primary-btn small" data-action="group" data-id="${esc(deal.id)}">发起拼团</button></article>`;
    }).join("");
    shell("营销中心", `<div class="page-hero-title" style="font-size:18px">好礼与限时活动</div><p class="page-subtitle">活动由商城运营配置，参与与订单状态同步</p>
      <section class="section"><div class="section-head"><h2>优惠券</h2><a href="mini-coupons.html">我的券 ${icon("chevron")}</a></div>${coupons || `<div class="white-card">暂无可领取优惠券</div>`}</section>
      <section class="section"><div class="section-head"><h2>限时秒杀</h2></div>${flashes || `<div class="white-card">暂无秒杀活动</div>`}</section>
      <section class="section"><div class="section-head"><h2>好友拼团</h2></div>${groups || `<div class="white-card">暂无拼团活动</div>`}</section>
      <section class="section"><div class="section-head"><h2>主题活动</h2></div>${campaigns || `<div class="white-card">暂无主题活动</div>`}</section>`);
  }

  function renderCoupons() {
    state = read();
    const coupons = state.claimedCoupons.map(claim => {
      const coupon = state.coupons.find(item => item.id === (claim.couponId || claim.id));
      if (!coupon) return "";
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const expired = claim.expiresAt && today > claim.expiresAt;
      const status = expired ? "已过期" : ({ available: "可使用", used: "已使用", expired: "已过期" }[claim.status] || claim.status);
      const validity = claim.expiresAt
        ? `${claim.validFrom || claim.receivedAt || "已领取"} 至 ${claim.expiresAt}`
        : `领取后 ${coupon.validDays} 天`;
      return `<article class="white-card section" style="display:flex;align-items:center;justify-content:space-between;padding:14px"><div><strong style="color:var(--orange);font-size:15px">${esc(coupon.name)}${claim.source === "birthday" ? " · 生日礼券" : ""}</strong><div class="cart-spec" style="margin-top:5px">${claim.receivedAt || "已领取"} · 有效期 ${esc(validity)}</div></div><span class="tag ${claim.status === "available" && !expired ? "top" : ""}">${status}</span></article>`;
    }).join("");
    shell("我的优惠券", `<a class="head-link" href="mini-promotions.html">去领券 ${icon("chevron")}</a>${coupons || `<div class="empty-state"><strong>还没有优惠券</strong><p>去营销中心领取优惠</p><a class="primary-btn small" href="mini-promotions.html">去领券</a></div>`}`);
  }

  function renderDistribution() {
    state = read();
    const commissions = state.commissions.filter(item => item.userId === state.user.id);
    const available = window.MallOps.availableBalance(state);
    const history = [...state.withdrawals].filter(item => item.userId === state.user.id).map(item => `<div class="list-link"><span>${esc(item.createdAt)} · ${esc(item.account || "提现账户")}</span><strong>${money(item.amount)}　${item.status === "pending" ? "审核中" : item.status === "paid" ? "已打款" : "已拒绝"}</strong></div>`).join("");
    const rows = commissions.map(item => `<div class="list-link"><span>订单 ${esc(item.orderId)} · ${({ settled: "已结算", pending: "待结算", cancelled: "已取消", withdrawn: "已提现", recoverable: "退款待追回" })[item.status] || item.status}</span><strong>${money(item.amount)}</strong></div>`).join("");
    shell("分销中心", `<section class="white-card" style="padding:18px;background:#2c2c2c;color:#fff"><div style="font-size:10px;color:#bbb">可提现佣金</div><div style="margin-top:8px;font-size:28px;font-weight:700">${money(available)}</div><div style="margin-top:7px;font-size:10px;color:#bbb">邀请码 ${esc(state.user.referralCode)} · 订单完成后佣金结算</div><button class="primary-btn small" style="margin-top:14px" data-action="withdraw">申请提现</button></section>
      <section class="section white-card" style="padding:12px"><div class="section-head"><h2>佣金明细</h2><span class="cart-spec">待结算 ${money(commissions.filter(item => item.status === "pending").reduce((sum, item) => sum + Number(item.amount), 0))}</span></div>${rows || `<div class="cart-spec">暂无佣金记录</div>`}</section>
      <section class="section white-card" style="padding:12px"><div class="section-head"><h2>提现记录</h2></div>${history || `<div class="cart-spec">暂无提现记录</div>`}</section>
      <div class="mini-notice">请在分销中心生成分享码；只有有效推广员分享码可建立首次归属。退款将按佣金状态冲减或转人工处理。</div>`);
  }

  root.addEventListener("click", event => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const action = control.dataset.action;
    const id = control.dataset.id;
    try {
      if (action === "filter") {
        filter = control.dataset.value;
        history.replaceState(null, "", `mini-orders.html?status=${encodeURIComponent(filter)}`);
        renderOrders();
      } else if (action === "pay") {
        window.MallOps.payOrder(id);
        toast("模拟支付成功，订单已进入待发货");
        renderOrders();
      } else if (action === "cancel") {
        window.MallOps.cancelOrder(id);
        toast("订单已取消");
        renderOrders();
      } else if (action === "receive") {
        window.MallOps.confirmReceived(id);
        toast("已确认收货，分销佣金完成结算");
        renderOrders();
      } else if (action === "review") {
        const itemIndex = Number(control.dataset.index);
        const order = window.MallOps.findOrder(read(), id);
        const item = order?.items?.[itemIndex];
        if (!item) throw new Error("评价商品不存在");
        let reviewImages = [];
        let uploadPending = false;
        const backdrop = openModal("评价商品", `<form id="review-form">
          <div class="review-product-mini"><img src="${esc(item.image || "")}" alt=""><span><strong>${esc(item.name)}</strong><small>${esc(item.skuLabel || "")}</small></span></div>
          <label class="field">商品评分<select name="rating" required><option value="5">★★★★★　非常满意</option><option value="4">★★★★　满意</option><option value="3">★★★　一般</option><option value="2">★★　不满意</option><option value="1">★　非常不满意</option></select></label>
          <label class="field" style="margin-top:11px">评价内容<textarea name="text" rows="4" maxlength="500" placeholder="分享你的使用体验（选填，最多 500 字）"></textarea></label>
          <section class="review-photo-upload">
            <div class="review-photo-heading"><strong>晒图</strong><small id="review-photo-count">0 / 3 张</small></div>
            <button class="review-photo-add" type="button" data-action="choose-review-images">${icon("image")}<span>添加实拍图片</span></button>
            <input id="review-photo-input" type="file" accept="image/*" multiple hidden>
            <div class="review-photo-previews" id="review-photo-previews"></div>
            <small class="review-photo-hint">最多 3 张；图片会自动压缩，合计不超过约 700 KB</small>
          </section>
          <input type="hidden" name="orderId" value="${esc(id)}"><input type="hidden" name="itemIndex" value="${itemIndex}">
        </form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-review">提交评价</button>`);
        const photoInput = backdrop.querySelector("#review-photo-input");
        const photoPreviews = backdrop.querySelector("#review-photo-previews");
        const photoCount = backdrop.querySelector("#review-photo-count");
        const addPhotoButton = backdrop.querySelector("[data-action='choose-review-images']");
        const submitButton = backdrop.querySelector("[data-action='submit-review']");
        const renderReviewImages = () => {
          photoCount.textContent = `${reviewImages.length} / 3 张`;
          photoPreviews.innerHTML = reviewImages.map((source, index) => `<div class="review-photo-thumb"><img src="${esc(source)}" alt="评价图片 ${index + 1}"><button type="button" aria-label="移除图片">×</button></div>`).join("");
          photoPreviews.querySelectorAll(".review-photo-thumb button").forEach((button, index) => {
            button.addEventListener("click", () => {
              reviewImages.splice(index, 1);
              renderReviewImages();
            });
          });
          addPhotoButton.disabled = uploadPending || reviewImages.length >= 3;
          submitButton.disabled = uploadPending;
        };
        addPhotoButton.addEventListener("click", () => photoInput.click());
        photoInput.addEventListener("change", async () => {
          const files = Array.from(photoInput.files || []);
          photoInput.value = "";
          if (reviewImages.length + files.length > 3) toast("评价最多上传 3 张图片");
          const selectedFiles = files.slice(0, Math.max(0, 3 - reviewImages.length));
          if (!selectedFiles.length) return;
          uploadPending = true;
          renderReviewImages();
          for (const file of selectedFiles) {
            try {
              const source = await compressReviewImage(file);
              const existingSize = reviewImages.reduce((total, image) => total + image.length, 0);
              if (existingSize + source.length > 900_000) throw new Error("图片合计不能超过约 700 KB");
              reviewImages.push(source);
              renderReviewImages();
            } catch (error) {
              toast(error.message || "图片上传失败");
            }
          }
          uploadPending = false;
          renderReviewImages();
        });
        renderReviewImages();
        backdrop.querySelector("[data-action='submit-review']").addEventListener("click", () => {
          const formElement = backdrop.querySelector("#review-form");
          if (uploadPending) return toast("图片正在处理中，请稍候");
          if (!formElement.reportValidity()) return;
          const form = new FormData(formElement);
          try {
            window.MallOps.submitReview({ orderId: form.get("orderId"), itemIndex: Number(form.get("itemIndex")), rating: Number(form.get("rating")), text: form.get("text"), images: reviewImages });
            closeModal();
            toast("评价提交成功");
            renderOrders();
          } catch (error) {
            toast(error.message || "评价提交失败");
          }
        });
      } else if (action === "track") {
        const order = window.MallOps.findOrder(read(), id);
        const lines = (order?.tracking || []).map(row => `<div class="list-link"><span>${esc(row.time)}　${esc(row.text)}</span><span>${esc(row.place || "")}</span></div>`).join("");
        openModal("物流详情", `<div class="cart-spec">${esc(order?.carrier || "待揽收")} · ${esc(order?.trackingNo || "暂无单号")}</div>${lines || `<div class="cart-spec" style="margin-top:12px">暂无物流节点</div>`}`);
      } else if (action === "after-sale") {
        const order = window.MallOps.findOrder(read(), id);
        if (!order) throw new Error("订单不存在");
        const gross = order.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
        const goodsNet = Math.max(0, Number(order.subtotal || 0) - Number(order.discount || 0));
        const selectable = order.items.map((item, index) => {
          const remaining = Math.max(0, Number(item.qty || 0) - ticketReservedQty(id, index));
          return { item, index, remaining, linePaid: gross ? goodsNet * Number(item.price || 0) * Number(item.qty || 0) / gross : 0 };
        }).filter(row => row.remaining > 0);
        if (!selectable.length) throw new Error("订单商品已全部申请售后");
        const isReturn = order.status !== "to_ship";
        const reasonOptions = ["商品与描述不符", "商品质量问题", "少件/漏发", "错发商品", "不想要了", "其他问题"];
        const itemRows = selectable.map(({ item, index, remaining, linePaid }) => `<label style="display:grid;grid-template-columns:20px 1fr 72px;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #eee;font-size:11px">
          <input type="checkbox" name="include" value="${index}" checked>
          <span><strong>${esc(item.name)}</strong><small style="display:block;color:#999;margin-top:3px">${esc(item.skuLabel || "")} · 可申请 ${remaining} 件 · 预估 ${money(linePaid)}</small></span>
          <input class="field" style="width:72px;padding:6px" type="number" name="qty-${index}" data-qty-index="${index}" min="1" max="${remaining}" value="1" aria-label="申请数量">
        </label>`).join("");
        const backdrop = openModal("申请售后", `<form id="after-sale-form"><div class="form-grid">
          <div style="grid-column:1/-1"><strong style="font-size:12px">选择售后商品</strong>${itemRows}</div>
          <label class="field" style="grid-column:1/-1">售后原因<select name="reason">${reasonOptions.map(reason => `<option>${reason}</option>`).join("")}</select></label>
          <label class="field" style="grid-column:1/-1">问题描述<textarea name="description" rows="3" placeholder="请描述遇到的问题"></textarea></label>
          <div id="after-sale-estimate" class="mini-notice" style="grid-column:1/-1">预计退款：${money(0)}（以订单优惠分摊和售后审核为准）</div>
          <div class="mini-notice" style="grid-column:1/-1">${isReturn ? "此订单已发货，审核通过后需填写退货物流，商家验收后才会模拟完成退款。" : "商品发货前可申请仅退款。"}</div>
        </div><input type="hidden" name="orderId" value="${esc(id)}"></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-after-sale">提交申请</button>`);
        const formElement = backdrop.querySelector("#after-sale-form");
        const updateEstimate = () => {
          const selected = new Set(Array.from(formElement.querySelectorAll("input[name='include']:checked")).map(input => Number(input.value)));
          const selectedGoods = selectable.reduce((sum, row) => {
            if (!selected.has(row.index)) return sum;
            const qty = Math.min(row.remaining, Math.max(1, Number(formElement.querySelector(`[data-qty-index='${row.index}']`)?.value || 1)));
            return sum + row.linePaid * qty / Math.max(1, Number(row.item.qty || 1));
          }, 0);
          const allCovered = order.items.every((item, index) => {
            const row = selectable.find(entry => entry.index === index);
            const selectedQty = row && selected.has(index) ? Math.min(row.remaining, Number(formElement.querySelector(`[data-qty-index='${index}']`)?.value || 0)) : 0;
            return ticketReservedQty(id, index) + selectedQty >= Number(item.qty || 0);
          });
          const merchantFault = ["商品与描述不符", "商品质量问题", "少件/漏发", "错发商品"].includes(formElement.querySelector("[name='reason']").value);
          const shipRefund = isReturn && allCovered && merchantFault && !Number(order.refundedShippingAmount || 0) ? Number(order.shippingFee || 0) : 0;
          backdrop.querySelector("#after-sale-estimate").textContent = `预计退款：${money(selectedGoods + shipRefund)}（含商品 ${money(selectedGoods)}${shipRefund ? ` + 运费 ${money(shipRefund)}` : ""}；以售后审核为准）`;
        };
        formElement.addEventListener("input", updateEstimate);
        formElement.addEventListener("change", updateEstimate);
        updateEstimate();
        backdrop.querySelector("[data-action='submit-after-sale']").addEventListener("click", () => {
          if (!formElement.reportValidity()) return;
          const form = new FormData(formElement);
          const items = form.getAll("include").map(value => ({
            orderItemIndex: Number(value),
            qty: Number(form.get(`qty-${value}`))
          }));
          window.MallOps.applyAfterSale({
            orderId: form.get("orderId"),
            type: isReturn ? "return_refund" : "refund",
            reason: form.get("reason"),
            description: form.get("description"),
            items
          });
          closeModal();
          toast("售后申请已提交，等待后台审核");
          renderOrders();
        });
      } else if (action === "return-shipment") {
        const backdrop = openModal("填写退货物流", `<form id="return-shipment-form"><label class="field">承运商<input name="carrier" required placeholder="如：顺丰速运"></label><label class="field" style="margin-top:10px">物流单号<input name="trackingNo" required placeholder="请输入退货物流单号"></label></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-return-shipment">提交物流</button>`);
        backdrop.querySelector("[data-action='submit-return-shipment']").addEventListener("click", () => {
          const formElement = backdrop.querySelector("#return-shipment-form");
          if (!formElement.reportValidity()) return;
          const form = new FormData(formElement);
          window.MallOps.submitReturnShipment(id, { carrier: form.get("carrier"), trackingNo: form.get("trackingNo") });
          closeModal();
          toast("退货物流已提交");
          renderOrders();
        });
      } else if (action === "claim") {
        window.MallOps.claimCoupon(id);
        toast("优惠券已领取");
        renderPromotions();
      } else if (action === "campaign") {
        window.MallOps.participateCampaign(id);
        toast("报名成功");
        renderPromotions();
      } else if (action === "flash" || action === "group") {
        state = read();
        const promo = action === "flash" ? state.flashSales.find(item => item.id === id) : state.groupDeals.find(item => item.id === id);
        const promoType = action === "flash" ? "flash" : "group";
        const productId = promo?.productId;
        const order = window.MallOps.createOrder({ lines: [{ productId, qty: 1 }], promoType, promoId: id });
        if (action === "group") window.MallOps.joinGroup(id, order.id);
        location.href = `mini-orders.html?status=pending_payment&order=${encodeURIComponent(order.id)}`;
      } else if (action === "withdraw") {
        const available = window.MallOps.availableBalance(state);
        const backdrop = openModal("申请提现", `<form id="withdraw-form"><div class="form-grid">
          <label class="field" style="grid-column:1/-1">提现金额（可用 ${money(available)}）<input name="amount" type="number" min="${Number(state.settings.minimumWithdrawal || 100)}" max="${available}" step="0.01" required></label>
          <label class="field" style="grid-column:1/-1">收款账户<input name="account" required placeholder="微信/银行卡账户"></label>
        </div></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-withdrawal">提交申请</button>`);
        backdrop.querySelector("[data-action='submit-withdrawal']").addEventListener("click", () => {
          const formElement = backdrop.querySelector("#withdraw-form");
          if (!formElement.reportValidity()) return;
          const form = new FormData(formElement);
          try {
            window.MallOps.createWithdrawal(Number(form.get("amount")), String(form.get("account")).trim());
            closeModal();
            toast("提现申请已提交");
            renderDistribution();
          } catch (error) {
            toast(error.message);
          }
        });
      }
    } catch (error) {
      toast(error.message || "操作失败");
    }
  });

  const page = root.dataset.page;
  if (page === "orders") renderOrders();
  else if (page === "promotions") renderPromotions();
  else if (page === "coupons") renderCoupons();
  else if (page === "distribution") renderDistribution();
})();
