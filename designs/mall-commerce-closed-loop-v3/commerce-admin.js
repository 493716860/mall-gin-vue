(() => {
  const { read, write } = window.MallData;
  const { escapeHtml: esc, money, toast, openModal, closeModal, adminShell } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;
  let state = read();
  let orderFilter = "all";
  let orderQuery = "";
  let orderSearchTimer = 0;
  const shippingProvinces = [
    "北京市", "天津市", "上海市", "重庆市", "河北省", "山西省", "辽宁省", "吉林省", "黑龙江省", "江苏省",
    "浙江省", "安徽省", "福建省", "江西省", "山东省", "河南省", "湖北省", "湖南省", "广东省", "海南省",
    "四川省", "贵州省", "云南省", "陕西省", "甘肃省", "青海省", "台湾省", "内蒙古自治区", "广西壮族自治区",
    "西藏自治区", "宁夏回族自治区", "新疆维吾尔自治区", "香港特别行政区", "澳门特别行政区"
  ];

  const statusText = {
    pending_payment: "待付款",
    to_ship: "待发货",
    to_receive: "待收货",
    completed: "已完成",
    cancelled: "已取消",
    refunded: "已退款",
    pending: "待审核",
    approved: "已通过",
    approved_wait_return: "待用户寄回",
    return_in_transit: "退货运输中",
    return_received: "退货已签收",
    refund_processing: "退款处理中",
    inspection_failed: "验收未通过",
    refunded: "已退款",
    rejected: "已拒绝",
    settled: "已结算",
    paid: "已打款",
    cancelled_commission: "已取消",
    withdrawn: "已提现",
    recoverable: "退款待追回",
    active: "进行中",
    paused: "已暂停"
  };
  const statusTag = value => `<span class="tag ${["pending", "pending_payment", "to_ship"].includes(value) ? "top" : ""}">${esc(statusText[value] || value)}</span>`;

  function head(title, description, actions = "") {
    return `<div class="admin-page-head"><div><h1>${title}</h1><p>${description}</p></div><div class="admin-actions">${actions}</div></div>`;
  }

  function stat(label, value, note) {
    return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-number">${value}</div><div class="stat-foot">${note}</div></div>`;
  }

  function panel(title, body, note = "") {
    return `<section class="panel"><div class="panel-head"><span class="panel-title">${title}</span><span class="panel-note">${note}</span></div>${body}</section>`;
  }

  function orderRows(orders) {
    return orders.map(order => {
      const item = order.items?.[0] || {};
      const actions = order.status === "to_ship"
        ? `<button class="text-action" data-action="ship" data-id="${esc(order.id)}">去发货</button>`
        : order.status === "to_receive"
          ? `<button class="text-action" data-action="view-track" data-id="${esc(order.id)}">物流详情</button>`
          : order.status === "pending_payment"
            ? `<button class="text-action danger" data-action="cancel-order" data-id="${esc(order.id)}">关闭订单</button>`
            : `<button class="text-action" data-action="view-order" data-id="${esc(order.id)}">查看</button>`;
      return `<tr><td>${esc(order.id)}<small style="display:block;margin-top:4px;color:#a0a3a8">${esc(order.createdAt || "")}</small></td>
        <td>${esc(item.name || "—")} × ${Number(item.qty || 0)}</td><td>${esc(order.address?.name || "—")}<small style="display:block;color:#aaa;margin-top:3px">${esc(order.address?.phone || "")}</small></td>
        <td><strong>${money(order.total)}</strong></td><td>${statusTag(order.status)}</td><td>${actions}</td></tr>`;
    }).join("") || `<tr><td colspan="6"><div class="admin-empty">暂无订单</div></td></tr>`;
  }

  function renderOverview() {
    state = read();
    const paidOrders = state.orders.filter(item => !["pending_payment", "cancelled"].includes(item.status));
    const revenue = paidOrders.filter(item => item.status !== "refunded").reduce((sum, item) => sum + Number(item.total || 0), 0);
    const waitingShip = state.orders.filter(item => item.status === "to_ship").length;
    const pendingAfter = state.afterSales.filter(item => item.status === "pending").length;
    const pendingWithdraw = state.withdrawals.filter(item => item.status === "pending").length;
    const recent = [...state.orders].slice(0, 6);
    root.innerHTML = adminShell("overview", `${head("经营总览", "订单、履约、售后与营销数据来自同一套演示状态。")}
      <div class="stats-row">${stat("累计实收", money(revenue), "已支付订单，退款订单扣除")}${stat("待发货", waitingShip, "需要尽快完成履约")}${stat("待审核售后", pendingAfter, "用户申请等待处理")}${stat("待审核提现", pendingWithdraw, "分销提现申请")}</div>
      <div class="compare-layout">
        ${panel("待办事项", `<div class="panel-body"><div class="list-link"><a href="admin-orders.html">待发货订单</a><strong>${waitingShip} 笔</strong></div><div class="list-link"><a href="admin-aftersales.html">售后审核</a><strong>${pendingAfter} 笔</strong></div><div class="list-link"><a href="admin-distribution.html">提现审核</a><strong>${pendingWithdraw} 笔</strong></div><div class="list-link"><a href="admin-logistics.html">物流追踪</a><span>查看运输中的订单 →</span></div></div>`, "实时队列")}
        ${panel("业务闭环", `<div class="panel-body"><div class="rule-list"><div class="rule-item"><span class="rule-bullet">1</span><span>小程序提交并支付订单后进入待发货，库存与优惠券同步更新。</span></div><div class="rule-item"><span class="rule-bullet">2</span><span>后台录入承运商和运单号，用户端显示物流并可确认收货。</span></div><div class="rule-item"><span class="rule-bullet">3</span><span>用户申请售后由后台审核；确认收货后分销佣金转为可结算。</span></div></div></div>`, "前台与后台共享数据")}
      </div>
      <div style="margin-top:14px">${panel("最近订单", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>订单号</th><th>商品</th><th>收货人</th><th>金额</th><th>状态</th><th>操作</th></tr></thead><tbody>${orderRows(recent)}</tbody></table></div>`, `<a href="admin-orders.html">查看全部订单 →</a>`)}</div>`);
  }

  function renderOrders() {
    state = read();
    const userFilter = new URLSearchParams(location.search).get("user") || "";
    const tabs = [["all", "全部"], ["pending_payment", "待付款"], ["to_ship", "待发货"], ["to_receive", "待收货"], ["completed", "已完成"], ["refunded", "已退款"]];
    const orders = state.orders.filter(order => (!userFilter || (order.userId || "u1001") === userFilter) && (orderFilter === "all" || order.status === orderFilter) && (!orderQuery || `${order.id} ${order.address?.name || ""} ${order.items?.map(item => item.name).join(" ")}`.toLowerCase().includes(orderQuery.toLowerCase())));
    const table = `<div class="table-wrap"><table class="admin-table"><thead><tr><th>订单号 / 时间</th><th>商品信息</th><th>收货信息</th><th>实付金额</th><th>订单状态</th><th>操作</th></tr></thead><tbody>${orderRows(orders)}</tbody></table></div>`;
    root.innerHTML = adminShell("orders", `${head("订单管理", "处理订单查询、关闭与发货，用户端同步显示最新订单状态。")}
      <div class="stats-row">${stat("全部订单", state.orders.length, "包含演示状态订单")}${stat("待付款", state.orders.filter(item => item.status === "pending_payment").length, "等待用户完成支付")}${stat("待发货", state.orders.filter(item => item.status === "to_ship").length, "已支付待履约")}${stat("运输中", state.orders.filter(item => item.status === "to_receive").length, "用户可查看物流")}</div>
      ${panel("订单列表", `<div class="panel-body"><div class="filters"><label class="admin-search"><input id="order-search" type="search" placeholder="订单号 / 收货人 / 商品" value="${esc(orderQuery)}"></label><span class="inline-help">发货后前台订单状态和物流轨迹同步更新</span></div><div class="toolbar-row" style="margin-top:12px">${tabs.map(([key, label]) => `<button class="filter-chip ${orderFilter === key ? "active" : ""}" data-action="order-filter" data-value="${key}">${label}</button>`).join("")}</div></div>${table}`, `${orders.length} 笔订单`)}`);
    root.querySelector("#order-search")?.addEventListener("input", event => {
      orderQuery = event.target.value;
      const cursor = event.target.selectionStart;
      clearTimeout(orderSearchTimer);
      orderSearchTimer = window.setTimeout(() => {
        renderOrders();
        const input = root.querySelector("#order-search");
        input?.focus();
        input?.setSelectionRange(cursor, cursor);
      }, 140);
    });
  }

  function renderOrderDetail() {
    state = read();
    const query = new URLSearchParams(location.search);
    const order = state.orders.find(item => item.id === query.get("id"));
    const source = ["aftersales", "orders", "overview"].includes(query.get("from")) ? query.get("from") : "aftersales";
    const backHref = source === "orders" ? "admin-orders.html" : source === "overview" ? "admin-overview.html" : "admin-aftersales.html";
    const activeNav = source === "overview" ? "overview" : source;
    const actions = `<a class="admin-btn" href="${backHref}">返回${source === "aftersales" ? "售后工单" : source === "orders" ? "订单列表" : "经营总览"}</a>`;
    if (!order) {
      root.innerHTML = adminShell(activeNav, `${head("订单详情", "查看订单商品、收货信息、金额与履约进度。", actions)}<section class="panel"><div class="admin-empty">未找到对应订单</div></section>`);
      return;
    }
    const address = order.address || {};
    const addressLine = address.text || [address.province, address.city, address.district, address.detail].filter(Boolean).join("") || "—";
    const items = (order.items || []).map(item => `<tr>
      <td><div class="product-cell"><img src="${esc(item.image || state.products.find(product => product.id === item.productId)?.image || "")}" alt=""><div><strong>${esc(item.name || "商品")}</strong><small>SPU ${esc(item.productId || "—")}${item.skuLabel ? ` · ${esc(item.skuLabel)}` : ""}</small></div></div></td>
      <td>${money(item.price)}</td><td>${Number(item.qty || 0)}</td><td><strong>${money(Number(item.price || 0) * Number(item.qty || 0))}</strong></td>
    </tr>`).join("") || `<tr><td colspan="4"><div class="admin-empty">订单没有商品明细</div></td></tr>`;
    const tracking = (order.tracking || []).map(item => `<div class="order-timeline-item"><span class="order-timeline-dot"></span><div><strong>${esc(item.text || "物流更新")}</strong><small>${esc(item.time || "")} · ${esc(item.place || "")}</small></div></div>`).join("");
    const events = [
      ["订单创建", order.createdAt],
      ["完成支付", order.paidAt],
      ["商家发货", order.shippedAt],
      ["确认收货", order.receivedAt]
    ].filter(([, date]) => date).map(([label, date]) => `<div class="order-timeline-item"><span class="order-timeline-dot"></span><div><strong>${label}</strong><small>${esc(date)}</small></div></div>`).join("");
    root.innerHTML = adminShell(activeNav, `${head("订单详情", `订单编号 ${esc(order.id)} · ${statusText[order.status] || esc(order.status)}`, actions)}
      <div class="order-detail-layout">
        <div class="order-detail-main">
          ${panel("商品明细", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>商品</th><th>单价</th><th>数量</th><th>小计</th></tr></thead><tbody>${items}</tbody></table></div>`)}
          ${panel("订单金额", `<div class="order-amount-list"><div><span>商品金额</span><strong>${money(order.subtotal ?? order.total)}</strong></div><div><span>优惠金额</span><strong>− ${money(order.discount || 0)}</strong></div><div><span>运费</span><strong>${money(order.shippingFee || 0)}</strong></div><div class="order-amount-total"><span>实付金额</span><strong>${money(order.total)}</strong></div></div>`)}
          ${panel("物流轨迹", `<div class="order-timeline">${tracking || `<div class="inline-help">暂无物流轨迹</div>`}</div>`, order.trackingNo ? `${esc(order.carrier || "承运商")} · ${esc(order.trackingNo)}` : "未录入物流")}
        </div>
        <aside class="order-detail-side">
          ${panel("收货信息", `<div class="order-detail-info"><strong>${esc(address.name || "—")}</strong><span>${esc(address.phone || "—")}</span><p>${esc(addressLine)}</p></div>`)}
          ${panel("订单信息", `<div class="order-detail-info"><div><span>订单状态</span><strong>${statusTag(order.status)}</strong></div><div><span>下单时间</span><strong>${esc(order.createdAt || "—")}</strong></div><div><span>支付方式</span><strong>${esc(order.paymentMethod || "—")}</strong></div><div><span>支付时间</span><strong>${esc(order.paidAt || "—")}</strong></div><div><span>订单备注</span><strong>${esc(order.remark || "无")}</strong></div></div>`)}
          ${panel("履约进度", `<div class="order-timeline">${events || `<div class="inline-help">暂无后续履约记录</div>`}</div>`)}
        </aside>
      </div>`);
  }

  function renderAfterSales() {
    state = read();
    const rows = state.afterSales.map(ticket => {
      const order = state.orders.find(item => item.id === ticket.orderId);
      const itemSummary = (ticket.items || []).map(line => `${esc(line.name || order?.items?.[line.orderItemIndex]?.name || "商品")} × ${Number(line.qty || 0)}${line.skuLabel ? ` · ${esc(line.skuLabel)}` : ""}`).join("<br>") || "旧版工单未记录商品明细";
      const shipment = ticket.returnShipment?.trackingNo
        ? `<small style="display:block;margin-top:4px;color:#777">${esc(ticket.returnShipment.carrier)} ${esc(ticket.returnShipment.trackingNo)}</small>`
        : "";
      const freightPayer = ticket.returnRequired
        ? `<small style="display:block;margin-top:4px;color:#999">退货运费：${ticket.returnFreightPayer === "merchant" ? "商家承担" : "买家承担"}</small>`
        : "";
      const orderDetailLink = `<a class="text-action" href="admin-order-detail.html?id=${encodeURIComponent(ticket.orderId)}&from=aftersales">订单详情</a>`;
      const actions = ticket.status === "pending"
        ? `<button class="text-action" data-action="review-after" data-decision="approve" data-id="${esc(ticket.id)}">${ticket.returnRequired ? "同意退货退款" : "同意退款"}</button><button class="text-action danger" data-action="review-after" data-decision="reject" data-id="${esc(ticket.id)}">拒绝</button>${orderDetailLink}`
        : ticket.status === "return_in_transit"
          ? `<button class="text-action" data-action="inspect-return" data-id="${esc(ticket.id)}">验收退货</button>${orderDetailLink}`
          : orderDetailLink;
      return `<tr><td>${esc(ticket.id)}<small style="display:block;margin-top:4px;color:#a0a3a8">${esc(ticket.createdAt || "")}</small></td>
        <td>${esc(ticket.orderId)}<small style="display:block;margin-top:4px;color:#999">${esc(order?.address?.name || "")}</small></td>
        <td>${itemSummary}${freightPayer}</td><td>${esc(ticket.reason)}<small style="display:block;margin-top:4px;color:#999">${esc(ticket.description || "")}</small>${shipment}</td>
        <td>${money(ticket.amount)}<small style="display:block;margin-top:4px;color:#999">商品 ${money(ticket.goodsRefundAmount ?? ticket.amount)} · 运费 ${money(ticket.shippingRefundAmount || 0)}</small></td>
        <td>${statusTag(ticket.status)}${ticket.reviewNote ? `<small style="display:block;margin-top:4px;color:#999">${esc(ticket.reviewNote)}</small>` : ""}</td><td><div class="row-actions">${actions}</div></td></tr>`;
    }).join("") || `<tr><td colspan="7"><div class="admin-empty">暂无售后申请</div></td></tr>`;
    const pending = state.afterSales.filter(item => item.status === "pending").length;
    const waitingInspection = state.afterSales.filter(item => item.status === "return_in_transit").length;
    root.innerHTML = adminShell("aftersales", `${head("售后管理", "审核用户退款申请，审核结果同步更新订单状态与关联分销佣金。")}
      <div class="stats-row">${stat("售后申请", state.afterSales.length, "累计工单")}${stat("待审核", pending, "等待运营处理")}${stat("待验收", waitingInspection, "退货已寄出")}${stat("已退款", state.afterSales.filter(item => item.status === "refunded").length, "已完成退款")}</div>
      ${panel("售后工单", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>工单号</th><th>关联订单</th><th>商品 / 数量</th><th>申请原因 / 退货物流</th><th>退款拆分</th><th>状态</th><th>处理</th></tr></thead><tbody>${rows}</tbody></table></div>`, "验收通过后模拟退款、恢复库存并调整积分与佣金")}`);
  }

  function renderMarketing() {
    state = read();
    const coupons = state.coupons.map(item => `<tr><td><strong>${esc(item.name)}</strong><small style="display:block;margin-top:4px;color:#999">${item.type === "rate" ? `${Number(item.value) / 10} 折` : `满 ${item.threshold} 减 ${item.value}`}</small></td><td>${item.claimed || 0} / ${Number(item.claimed || 0) + Number(item.stock || 0)}</td><td>${statusTag(item.status)}</td><td><button class="text-action" data-action="toggle-coupon" data-id="${esc(item.id)}">${item.status === "active" ? "暂停" : "启用"}</button></td></tr>`).join("");
    const categoryCards = [
      ["admin-marketing-campaigns.html", "主题活动", "维护活动周期、用户展示内容与报名状态", state.campaigns.length, "campaign"],
      ["admin-marketing-flash.html", "限时秒杀", "独立维护商品、秒杀价、活动库存与时段", state.flashSales.length, "flash"],
      ["admin-marketing-groups.html", "好友拼团", "配置拼团价格、成团人数与活动时长", state.groupDeals.length, "group"]
    ].map(([href, title, description, count, kind]) => `<a class="marketing-category-card ${kind}" href="${href}">
      <span class="marketing-category-icon">${kind === "campaign" ? "活" : kind === "flash" ? "秒" : "团"}</span>
      <span class="marketing-category-copy"><strong>${title}</strong><small>${description}</small></span>
      <span class="marketing-category-count">${count}<small>项活动</small></span>
      <span class="marketing-category-arrow">›</span>
    </a>`).join("");
    const actions = `<button class="admin-btn primary" data-action="new-coupon">新增优惠券</button>`;
    root.innerHTML = adminShell("marketing", `${head("营销中心", "按营销类型分区管理，活动、秒杀与拼团各自维护；所有页面共享前台参与数据。", actions)}
      <div class="stats-row">${stat("优惠券", state.coupons.length, "领取后可在结算页使用")}${stat("主题活动", state.campaigns.length, `${(state.campaignParticipations || []).length} 人次报名`)}${stat("秒杀场次", state.flashSales.length, "支付后扣减活动名额")}${stat("拼团活动", state.groupDeals.length, "成团人数随支付订单增长")}</div>
      <section class="marketing-category-list">${categoryCards}</section>
      <div style="margin-top:16px">${panel("优惠券管理", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>优惠券</th><th>已领 / 总量</th><th>状态</th><th>操作</th></tr></thead><tbody>${coupons || `<tr><td colspan="4"><div class="admin-empty">暂无优惠券</div></td></tr>`}</tbody></table></div>`, "领取与核销由前台订单驱动")}</div>`);
  }

  function renderCampaigns() {
    state = read();
    const rows = state.campaigns.map(item => `<tr><td><strong>${esc(item.name)}</strong><small style="display:block;margin-top:4px;color:#999">${esc(item.subtitle)}</small></td><td>${esc(item.startAt)} - ${esc(item.endAt)}</td><td>${statusTag(item.status)}</td><td><button class="text-action" data-action="toggle-campaign" data-id="${esc(item.id)}">${item.status === "active" ? "暂停" : "启用"}</button></td></tr>`).join("");
    const actions = `<a class="admin-btn" href="admin-marketing.html">返回营销中心</a><button class="admin-btn primary" data-action="new-campaign">新建主题活动</button>`;
    root.innerHTML = adminShell("marketing-campaigns", `${head("主题活动", "维护活动主题、展示说明、活动周期与用户报名状态。", actions)}
      <div class="stats-row">${stat("主题活动", state.campaigns.length, "当前活动总数")}${stat("进行中", state.campaigns.filter(item => item.status === "active").length, "用户端可见")}${stat("累计报名", (state.campaignParticipations || []).length, "来自小程序端")}${stat("活动入口", "小程序", "报名后写入共享数据")}</div>
      ${panel("活动列表", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>活动名称</th><th>活动周期</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="4"><div class="admin-empty">暂无主题活动</div></td></tr>`}</tbody></table></div>`, `${state.campaigns.length} 项活动`)}`);
  }

  function renderFlashSales() {
    state = read();
    const rows = state.flashSales.map(item => {
      const product = state.products.find(productItem => productItem.id === item.productId);
      return `<tr><td><div class="product-cell"><img src="${esc(product?.image || "")}" alt=""><div><strong>${esc(product?.name || item.productId)}</strong><small>${esc(item.title || "限时秒杀")}</small></div></div></td><td><strong>${money(item.price)}</strong><small class="marketing-old-price">${money(item.originalPrice || product?.price)}</small></td><td>${Number(item.sold || 0)} / ${Number(item.quota || 0)}</td><td>${esc(item.startAt || "—")} - ${esc(item.endAt || "—")}</td><td>${statusTag(item.status)}</td><td><button class="text-action" data-action="toggle-sale" data-kind="flashSales" data-id="${esc(item.id)}">${item.status === "active" ? "暂停" : "启用"}</button></td></tr>`;
    }).join("");
    const actions = `<a class="admin-btn" href="admin-marketing.html">返回营销中心</a><button class="admin-btn primary" data-action="new-sale" data-kind="flash">新建秒杀</button>`;
    root.innerHTML = adminShell("marketing-flash", `${head("限时秒杀", "单独维护秒杀商品、活动价格、库存配额与起止时间。", actions)}
      <div class="stats-row">${stat("秒杀场次", state.flashSales.length, "累计配置")}${stat("进行中", state.flashSales.filter(item => item.status === "active").length, "小程序可参与")}${stat("活动库存", state.flashSales.reduce((sum, item) => sum + Number(item.quota || 0), 0), "各场次配额合计")}${stat("已售数量", state.flashSales.reduce((sum, item) => sum + Number(item.sold || 0), 0), "支付后更新")}</div>
      ${panel("秒杀场次", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>商品</th><th>活动价</th><th>已售 / 配额</th><th>活动时段</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="admin-empty">暂无秒杀场次</div></td></tr>`}</tbody></table></div>`, `${state.flashSales.length} 场`)}`);
  }

  function renderGroupDeals() {
    state = read();
    const rows = state.groupDeals.map(item => {
      const product = state.products.find(productItem => productItem.id === item.productId);
      return `<tr><td><div class="product-cell"><img src="${esc(product?.image || "")}" alt=""><div><strong>${esc(item.title || "好友拼团")}</strong><small>${esc(product?.name || item.productId)}</small></div></div></td><td><strong>${money(item.groupPrice)}</strong><small class="marketing-old-price">${money(item.originalPrice || product?.price)}</small></td><td>${Number(item.joined || 0)} 人</td><td>${Number(item.targetMembers || 0)} 人</td><td>${esc(item.expiresIn || "—")}</td><td>${statusTag(item.status)}</td><td><button class="text-action" data-action="toggle-sale" data-kind="groupDeals" data-id="${esc(item.id)}">${item.status === "active" ? "暂停" : "启用"}</button></td></tr>`;
    }).join("");
    const actions = `<a class="admin-btn" href="admin-marketing.html">返回营销中心</a><button class="admin-btn primary" data-action="new-sale" data-kind="group">新建拼团</button>`;
    root.innerHTML = adminShell("marketing-groups", `${head("好友拼团", "单独维护拼团商品、拼团价格、成团人数与活动时长。", actions)}
      <div class="stats-row">${stat("拼团活动", state.groupDeals.length, "累计配置")}${stat("进行中", state.groupDeals.filter(item => item.status === "active").length, "小程序可参与")}${stat("累计参与", state.groupDeals.reduce((sum, item) => sum + Number(item.joined || 0), 0), "支付后更新")}${stat("成团规则", "按活动", "活动独立设置目标人数")}</div>
      ${panel("拼团活动", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>活动 / 商品</th><th>拼团价</th><th>已参与</th><th>成团人数</th><th>活动时长</th><th>状态</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="7"><div class="admin-empty">暂无拼团活动</div></td></tr>`}</tbody></table></div>`, `${state.groupDeals.length} 项活动`)}`);
  }

  function renderMarketingPage() {
    const page = root.dataset.page;
    if (page === "marketing-campaigns") renderCampaigns();
    else if (page === "marketing-flash") renderFlashSales();
    else if (page === "marketing-groups") renderGroupDeals();
    else renderMarketing();
  }

  function renderDistribution() {
    state = read();
    const pending = state.withdrawals.filter(item => item.status === "pending");
    const withdrawals = state.withdrawals.map(item => `<tr><td>${esc(item.id)}<small style="display:block;margin-top:4px;color:#999">${esc(item.createdAt || "")}</small></td><td>${esc(item.userId)}</td><td>${money(item.amount)}</td><td>${esc(item.account || "—")}</td><td>${statusTag(item.status)}</td><td>${item.status === "pending" ? `<button class="text-action" data-action="withdraw-review" data-decision="approve" data-id="${esc(item.id)}">审核并打款</button><button class="text-action danger" data-action="withdraw-review" data-decision="reject" data-id="${esc(item.id)}">拒绝</button>` : "—"}</td></tr>`).join("") || `<tr><td colspan="6"><div class="admin-empty">暂无提现申请</div></td></tr>`;
    const commissions = state.commissions.map(item => `<tr><td>${esc(item.id)}</td><td>${esc(item.orderId)}</td><td>${esc(item.userId)}</td><td>${money(item.amount)}</td><td>${statusTag(item.status)}</td><td>${esc(item.createdAt || "")}</td></tr>`).join("");
    const actions = `<button class="admin-btn" data-action="commission-settings">佣金规则 · ${Number(state.settings.commissionRate)}%</button>`;
    root.innerHTML = adminShell("distribution", `${head("分销管理", "查看订单佣金，审核提现申请；用户确认收货后佣金可结算，售后退款时佣金同步取消或列入追回。", actions)}
      <div class="stats-row">${stat("分销员", state.users.filter(item => item.distributor).length, "当前用户档案中的分销身份")}${stat("待结算佣金", money(state.commissions.filter(item => item.status === "pending").reduce((sum, item) => sum + Number(item.amount), 0)), "关联未完成订单")}${stat("可提现余额", money(window.MallOps.availableBalance(state)), "扣除已提现与待审核金额")}${stat("待审核提现", pending.length, "用户端申请")}</div>
      ${panel("提现申请", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>申请编号</th><th>用户</th><th>金额</th><th>收款账户</th><th>状态</th><th>处理</th></tr></thead><tbody>${withdrawals}</tbody></table></div>`, "审核通过后模拟打款")}
      <div style="margin-top:14px">${panel("佣金订单", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>佣金编号</th><th>订单号</th><th>分销员</th><th>佣金</th><th>状态</th><th>生成时间</th></tr></thead><tbody>${commissions || `<tr><td colspan="6"><div class="admin-empty">暂无佣金记录</div></td></tr>`}</tbody></table></div>`, `${state.commissions.length} 条记录`)}</div>`);
  }

  function renderLogistics() {
    state = read();
    const openOrders = state.orders.filter(item => ["to_ship", "to_receive"].includes(item.status));
    const rows = openOrders.map(order => `<tr><td>${esc(order.id)}</td><td>${esc(order.address?.name || "—")}<small style="display:block;margin-top:4px;color:#999">${esc(order.address?.phone || "")}</small></td><td>${statusTag(order.status)}</td><td>${esc(order.carrier || "待发货")}</td><td>${esc(order.trackingNo || "—")}</td><td>${order.status === "to_ship" ? `<button class="text-action" data-action="ship" data-id="${esc(order.id)}">录入物流</button>` : `<button class="text-action" data-action="view-track" data-id="${esc(order.id)}">查看轨迹</button>`}</td></tr>`).join("");
    const carriers = state.carriers.map(carrier => `<div class="list-link"><span>${esc(carrier.name)}</span><button class="switch ${carrier.enabled ? "on" : ""}" aria-label="切换${esc(carrier.name)}" data-action="toggle-carrier" data-id="${esc(carrier.id)}"></button></div>`).join("");
    const templates = (state.shippingTemplates || []).map(template => {
      const exceptions = (template.rules || []).map(rule => `${(rule.provinces || []).map(esc).join("、")}：${rule.freeShipping ? "包邮" : `${money(rule.fee)}${Number(rule.freeThreshold) > 0 ? `，满 ${money(rule.freeThreshold)} 包邮` : ""}`}`).join("；");
      const fallback = template.freeShipping ? "默认全境包邮" : `默认 ${money(template.fee)}${Number(template.freeThreshold) > 0 ? `，满 ${money(template.freeThreshold)} 包邮` : ""}`;
      return `<article class="shipping-template-card"><div><strong>${esc(template.name)}</strong><button class="text-action" data-action="edit-shipping-template" data-id="${esc(template.id)}">编辑规则</button></div><small>${fallback}</small><small>${exceptions ? `地区例外：${exceptions}` : "未设置地区例外"}</small><small>关联商品：${state.products.filter(product => product.shippingTemplateId === template.id).length} 件</small></article>`;
    }).join("");
    root.innerHTML = adminShell("logistics", `${head("快递 / 物流", "维护可用承运商、为待发货订单录入运单；物流节点实时显示在用户订单中。")}
      <div class="stats-row">${stat("待发货", state.orders.filter(item => item.status === "to_ship").length, "待录入承运商与单号")}${stat("运输中", state.orders.filter(item => item.status === "to_receive").length, "用户端可查看物流")}${stat("配送模板", (state.shippingTemplates || []).length, "按省份设置包邮与运费")}${stat("已完成物流", state.orders.filter(item => item.status === "completed").length, "用户确认收货")}</div>
      <div class="compare-layout">${panel("待履约订单", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>订单号</th><th>收货人</th><th>状态</th><th>承运商</th><th>运单号</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="admin-empty">暂无待履约订单</div></td></tr>`}</tbody></table></div>`, "录入发货信息后同步订单状态")}
        ${panel("承运商配置", `<div class="panel-body">${carriers}<div class="inline-help" style="margin-top:10px">停用承运商后，发货表单不再提供该选项。</div></div>`, "模拟配置")}</div>
      <div style="margin-top:14px">${panel("配送模板", `<div class="panel-body"><div class="shipping-template-list">${templates || `<div class="admin-empty">暂无配送模板</div>`}</div><div class="inline-help" style="margin-top:12px">商品关联模板后，小程序按收货省份计算各模板运费；相同模板商品合并判断满额包邮。</div><button class="admin-btn primary" type="button" data-action="new-shipping-template" style="margin-top:12px">＋ 新建配送模板</button></div>`, "配置默认规则与省份例外")}</div>`);
  }

  function shippingRuleRow(rule = {}) {
    const selected = new Set(rule.provinces || []);
    return `<div class="shipping-rule-row">
      <label class="field"><span>适用省份 / 地区</span><select data-shipping-provinces multiple size="5">${shippingProvinces.map(province => `<option value="${province}" ${selected.has(province) ? "selected" : ""}>${province}</option>`).join("")}</select></label>
      <label class="field"><span>该地区运费（元）</span><input data-shipping-fee type="number" min="0" step="0.01" required value="${Number(rule.fee || 0)}"></label>
      <label class="field"><span>满额包邮门槛（0 表示不启用）</span><input data-shipping-threshold type="number" min="0" step="0.01" value="${Number(rule.freeThreshold || 0)}"></label>
      <label class="shipping-free-choice"><input data-shipping-free type="checkbox" ${rule.freeShipping ? "checked" : ""}> 无条件包邮</label>
      <button type="button" class="text-action danger" data-action="remove-shipping-rule">移除此地区规则</button>
    </div>`;
  }

  function shippingTemplateForm(template = null) {
    const editing = Boolean(template);
    const current = template || { id: "", name: "", fee: 8, freeShipping: false, freeThreshold: 99, rules: [] };
    const backdrop = openModal(editing ? "编辑配送模板" : "新建配送模板", `<form id="shipping-template-form">
      <div class="form-grid">
        <label class="field" style="grid-column:1/-1">模板名称<input name="name" required maxlength="40" value="${esc(current.name)}" placeholder="例如：全国标准配送"></label>
        <label class="field">默认运费（元）<input name="fee" type="number" min="0" step="0.01" required value="${Number(current.fee || 0)}"></label>
        <label class="field">默认满额包邮门槛（0 表示不启用）<input name="freeThreshold" type="number" min="0" step="0.01" value="${Number(current.freeThreshold || 0)}"></label>
        <label class="shipping-free-choice" style="grid-column:1/-1"><input name="freeShipping" type="checkbox" ${current.freeShipping ? "checked" : ""}> 默认地区无条件包邮</label>
      </div>
      <div class="shipping-rule-heading"><strong>省份 / 地区例外</strong><small>可多选省份；无条件包邮优先于运费和门槛。</small></div>
      <div id="shipping-rule-rows">${(current.rules || []).map(rule => shippingRuleRow(rule)).join("")}</div>
      <button type="button" class="admin-btn" data-action="add-shipping-rule">＋ 添加地区规则</button>
    </form>`, `<button type="button" class="secondary-btn" data-modal-close>取消</button><button type="button" class="primary-btn small" data-action="save-shipping-template">保存模板</button>`);
    backdrop.querySelector(".modal").classList.add("shipping-template-modal");
    const rows = backdrop.querySelector("#shipping-rule-rows");
    backdrop.querySelector("[data-action='add-shipping-rule']").addEventListener("click", () => {
      rows.insertAdjacentHTML("beforeend", shippingRuleRow());
    });
    backdrop.addEventListener("click", event => {
      if (event.target.closest("[data-action='remove-shipping-rule']")) event.target.closest(".shipping-rule-row")?.remove();
    });
    backdrop.querySelector("[data-action='save-shipping-template']").addEventListener("click", () => {
      const form = backdrop.querySelector("#shipping-template-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const name = String(values.get("name") || "").trim();
      const fee = Number(form.elements.fee.value);
      const freeThreshold = Number(form.elements.freeThreshold.value || 0);
      if (!name || !Number.isFinite(fee) || fee < 0 || !Number.isFinite(freeThreshold) || freeThreshold < 0) return toast("请填写有效的模板名称、运费和包邮门槛");
      const usedProvinces = new Set();
      const rules = [];
      for (const row of rows.querySelectorAll(".shipping-rule-row")) {
        const provinces = [...row.querySelector("[data-shipping-provinces]").selectedOptions].map(option => option.value);
        const ruleFee = Number(row.querySelector("[data-shipping-fee]").value);
        const threshold = Number(row.querySelector("[data-shipping-threshold]").value || 0);
        if (!provinces.length) return toast("每条地区规则至少选择一个省份");
        if (provinces.some(province => usedProvinces.has(province))) return toast("同一省份不能重复配置地区规则");
        provinces.forEach(province => usedProvinces.add(province));
        if (!Number.isFinite(ruleFee) || ruleFee < 0 || !Number.isFinite(threshold) || threshold < 0) return toast("地区运费和包邮门槛必须是有效的非负金额");
        rules.push({ provinces, fee: ruleFee, freeShipping: row.querySelector("[data-shipping-free]").checked, freeThreshold: threshold });
      }
      const id = current.id || `SHIP-${Date.now().toString().slice(-8)}`;
      const saved = { id, name, fee, freeShipping: form.elements.freeShipping.checked, freeThreshold, rules };
      state.shippingTemplates ||= [];
      const index = state.shippingTemplates.findIndex(item => item.id === id);
      if (index >= 0) state.shippingTemplates[index] = saved;
      else state.shippingTemplates.unshift(saved);
      write(state);
      closeModal();
      renderLogistics();
      toast("配送模板已保存，关联商品及小程序结算将同步使用");
    });
  }

  function renderUsers() {
    state = read();
    const users = state.users.map(user => `<tr><td><strong>${esc(user.name)}</strong><small style="display:block;margin-top:4px;color:#999">${esc(user.id)} · ${esc(user.phone)}</small></td><td>${esc(user.tier)}</td><td>${Number(user.points).toLocaleString()}</td><td>${user.orders}</td><td>${money(user.spend)}</td><td>${user.distributor ? "分销员" : "普通用户"}</td><td>${statusTag(user.status === "active" ? "approved" : "rejected")}</td><td><button class="text-action" data-action="toggle-user" data-id="${esc(user.id)}">${user.status === "active" ? "禁用" : "启用"}</button> <button class="text-action" data-action="toggle-distributor" data-id="${esc(user.id)}">${user.distributor ? "取消分销" : "开通分销"}</button> <button class="text-action" data-action="user-orders" data-id="${esc(user.id)}">订单</button></td></tr>`).join("");
    root.innerHTML = adminShell("users", `${head("用户管理", "维护会员资料、分销身份与账户状态；用户下单和分销记录可从其他工作台追溯。")}
      <div class="stats-row">${stat("用户总数", state.users.length, "当前演示用户档案")}${stat("分销员", state.users.filter(item => item.distributor).length, "已开通分销身份")}${stat("会员积分", state.users.reduce((sum, item) => sum + Number(item.points || 0), 0).toLocaleString(), "用户成长积分")}${stat("累计消费", money(state.users.reduce((sum, item) => sum + Number(item.spend || 0), 0)), "用户档案汇总")}</div>
      ${panel("用户列表", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>用户</th><th>会员等级</th><th>积分</th><th>订单数</th><th>累计消费</th><th>分销身份</th><th>状态</th><th>操作</th></tr></thead><tbody>${users || `<tr><td colspan="8"><div class="admin-empty">暂无用户</div></td></tr>`}</tbody></table></div>`, "修改状态后用户端账号状态同步更新")}`);
  }

  function shipForm(orderId) {
    const order = state.orders.find(item => item.id === orderId);
    const options = state.carriers.filter(item => item.enabled).map(item => `<option value="${esc(item.name)}">${esc(item.name)}</option>`).join("");
    const backdrop = openModal("订单发货", `<div class="inline-help" style="margin-bottom:12px">订单 ${esc(orderId)} · ${esc(order?.address?.name || "")}</div><form id="ship-form"><div class="form-grid"><label class="field" style="grid-column:1/-1">承运商<select name="carrier" required>${options}</select></label><label class="field" style="grid-column:1/-1">物流单号<input name="trackingNo" required placeholder="请填写物流单号"></label><label class="field" style="grid-column:1/-1">物流节点说明<input name="description" value="快件已揽收，正在发往下一站"></label></div></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-ship">确认发货</button>`);
    backdrop.querySelector("[data-action='submit-ship']").addEventListener("click", () => {
      const form = new FormData(backdrop.querySelector("#ship-form"));
      try {
        const shipped = window.MallOps.shipOrder(orderId, { carrier: form.get("carrier"), trackingNo: form.get("trackingNo") });
        if (form.get("description")) shipped.tracking[0].text = `${form.get("carrier")} ${String(form.get("description")).trim()}`;
        const latest = read();
        const latestOrder = latest.orders.find(item => item.id === orderId);
        if (latestOrder) latestOrder.tracking = shipped.tracking;
        write(latest);
        closeModal();
        toast("已发货，物流信息已同步至用户端");
        renderOrders();
      } catch (error) {
        toast(error.message);
      }
    });
  }

  root.addEventListener("click", event => {
    const control = event.target.closest("[data-action]");
    if (!control) return;
    const { action, id } = control.dataset;
    try {
      if (action === "order-filter") {
        orderFilter = control.dataset.value;
        renderOrders();
      } else if (action === "ship") shipForm(id);
      else if (action === "cancel-order") {
        window.MallOps.cancelOrder(id);
        toast("待付款订单已关闭");
        renderOrders();
      } else if (action === "review-after") {
        const decision = control.dataset.decision;
        const ticket = state.afterSales.find(item => item.id === id);
        window.MallOps.reviewAfterSale(id, decision, decision === "approve"
          ? ticket?.returnRequired ? "审核通过，请按页面提示寄回商品" : "审核通过，模拟退款已处理"
          : "经核实不符合售后规则");
        toast(decision === "approve"
          ? ticket?.returnRequired ? "已同意退货退款，等待用户寄回" : "已同意退款，订单及佣金状态同步更新"
          : "已拒绝售后申请");
        renderAfterSales();
      } else if (action === "inspect-return") {
        const backdrop = openModal("退货验收", `<form id="return-inspection-form"><div class="rule-list"><div>确认已收到用户寄回商品，并检查商品状态。</div></div>
          <label class="field" style="margin-top:12px">验收结果<select name="decision"><option value="accepted">验收通过</option><option value="rejected">验收未通过</option></select></label>
          <label class="field" style="margin-top:10px">验收备注<textarea name="note" rows="3" placeholder="记录商品完好、缺件或不符合退货要求等"></textarea></label></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-return-inspection">确认验收</button>`);
        backdrop.querySelector("[data-action='submit-return-inspection']").addEventListener("click", () => {
          const formElement = backdrop.querySelector("#return-inspection-form");
          if (!formElement.reportValidity()) return;
          const form = new FormData(formElement);
          const accepted = form.get("decision") === "accepted";
          window.MallOps.confirmReturnReceipt(id, { accepted, note: form.get("note") });
          closeModal();
          toast(accepted ? "验收通过，模拟退款和库存恢复已完成" : "已记录验收未通过");
          renderAfterSales();
        });
      } else if (action === "view-order") {
        location.href = `admin-order-detail.html?id=${encodeURIComponent(id)}&from=${encodeURIComponent(root.dataset.page)}`;
      } else if (action === "view-track") {
        const order = state.orders.find(item => item.id === id);
        const lines = (order?.tracking || []).map(item => `<div class="list-link"><span>${esc(item.time)}　${esc(item.text)}</span><span>${esc(item.place || "")}</span></div>`).join("");
        openModal("物流轨迹", `<div class="rule-list"><div>订单号：${esc(order?.id || id)}</div><div>状态：${esc(statusText[order?.status] || order?.status || "")}</div><div>实付：${money(order?.total)}</div><div>收货地址：${esc(order?.address?.text || "")}</div></div><div style="margin-top:14px">${lines || "暂无物流信息"}</div>`);
      } else if (action === "toggle-coupon") {
        const coupon = state.coupons.find(item => item.id === id);
        if (coupon) coupon.status = coupon.status === "active" ? "paused" : "active";
        write(state); renderMarketing(); toast("优惠券状态已更新");
      } else if (action === "toggle-campaign") {
        const campaign = state.campaigns.find(item => item.id === id);
        if (campaign) campaign.status = campaign.status === "active" ? "paused" : "active";
        write(state); renderMarketingPage(); toast("活动状态已更新");
      } else if (action === "toggle-sale") {
        const row = state[control.dataset.kind]?.find(item => item.id === id);
        if (row) row.status = row.status === "active" ? "paused" : "active";
        write(state); renderMarketingPage(); toast("营销活动状态已更新");
      } else if (action === "new-campaign") campaignForm();
      else if (action === "new-sale") saleForm(control.dataset.kind);
      else if (action === "new-coupon") couponForm();
      else if (action === "withdraw-review") {
        window.MallOps.reviewWithdrawal(id, control.dataset.decision, control.dataset.decision === "approve" ? "审核通过，已模拟打款" : "收款信息或申请不符合要求");
        toast(control.dataset.decision === "approve" ? "提现审核通过并已打款" : "提现申请已拒绝");
        renderDistribution();
      } else if (action === "commission-settings") commissionForm();
      else if (action === "toggle-carrier") {
        const carrier = state.carriers.find(item => item.id === id);
        if (carrier) carrier.enabled = !carrier.enabled;
        write(state); renderLogistics(); toast("承运商配置已更新");
      } else if (action === "new-shipping-template") shippingTemplateForm();
      else if (action === "edit-shipping-template") shippingTemplateForm(state.shippingTemplates?.find(item => item.id === id));
      else if (action === "toggle-user") {
        const user = state.users.find(item => item.id === id);
        if (user) user.status = user.status === "active" ? "disabled" : "active";
        if (state.user.id === id) state.user.status = user?.status || state.user.status;
        write(state); renderUsers(); toast("用户状态已更新");
      } else if (action === "toggle-distributor") {
        const user = state.users.find(item => item.id === id);
        if (user) user.distributor = !user.distributor;
        if (state.user.id === id) state.user.distributor = Boolean(user?.distributor);
        write(state); renderUsers(); toast("分销身份已更新");
      } else if (action === "user-orders") {
        location.href = `admin-orders.html?user=${encodeURIComponent(id)}`;
      }
    } catch (error) {
      toast(error.message || "操作失败");
    }
  });

  function couponForm() {
    const backdrop = openModal("新增优惠券", `<form id="coupon-form"><div class="form-grid">
      <label class="field" style="grid-column:1/-1">优惠券名称<input name="name" required placeholder="例如：满 199 减 20"></label>
      <label class="field">优惠类型<select name="type"><option value="amount">满减券</option><option value="rate">折扣券</option></select></label>
      <label class="field">优惠金额 / 折扣保留比例（%）<input name="value" type="number" min="1" step="1" required value="20"></label>
      <label class="field">使用门槛<input name="threshold" type="number" min="0" value="199"></label>
      <label class="field">发放数量<input name="stock" type="number" min="1" value="100"></label>
      <label class="field">有效天数<input name="validDays" type="number" min="1" value="30"></label>
    </div></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="save-coupon">创建优惠券</button>`);
    backdrop.querySelector("[data-action='save-coupon']").addEventListener("click", () => {
      const formElement = backdrop.querySelector("#coupon-form");
      if (!formElement.reportValidity()) return;
      const form = new FormData(formElement);
      const type = form.get("type");
      const value = Number(form.get("value"));
      if (type === "rate" && value > 99) return toast("折扣券需填写 1–99 的折扣率");
      const id = `C${Date.now().toString().slice(-6)}`;
      state.coupons.unshift({ id, name: String(form.get("name")).trim(), type, value, threshold: Number(form.get("threshold")), stock: Number(form.get("stock")), claimed: 0, validDays: Number(form.get("validDays")), status: "active" });
      write(state); closeModal(); renderMarketing(); toast("优惠券已创建，小程序营销中心可领取");
    });
  }

  function campaignForm() {
    const backdrop = openModal("新建主题活动", `<form id="campaign-form"><div class="form-grid">
      <label class="field" style="grid-column:1/-1">活动名称<input name="name" required placeholder="例如：秋日焕新季"></label>
      <label class="field" style="grid-column:1/-1">活动说明<input name="subtitle" required placeholder="填写用户端展示的活动说明"></label>
      <label class="field">活动角标<input name="badge" value="限时活动"></label>
      <label class="field">开始日期<input name="startAt" type="date" required value="2026-10-19"></label>
      <label class="field">结束日期<input name="endAt" type="date" required value="2026-10-26"></label>
    </div></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="save-campaign">创建活动</button>`);
    backdrop.querySelector("[data-action='save-campaign']").addEventListener("click", () => {
      const formElement = backdrop.querySelector("#campaign-form");
      if (!formElement.reportValidity()) return;
      const form = new FormData(formElement);
      const name = String(form.get("name")).trim();
      const startAt = String(form.get("startAt"));
      const endAt = String(form.get("endAt"));
      if (endAt < startAt) return toast("结束日期不能早于开始日期");
      state.campaigns.unshift({ id: `A${Date.now().toString().slice(-8)}`, name, subtitle: String(form.get("subtitle")).trim(), badge: String(form.get("badge")).trim(), type: "campaign", status: "active", startAt, endAt, productIds: [] });
      write(state); closeModal(); renderMarketingPage(); toast("主题活动已创建");
    });
  }

  function saleForm(kind) {
    const isFlash = kind === "flash";
    const products = state.products.filter(item => item.status === "on");
    const productOptions = products.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("");
    const fields = isFlash
      ? `<label class="field">秒杀价<input name="price" type="number" min="0.01" step="0.01" required></label><label class="field">活动库存<input name="quota" type="number" min="1" required value="50"></label><label class="field">开始时间<input name="startAt" type="time" required value="10:00"></label><label class="field">结束时间<input name="endAt" type="time" required value="22:00"></label>`
      : `<label class="field">拼团价<input name="groupPrice" type="number" min="0.01" step="0.01" required></label><label class="field">成团人数<input name="targetMembers" type="number" min="2" required value="3"></label><label class="field">活动时长<input name="expiresIn" value="24 小时" required></label>`;
    const backdrop = openModal(isFlash ? "新建秒杀" : "新建拼团", `<form id="sale-form"><div class="form-grid">
      <label class="field" style="grid-column:1/-1">活动商品<select name="productId">${productOptions}</select></label>
      ${isFlash ? "" : `<label class="field" style="grid-column:1/-1">拼团标题<input name="title" required placeholder="例如：好友一起拼"></label>`}
      ${fields}
    </div></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="save-sale">创建${isFlash ? "秒杀" : "拼团"}</button>`);
    backdrop.querySelector("[data-action='save-sale']").addEventListener("click", () => {
      const formElement = backdrop.querySelector("#sale-form");
      if (!formElement.reportValidity()) return;
      const form = new FormData(formElement);
      const product = products.find(item => item.id === form.get("productId"));
      if (!product) return toast("请先创建在售商品");
      const id = `${isFlash ? "FS" : "GD"}${Date.now().toString().slice(-6)}`;
      if (isFlash) {
        const price = Number(form.get("price"));
        if (price >= Number(product.price)) return toast("秒杀价需低于商品售价");
        state.flashSales.unshift({ id, productId: product.id, title: "限时秒杀", price, originalPrice: Number(product.price), quota: Number(form.get("quota")), sold: 0, startAt: form.get("startAt"), endAt: form.get("endAt"), status: "active" });
      } else {
        const groupPrice = Number(form.get("groupPrice"));
        if (groupPrice >= Number(product.price)) return toast("拼团价需低于商品售价");
        state.groupDeals.unshift({ id, productId: product.id, title: String(form.get("title")).trim(), groupPrice, originalPrice: Number(product.price), targetMembers: Number(form.get("targetMembers")), joined: 0, expiresIn: String(form.get("expiresIn")).trim(), status: "active" });
      }
      write(state); closeModal(); renderMarketingPage(); toast("营销活动已创建，小程序端可立即参与");
    });
  }

  function commissionForm() {
    const backdrop = openModal("佣金规则", `<form id="commission-form"><label class="field">订单佣金比例（%）<input name="rate" type="number" min="0" max="50" step="0.1" value="${Number(state.settings.commissionRate)}"></label><p class="inline-help" style="margin-top:10px">新支付订单按实际订单金额生成待结算佣金；已生成记录不追溯修改。</p></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="save-rate">保存规则</button>`);
    backdrop.querySelector("[data-action='save-rate']").addEventListener("click", () => {
      const formElement = backdrop.querySelector("#commission-form");
      if (!formElement.reportValidity()) return;
      const rate = Number(new FormData(formElement).get("rate"));
      if (rate < 0 || rate > 50) return toast("佣金比例需在 0–50% 之间");
      state.settings.commissionRate = rate;
      write(state); closeModal(); renderDistribution(); toast("佣金规则已保存");
    });
  }

  window.addEventListener("storage", event => {
    if (event.key !== window.MallData.KEY) return;
    state = read();
    const page = root.dataset.page;
    if (page === "orders") renderOrders();
    else if (page === "aftersales") renderAfterSales();
    else if (page === "marketing" || page.startsWith("marketing-")) renderMarketingPage();
    else if (page === "distribution") renderDistribution();
    else if (page === "logistics") renderLogistics();
    else if (page === "users") renderUsers();
    else if (page === "overview") renderOverview();
  });

  const page = root.dataset.page;
  if (page === "overview") renderOverview();
  else if (page === "orders") renderOrders();
  else if (page === "aftersales") renderAfterSales();
  else if (page === "order-detail") renderOrderDetail();
  else if (page === "marketing" || page.startsWith("marketing-")) renderMarketingPage();
  else if (page === "distribution") renderDistribution();
  else if (page === "logistics") renderLogistics();
  else if (page === "users") renderUsers();
})();
