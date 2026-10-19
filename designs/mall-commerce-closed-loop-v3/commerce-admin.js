(() => {
  const { read, write } = window.MallData;
  const { escapeHtml: esc, money, toast, openModal, closeModal, adminShell } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;
  let state = read();
  let orderFilter = "all";
  let orderQuery = "";

  const statusText = {
    pending_payment: "待付款",
    to_ship: "待发货",
    to_receive: "待收货",
    completed: "已完成",
    cancelled: "已取消",
    refunded: "已退款",
    pending: "待审核",
    approved: "已通过",
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
    root.querySelector("#order-search")?.addEventListener("input", event => { orderQuery = event.target.value; renderOrders(); const input = root.querySelector("#order-search"); input?.focus(); input?.setSelectionRange(orderQuery.length, orderQuery.length); });
  }

  function renderAfterSales() {
    state = read();
    const rows = state.afterSales.map(ticket => {
      const order = state.orders.find(item => item.id === ticket.orderId);
      const actions = ticket.status === "pending" ? `<button class="text-action" data-action="review-after" data-decision="approve" data-id="${esc(ticket.id)}">同意退款</button><button class="text-action danger" data-action="review-after" data-decision="reject" data-id="${esc(ticket.id)}">拒绝</button>` : `<button class="text-action" data-action="view-order" data-id="${esc(ticket.orderId)}">查看订单</button>`;
      return `<tr><td>${esc(ticket.id)}<small style="display:block;margin-top:4px;color:#a0a3a8">${esc(ticket.createdAt || "")}</small></td><td>${esc(ticket.orderId)}</td><td>${esc(ticket.reason)}<small style="display:block;margin-top:4px;color:#999">${esc(ticket.description || "")}</small></td><td>${money(ticket.amount)}</td><td>${statusTag(ticket.status)}</td><td><div class="row-actions">${actions}</div></td></tr>`;
    }).join("") || `<tr><td colspan="6"><div class="admin-empty">暂无售后申请</div></td></tr>`;
    root.innerHTML = adminShell("aftersales", `${head("售后管理", "审核用户退款申请，审核结果同步更新订单状态与关联分销佣金。")}
      <div class="stats-row">${stat("售后申请", state.afterSales.length, "累计工单")}${stat("待审核", state.afterSales.filter(item => item.status === "pending").length, "等待运营处理")}${stat("已退款", state.afterSales.filter(item => item.status === "refunded").length, "已完成退款")}${stat("已拒绝", state.afterSales.filter(item => item.status === "rejected").length, "保留审核记录")}</div>
      ${panel("售后工单", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>工单号</th><th>关联订单</th><th>申请原因 / 描述</th><th>退款金额</th><th>状态</th><th>处理</th></tr></thead><tbody>${rows}</tbody></table></div>`, "审核结果回写用户订单")}`);
  }

  function renderMarketing() {
    state = read();
    const coupons = state.coupons.map(item => `<tr><td><strong>${esc(item.name)}</strong><small style="display:block;margin-top:4px;color:#999">${item.type === "rate" ? `${Number(item.value) / 10} 折` : `满 ${item.threshold} 减 ${item.value}`}</small></td><td>${item.claimed || 0} / ${Number(item.claimed || 0) + Number(item.stock || 0)}</td><td>${statusTag(item.status)}</td><td><button class="text-action" data-action="toggle-coupon" data-id="${esc(item.id)}">${item.status === "active" ? "暂停" : "启用"}</button></td></tr>`).join("");
    const campaignRows = state.campaigns.map(item => `<tr><td><strong>${esc(item.name)}</strong><small style="display:block;margin-top:4px;color:#999">${esc(item.subtitle)}</small></td><td>${esc(item.startAt)} - ${esc(item.endAt)}</td><td>${statusTag(item.status)}</td><td><button class="text-action" data-action="toggle-campaign" data-id="${esc(item.id)}">${item.status === "active" ? "暂停" : "启用"}</button></td></tr>`).join("");
    const saleCards = state.flashSales.map(item => `<div class="list-link"><span>秒杀 · ${esc(state.products.find(p => p.id === item.productId)?.name || item.productId)}　${money(item.price)}　${item.sold}/${item.quota}</span><button class="text-action" data-action="toggle-sale" data-kind="flashSales" data-id="${esc(item.id)}">${item.status === "active" ? "暂停" : "启用"}</button></div>`).join("");
    const groupCards = state.groupDeals.map(item => `<div class="list-link"><span>拼团 · ${esc(item.title)}　${money(item.groupPrice)}　已参与 ${item.joined}</span><button class="text-action" data-action="toggle-sale" data-kind="groupDeals" data-id="${esc(item.id)}">${item.status === "active" ? "暂停" : "启用"}</button></div>`).join("");
    const actions = `<button class="admin-btn" data-action="new-campaign">新建活动</button><button class="admin-btn" data-action="new-sale" data-kind="flash">新建秒杀</button><button class="admin-btn" data-action="new-sale" data-kind="group">新建拼团</button><button class="admin-btn primary" data-action="new-coupon">新增优惠券</button>`;
    root.innerHTML = adminShell("marketing", `${head("营销中心", "统一配置优惠券、主题活动、秒杀与拼团；用户参与记录及支付订单回写共享数据。", actions)}
      <div class="stats-row">${stat("优惠券", state.coupons.length, "领取后可在结算页使用")}${stat("主题活动", state.campaigns.length, "小程序支持活动报名")}${stat("秒杀场次", state.flashSales.length, "支付后扣减活动名额")}${stat("拼团活动", state.groupDeals.length, "成团人数随支付订单增长")}</div>
      <div class="compare-layout">${panel("优惠券", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>优惠券</th><th>已领 / 总量</th><th>状态</th><th>操作</th></tr></thead><tbody>${coupons}</tbody></table></div>`, "领取与核销由前台订单驱动")}
        ${panel("主题活动", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>活动名称</th><th>活动周期</th><th>状态</th><th>操作</th></tr></thead><tbody>${campaignRows}</tbody></table></div>`, `${(state.campaignParticipations || []).length} 人次报名`)}</div>
      <div style="margin-top:14px">${panel("秒杀与拼团", `<div class="panel-body">${saleCards || `<div class="admin-empty">暂无秒杀</div>`}${groupCards || `<div class="admin-empty">暂无拼团</div>`}</div>`, "暂停后小程序不可参与")}</div>`);
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
    root.innerHTML = adminShell("logistics", `${head("快递 / 物流", "维护可用承运商、为待发货订单录入运单；物流节点实时显示在用户订单中。")}
      <div class="stats-row">${stat("待发货", state.orders.filter(item => item.status === "to_ship").length, "待录入承运商与单号")}${stat("运输中", state.orders.filter(item => item.status === "to_receive").length, "用户端可查看物流")}${stat("承运商", state.carriers.filter(item => item.enabled).length, "已启用承运商")}${stat("已完成物流", state.orders.filter(item => item.status === "completed").length, "用户确认收货")}</div>
      <div class="compare-layout">${panel("待履约订单", `<div class="table-wrap"><table class="admin-table"><thead><tr><th>订单号</th><th>收货人</th><th>状态</th><th>承运商</th><th>运单号</th><th>操作</th></tr></thead><tbody>${rows || `<tr><td colspan="6"><div class="admin-empty">暂无待履约订单</div></td></tr>`}</tbody></table></div>`, "录入发货信息后同步订单状态")}
        ${panel("承运商配置", `<div class="panel-body">${carriers}<div class="inline-help" style="margin-top:10px">停用承运商后，发货表单不再提供该选项。</div></div>`, "模拟配置")}</div>`);
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
        window.MallOps.reviewAfterSale(id, decision, decision === "approve" ? "审核通过，退款原路退回" : "经核实不符合售后规则");
        toast(decision === "approve" ? "已同意退款，订单及佣金状态同步更新" : "已拒绝售后申请");
        renderAfterSales();
      } else if (action === "view-order" || action === "view-track") {
        const order = state.orders.find(item => item.id === id);
        const lines = (order?.tracking || []).map(item => `<div class="list-link"><span>${esc(item.time)}　${esc(item.text)}</span><span>${esc(item.place || "")}</span></div>`).join("");
        openModal(action === "view-track" ? "物流轨迹" : "订单详情", `<div class="rule-list"><div>订单号：${esc(order?.id || id)}</div><div>状态：${esc(statusText[order?.status] || order?.status || "")}</div><div>实付：${money(order?.total)}</div><div>收货地址：${esc(order?.address?.text || "")}</div></div><div style="margin-top:14px">${lines || "暂无物流信息"}</div>`);
      } else if (action === "toggle-coupon") {
        const coupon = state.coupons.find(item => item.id === id);
        if (coupon) coupon.status = coupon.status === "active" ? "paused" : "active";
        write(state); renderMarketing(); toast("优惠券状态已更新");
      } else if (action === "toggle-campaign") {
        const campaign = state.campaigns.find(item => item.id === id);
        if (campaign) campaign.status = campaign.status === "active" ? "paused" : "active";
        write(state); renderMarketing(); toast("活动状态已更新");
      } else if (action === "toggle-sale") {
        const row = state[control.dataset.kind]?.find(item => item.id === id);
        if (row) row.status = row.status === "active" ? "paused" : "active";
        write(state); renderMarketing(); toast("营销活动状态已更新");
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
      } else if (action === "toggle-user") {
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
      write(state); closeModal(); renderMarketing(); toast("主题活动已创建");
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
      write(state); closeModal(); renderMarketing(); toast("营销活动已创建，小程序端可立即参与");
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

  window.addEventListener("mall:data-updated", () => {
    state = read();
    const page = root.dataset.page;
    if (page === "orders") renderOrders();
    else if (page === "aftersales") renderAfterSales();
    else if (page === "marketing") renderMarketing();
    else if (page === "distribution") renderDistribution();
    else if (page === "logistics") renderLogistics();
    else if (page === "users") renderUsers();
    else if (page === "overview") renderOverview();
  });

  window.addEventListener("storage", event => {
    if (event.key !== window.MallData.KEY) return;
    state = read();
    const page = root.dataset.page;
    if (page === "orders") renderOrders();
    else if (page === "aftersales") renderAfterSales();
    else if (page === "marketing") renderMarketing();
    else if (page === "distribution") renderDistribution();
    else if (page === "logistics") renderLogistics();
    else if (page === "users") renderUsers();
    else if (page === "overview") renderOverview();
  });

  const page = root.dataset.page;
  if (page === "overview") renderOverview();
  else if (page === "orders") renderOrders();
  else if (page === "aftersales") renderAfterSales();
  else if (page === "marketing") renderMarketing();
  else if (page === "distribution") renderDistribution();
  else if (page === "logistics") renderLogistics();
  else if (page === "users") renderUsers();
})();
