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
    cancelled: "已取消",
    refunded: "已退款",
    recoverable: "退款待追回"
  };
  let state = read();
  let filter = new URLSearchParams(location.search).get("status") || "all";

  function shell(title, content) {
    root.innerHTML = `<div class="phone-stage"><div class="phone"><div class="mini-shell">
      <header class="mini-head"><div class="mini-head-row"><a href="mini-profile.html" aria-label="返回" style="color:#666">${icon("chevron")}</a><span class="mini-title small">${title}</span><a href="index.html" class="head-link">总览</a></div></header>
      <main class="mini-main"><div class="mini-content">${content}</div></main>${tabbar("profile")}
    </div></div></div>`;
  }

  function orderStatus(order) {
    if (order.afterSaleId) {
      const ticket = state.afterSales.find(item => item.id === order.afterSaleId);
      if (ticket?.status === "pending") return "售后审核中";
      if (ticket?.status === "rejected") return statusNames[order.status] || "售后已拒绝";
    }
    return statusNames[order.status] || order.status;
  }

  function renderOrders() {
    state = read();
    const filters = [["all", "全部"], ["pending_payment", "待付款"], ["to_ship", "待发货"], ["to_receive", "待收货"], ["completed", "已完成"], ["after-sale", "退款/售后"]];
    const orders = state.orders.filter(order => filter === "all" || (filter === "after-sale" ? Boolean(order.afterSaleId) || order.status === "refunded" : order.status === filter));
    shell("我的订单", `<div class="toolbar-row">${filters.map(([value, label]) => `<button class="filter-chip ${filter === value ? "active" : ""}" data-action="filter" data-value="${value}">${label}</button>`).join("")}</div>
      ${orders.length ? orders.map(order => {
        const ticket = state.afterSales.find(item => item.id === order.afterSaleId);
        const items = order.items.map(item => `<div class="cart-row" style="grid-template-columns:58px 1fr;padding:10px 0">
          <div class="cart-thumb" style="width:58px;height:58px"><img src="${item.image}" alt="${esc(item.name)}"></div>
          <div class="cart-info"><div class="cart-name">${esc(item.name)}</div><div class="cart-bottom"><span class="cart-spec">× ${item.qty}</span><strong class="price" style="font-size:12px">${money(item.price)}</strong></div></div>
        </div>`).join("");
        const tracking = (order.tracking || []).slice(0, 2).map(item => `<div style="padding:4px 0;color:#888;font-size:9px">${esc(item.time)}　${esc(item.text)}</div>`).join("");
        const actions = order.status === "pending_payment"
          ? `<button class="secondary-btn" data-action="cancel" data-id="${esc(order.id)}">取消订单</button><button class="primary-btn small" data-action="pay" data-id="${esc(order.id)}">模拟支付</button>`
          : order.status === "to_receive"
            ? `<button class="secondary-btn" data-action="after-sale" data-id="${esc(order.id)}">申请售后</button><button class="secondary-btn" data-action="track" data-id="${esc(order.id)}">物流详情</button><button class="primary-btn small" data-action="receive" data-id="${esc(order.id)}">确认收货</button>`
            : ["to_ship", "completed"].includes(order.status)
              ? `<button class="secondary-btn" data-action="after-sale" data-id="${esc(order.id)}">申请售后</button>${order.status === "to_ship" ? `<a class="secondary-btn" href="admin-orders.html">联系商家</a>` : ""}`
              : "";
        return `<article class="white-card section" style="padding:12px">
          <div style="display:flex;justify-content:space-between;gap:8px;font-size:10px;color:#999"><span>订单号 ${esc(order.id)}</span><strong style="color:var(--orange)">${orderStatus(order)}</strong></div>
          <div style="margin-top:6px">${items}</div>
          ${ticket ? `<div style="margin-top:8px;padding:8px;background:#fafafa;color:#777;font-size:10px">售后：${esc(ticket.reason)} · ${ticket.status === "pending" ? "等待商家审核" : ticket.status === "refunded" ? "退款已处理" : ticket.status === "rejected" ? "申请未通过" : "处理中"}</div>` : ""}
          ${order.tracking?.length ? `<div style="margin-top:7px;border-top:1px solid #f1f1f1;padding-top:6px">${tracking}</div>` : ""}
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;padding-top:9px;border-top:1px solid #f1f1f1"><span class="cart-spec">${esc(order.createdAt || "")}</span><strong style="font-size:12px">实付 ${money(order.total)}</strong></div>
          ${actions ? `<div style="display:flex;justify-content:flex-end;gap:7px;margin-top:10px">${actions}</div>` : ""}
        </article>`;
      }).join("") : `<div class="empty-state" style="min-height:300px"><strong>暂无相关订单</strong><p>去商城发现适合你的好物</p><a class="primary-btn small" href="mini-shop.html">去逛逛</a></div>`}
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
      const status = { available: "可使用", used: "已使用", expired: "已过期" }[claim.status] || claim.status;
      return `<article class="white-card section" style="display:flex;align-items:center;justify-content:space-between;padding:14px"><div><strong style="color:var(--orange);font-size:15px">${esc(coupon.name)}</strong><div class="cart-spec" style="margin-top:5px">${claim.receivedAt || "已领取"} · 有效期 ${coupon.validDays} 天</div></div><span class="tag ${claim.status === "available" ? "top" : ""}">${status}</span></article>`;
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
      } else if (action === "track") {
        const order = window.MallOps.findOrder(read(), id);
        const lines = (order?.tracking || []).map(row => `<div class="list-link"><span>${esc(row.time)}　${esc(row.text)}</span><span>${esc(row.place || "")}</span></div>`).join("");
        openModal("物流详情", `<div class="cart-spec">${esc(order?.carrier || "待揽收")} · ${esc(order?.trackingNo || "暂无单号")}</div>${lines || `<div class="cart-spec" style="margin-top:12px">暂无物流节点</div>`}`);
      } else if (action === "after-sale") {
        const order = window.MallOps.findOrder(read(), id);
        const backdrop = openModal("申请售后", `<form id="after-sale-form"><div class="form-grid">
          <label class="field" style="grid-column:1/-1">售后原因<select name="reason"><option>商品与描述不符</option><option>商品质量问题</option><option>不想要了</option><option>少件/漏发</option><option>其他问题</option></select></label>
          <label class="field" style="grid-column:1/-1">问题描述<textarea name="description" rows="3" placeholder="请描述遇到的问题"></textarea></label>
          <label class="field">申请退款金额<input name="amount" type="number" min="0.01" max="${Number(order?.total || 0)}" step="0.01" value="${Number(order?.total || 0)}"></label>
        </div><input type="hidden" name="orderId" value="${esc(id)}"></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-after-sale">提交申请</button>`);
        backdrop.querySelector("[data-action='submit-after-sale']").addEventListener("click", () => {
          const formElement = backdrop.querySelector("#after-sale-form");
          if (!formElement.reportValidity()) return;
          const form = new FormData(formElement);
          window.MallOps.applyAfterSale({ orderId: form.get("orderId"), reason: form.get("reason"), description: form.get("description"), amount: Number(form.get("amount")) });
          closeModal();
          toast("售后申请已提交，等待后台审核");
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
