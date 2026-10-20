(() => {
  const { read, write } = window.MallData;
  const { escapeHtml: esc, money, toast, openModal, closeModal, adminShell } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;

  const tabItems = [
    ["overview", "分销总览"],
    ["applications", "推广员申请"],
    ["promoters", "推广员档案"],
    ["relations", "推广关系"],
    ["rules", "等级与佣金规则"],
    ["ledger", "佣金账本"],
    ["payouts", "提现与出款"],
    ["risk", "风控异常"],
    ["audit", "操作审计"]
  ];
  const statusNames = {
    pending: "待确认收货",
    frozen: "冻结中",
    available: "可提现",
    settled: "可提现",
    withdrawn: "已提现",
    cancelled: "已冲销",
    recoverable: "待人工处置",
    submitted: "已提交",
    reviewing: "人工审核",
    approved: "待出款",
    paying: "出款处理中",
    succeeded: "已到账",
    failed: "出款失败",
    canceled: "已撤销",
    rejected: "已拒绝",
    active: "有效",
    revoked: "已撤销",
    not_promoter: "非推广员",
    archived: "历史版本",
    scheduled: "待生效",
    normal: "正常",
    high_frequency: "高频转化",
    promoter_approve: "审核通过",
    promoter_reject: "审核拒绝"
  };
  let state = read();
  let activeTab = new URLSearchParams(location.search).get("tab") || "overview";
  const listPages = Object.create(null);
  const listFilters = Object.create(null);

  const user = id => state.users.find(item => item.id === id);
  const profile = id => state.promoterProfiles.find(item => item.userId === id);
  const name = id => user(id)?.name || id || "—";
  const status = value => `<span class="tag ${["pending", "reviewing", "frozen", "failed", "recoverable"].includes(value) ? "top" : ""}">${esc(statusNames[value] || value || "—")}</span>`;
  const commTotal = value => state.commissions.filter(item => item.status === value).reduce((sum, item) => sum + Number(item.amount || 0), 0);

  function head(title, description, actions = "") {
    return `<div class="admin-page-head"><div><h1>${title}</h1><p>${description}</p></div><div class="admin-actions">${actions}</div></div>`;
  }
  function stat(label, value, note) {
    return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-number">${value}</div><div class="stat-foot">${note}</div></div>`;
  }
  function panel(title, body, note = "") {
    return `<section class="panel"><div class="panel-head"><span class="panel-title">${title}</span><span class="panel-note">${note}</span></div>${body}</section>`;
  }
  function table(headers, rows, className = "") {
    return `<div class="table-wrap"><table class="admin-table dist-admin-table ${className}"><thead><tr>${headers.map(item => `<th>${item}</th>`).join("")}</tr></thead><tbody>${rows || `<tr><td colspan="${headers.length}"><div class="admin-empty">暂无记录</div></td></tr>`}</tbody></table></div>`;
  }
  function tabs() {
    return `<nav class="dist-admin-tabs">${tabItems.map(([id, label]) => `<a class="${activeTab === id ? "active" : ""}" href="admin-distribution.html?tab=${id}">${label}</a>`).join("")}</nav>`;
  }
  function page(title, description, body, actions = "") {
    root.innerHTML = adminShell("distribution", `${head(title, description, actions)}${tabs()}${body}`);
  }
  function filtersFor(listId) {
    if (!listFilters[listId]) listFilters[listId] = { query: "", status: "", type: "" };
    return listFilters[listId];
  }
  function filterSelect(listId, field, label, options) {
    const selected = filtersFor(listId)[field];
    return `<select data-admin-filter data-list="${esc(listId)}" data-filter-field="${esc(field)}" aria-label="${esc(label)}"><option value="">全部${esc(label)}</option>${options.map(option => {
      const [value, text] = Array.isArray(option) ? option : [option, statusNames[option] || option];
      return `<option value="${esc(value)}" ${selected === value ? "selected" : ""}>${esc(text)}</option>`;
    }).join("")}</select>`;
  }
  function filterBar(listId, placeholder, { statuses = [], types = [], note = "" } = {}) {
    const filter = filtersFor(listId);
    return `<div class="filters"><label class="admin-search"><input type="search" data-admin-filter data-list="${esc(listId)}" data-filter-field="query" value="${esc(filter.query)}" placeholder="${esc(placeholder)}"></label>${statuses.length ? filterSelect(listId, "status", "状态", statuses) : ""}${types.length ? filterSelect(listId, "type", "类型", types) : ""}${note ? `<span class="inline-help">${note}</span>` : ""}</div>`;
  }
  function distinctOptions(items, getter, labeler = value => statusNames[value] || value) {
    return [...new Set(items.map(getter).filter(Boolean))].sort().map(value => [value, labeler(value)]);
  }
  function pagedTable(items, listId, headers, renderRow, className = "") {
    const result = window.MallUI.adminPage(items, listPages[listId] || 1, 5, listId);
    listPages[listId] = result.page;
    return `${table(headers, result.rows.map(renderRow).join(""), className)}${result.html}`;
  }
  function matchesQuery(query, values) {
    const normalized = String(query || "").trim().toLowerCase();
    return !normalized || values.filter(value => value !== undefined && value !== null).join(" ").toLowerCase().includes(normalized);
  }
  function renderList(listId) {
    const renderers = {
      applications: renderApplications,
      promoters: renderPromoters,
      relations: renderRelations,
      "rule-versions": renderRules,
      "tier-rules": renderRules,
      ledger: renderLedger,
      commissions: renderLedger,
      payouts: renderPayouts,
      risk: renderRisk,
      audit: renderAudit
    };
    renderers[listId]?.();
  }

  function allAccountTotals() {
    return state.promoterProfiles.reduce((total, promoter) => {
      const item = window.MallOps.accountSummary(state, promoter.userId);
      Object.keys(total).forEach(key => { total[key] += Number(item[key] || 0); });
      return total;
    }, { pending: 0, frozen: 0, available: 0, withdrawing: 0, withdrawn: 0, recoverable: 0 });
  }

  function renderOverview() {
    state = read();
    const totals = allAccountTotals();
    const applications = state.promoterApplications.filter(item => item.status === "pending");
    const risk = state.distributionRiskCases.filter(item => item.status === "reviewing");
    const openPayouts = state.withdrawals.filter(item => ["submitted", "reviewing", "approved", "paying"].includes(item.status));
    const currentRule = state.commissionRuleVersions.find(item => item.status === "active");
    const recent = state.commissionLedger.slice(0, 6).map(item => `<div class="dist-admin-timeline"><div><small>${esc(item.createdAt)}</small><span>${esc(item.note || item.type)}</span><strong>${item.direction === "debit" ? "−" : "+"}${money(item.amount)}</strong></div></div>`).join("");
    const body = `<div class="stats-row">
        ${stat("有效推广员", state.promoterProfiles.filter(item => item.status === "active").length, "审核通过且资格有效")}
        ${stat("待审核申请", applications.length, "需核验用户状态与申请材料")}
        ${stat("可提现佣金", money(totals.available), "由佣金明细与提现锁定共同投影")}
        ${stat("人工待办", openPayouts.length + risk.length, `提现 ${openPayouts.length} · 风控 ${risk.length}`)}
      </div>
      <div class="dist-admin-note">当前页面是分销领域工作台。微信支付、退款、出款与账本在真实系统中分别由 payment / aftersales / distribution 模块协作；此处仅演示状态和操作审计，不连接真实渠道。</div>
      <div class="dist-admin-grid">
        ${panel("佣金账户分布", `<div class="panel-body"><div class="dist-admin-kpi"><div><span>待确认收货</span><strong>${money(totals.pending)}</strong></div><div><span>冻结中</span><strong>${money(totals.frozen)}</strong></div><div><span>可提现</span><strong>${money(totals.available)}</strong></div><div><span>提现锁定</span><strong>${money(totals.withdrawing)}</strong></div><div><span>累计已提现</span><strong>${money(totals.withdrawn)}</strong></div><div><span>待人工处置</span><strong>${money(totals.recoverable)}</strong></div></div><p class="inline-help" style="margin-top:12px">账户余额是追加式佣金账本的可重建投影，不是积分、储值或通用支付余额。</p></div>`, `规则版本 ${esc(currentRule?.id || "未发布")}`)}
        ${panel("业务闭环", `<div class="panel-body"><div class="rule-list"><div class="rule-item"><span class="rule-bullet">1</span><span>审核推广员后签发来源码；演示服务校验有效推广员，普通用户分享只做分析。</span></div><div class="rule-item"><span class="rule-bullet">2</span><span>首次有效绑定不可被覆盖；下单固定直接推荐归因、订单项基数和规则版本。</span></div><div class="rule-item"><span class="rule-bullet">3</span><span>支付记待结算，确认收货后进入可配置冻结期；售后冲减佣金并留账。</span></div><div class="rule-item"><span class="rule-bullet">4</span><span>提现先锁佣金，再审核、出款、登记结果；失败释放，已提现后退款进入人工异常。</span></div></div></div>`, "身份 / 关系 / 资金")}
      </div>
      <div class="compare-layout">
        ${panel("待处理任务", `<div class="panel-body"><div class="list-link"><a href="admin-distribution.html?tab=applications">推广员申请</a><strong>${applications.length} 项</strong></div><div class="list-link"><a href="admin-distribution.html?tab=payouts">提现审核 / 出款</a><strong>${openPayouts.length} 项</strong></div><div class="list-link"><a href="admin-distribution.html?tab=risk">风险复核</a><strong>${risk.length} 项</strong></div><div class="list-link"><a href="admin-distribution.html?tab=ledger">退款佣金异常</a><strong>${state.commissions.filter(item => item.status === "recoverable").length} 项</strong></div></div>`, "队列状态")}
        ${panel("账本最近流水", recent || `<div class="admin-empty">暂无资金流水</div>`, `${state.commissionLedger.length} 笔追加明细`)}
      </div>`;
    page("分销运营总览", "推广资格、关系归因、等级规则、佣金账本和提现出款的集中运营入口。", body);
  }

  function renderApplications() {
    state = read();
    const filters = filtersFor("applications");
    const items = state.promoterApplications.filter(item =>
      (!filters.status || item.status === filters.status) &&
      matchesQuery(filters.query, [item.id, item.userId, name(item.userId), user(item.userId)?.phone, item.motivation, item.reviewer, item.reviewNote])
    );
    const rows = pagedTable(items, "applications", ["申请编号 / 时间", "申请人", "申请说明", "状态", "审核人 / 时间", "操作"], item => {
        const person = user(item.userId);
        const action = item.status === "pending"
          ? `<button class="text-action" data-action="review-application" data-id="${esc(item.id)}" data-decision="approve">通过</button><button class="text-action danger" data-action="review-application" data-id="${esc(item.id)}" data-decision="reject">拒绝</button>`
          : `<button class="text-action" data-action="application-detail" data-id="${esc(item.id)}">查看记录</button>`;
        return `<tr><td><strong>${esc(item.id)}</strong><small>${esc(item.createdAt || "")}</small></td><td><strong>${esc(person?.name || item.userId)}</strong><small>${esc(item.userId)} · ${esc(person?.phone || "—")}</small></td><td>${esc(item.motivation || "—")}</td><td>${status(item.status)}</td><td>${esc(item.reviewer || "—")}<small>${esc(item.reviewedAt || "")}</small></td><td class="nowrap">${action}</td></tr>`;
      });
    const body = `<div class="stats-row">${stat("全部申请", state.promoterApplications.length, "保留审核历史")}${stat("待审核", state.promoterApplications.filter(item => item.status === "pending").length, "通过后创建推广员档案")}${stat("已通过", state.promoterApplications.filter(item => item.status === "approved").length, "推广资格生效")}${stat("已拒绝", state.promoterApplications.filter(item => item.status === "rejected").length, "允许后续重新申请")}</div>
      ${filterBar("applications", "申请编号 / 用户 / 姓名 / 手机 / 说明", { statuses: distinctOptions(state.promoterApplications, item => item.status) })}
      <div style="margin-top:12px">${panel("推广员入驻申请", rows, `${items.length} 条匹配记录 · 审核需填写原因并记录审计`)}</div>`;
    page("推广员申请", "审核用户入驻资格，拒绝、再次申请和重新审核均保留历史。", body);
  }

  function renderPromoters() {
    state = read();
    const filters = filtersFor("promoters");
    const items = state.promoterProfiles.filter(item => {
      const person = user(item.userId);
      return (!filters.status || item.status === filters.status || item.riskStatus === filters.status) &&
        matchesQuery(filters.query, [item.userId, person?.name, person?.phone, item.referralCode, item.tierId]);
    });
    const rows = pagedTable(items, "promoters", ["推广员", "推广编号 / 团队", "等级", "账户投影", "资格 / 风险", "操作"], item => {
      const person = user(item.userId);
      const members = state.referralRelations.filter(row => row.promoterId === item.userId && row.status === "active").length;
      const totals = window.MallOps.accountSummary(state, item.userId);
      return `<tr><td><strong>${esc(person?.name || item.userId)}</strong><small>${esc(item.userId)} · ${esc(person?.phone || "—")}</small></td><td>${esc(item.referralCode || "—")}<small>有效关系 ${members} 人</small></td><td>${esc(state.distributionTiers.find(row => row.id === item.tierId)?.name || item.tierId)}</td><td>${money(totals.available)}<small>冻结 ${money(totals.frozen)} · 待结算 ${money(totals.pending)}</small></td><td>${status(item.status)}<small>${item.riskStatus === "frozen" ? "风控冻结" : item.riskStatus === "reviewing" ? "风险复核中" : "风险正常"}</small></td><td class="nowrap"><button class="text-action" data-action="promoter-detail" data-id="${esc(item.userId)}">档案</button><button class="text-action danger" data-action="promoter-eligibility" data-id="${esc(item.userId)}" data-value="${item.status === "active" ? "revoked" : "active"}">${item.status === "active" ? "撤销资格" : "恢复资格"}</button><button class="text-action" data-action="promoter-risk" data-id="${esc(item.userId)}" data-value="${item.riskStatus === "frozen" ? "normal" : "frozen"}">${item.riskStatus === "frozen" ? "解除风控冻结" : "风控冻结"}</button></td></tr>`;
    });
    const statuses = [...new Set([...state.promoterProfiles.map(item => item.status), ...state.promoterProfiles.map(item => item.riskStatus)].filter(Boolean))];
    const body = `${filterBar("promoters", "推广员 ID / 姓名 / 手机 / 推广编号", { statuses: statuses.map(value => [value, statusNames[value] || value]), note: "禁用资格会阻止新关系归因与提现，不改写历史佣金快照。" })}
      <div style="margin-top:12px">${panel("推广员档案", rows, `${items.length} 位匹配推广员`)}</div>`;
    page("推广员档案", "统一查看推广员资格、等级、关系规模、资金分布和风险状态。", body);
  }

  function renderRelations() {
    state = read();
    const filters = filtersFor("relations");
    const items = state.referralRelations.filter(item =>
      (!filters.status || item.status === filters.status) &&
      (!filters.type || item.bindType === filters.type || item.channel === filters.type) &&
      matchesQuery(filters.query, [item.memberId, name(item.memberId), item.promoterId, name(item.promoterId), item.bindType, item.channel, item.sourceTokenId, item.correctedFrom])
    );
    const rows = pagedTable(items, "relations", ["被推广用户", "直接推广员", "层级", "绑定来源", "绑定时间", "操作"], item => {
      const parent = user(item.promoterId);
      const child = user(item.memberId);
      const actions = item.status === "active" ? `<button class="text-action" data-action="correct-relation" data-id="${esc(item.memberId)}">纠正关系</button><button class="text-action" data-action="relation-chain" data-id="${esc(item.memberId)}">查看链路</button>` : "—";
      return `<tr><td><strong>${esc(child?.name || item.memberId)}</strong><small>${esc(item.memberId)}</small></td><td><strong>${esc(parent?.name || item.promoterId)}</strong><small>${esc(item.promoterId)}</small></td><td>直接推荐</td><td>${esc(item.bindType === "admin_correction" ? "后台纠正" : item.channel || "首次分享绑定")}<small>${esc(item.sourceTokenId || item.correctedFrom || "—")}</small></td><td>${esc(item.boundAt || "—")}<small>状态 ${esc(statusNames[item.status] || item.status)}</small></td><td class="nowrap">${actions}</td></tr>`;
    });
    const body = `<div class="dist-admin-note">归属规则：推广员分享码经服务端校验后，仅为尚未绑定的用户建立首次关系。后续分享不得覆盖；后台纠正需独立权限、理由、环路校验和前后值审计。</div>
      ${filterBar("relations", "用户 / 推广员 / 绑定来源", { statuses: distinctOptions(state.referralRelations, item => item.status), types: distinctOptions(state.referralRelations.flatMap(item => [{ value: item.bindType }, { value: item.channel }]), item => item.value, value => value === "admin_correction" ? "后台纠正" : value) })}
      <div style="margin-top:12px">${panel("推广关系记录", rows, `${items.length} 条匹配记录`)}</div>`;
    page("推广关系", "维护直接推荐关系，追踪首次绑定来源，并受控处理关系纠正。", body);
  }

  function renderRules() {
    state = read();
    const current = state.commissionRuleVersions.find(item => item.status === "active") || state.commissionRuleVersions[0] || { tiers: {} };
    const tiers = ["standard", "silver", "gold"];
    const tierNames = Object.fromEntries(state.distributionTiers.map(item => [item.id, item.name]));
    const matrixRows = tiers.map(tierId => {
      const rates = current.tiers?.[tierId] || [0];
      const directRate = Number(Array.isArray(rates) ? rates[0] || 0 : rates || 0);
      return `<tr><td><strong>${esc(tierNames[tierId] || tierId)}</strong></td><td>${directRate}%</td></tr>`;
    }).join("");
    const versionFilters = filtersFor("rule-versions");
    const versionItems = state.commissionRuleVersions.filter(rule =>
      (!versionFilters.status || rule.status === versionFilters.status) &&
      matchesQuery(versionFilters.query, [rule.name, rule.id, rule.effectiveAt, rule.scope, rule.note])
    );
    const versions = pagedTable(versionItems, "rule-versions", ["规则名称 / 版本", "生效时间", "适用范围", "状态", "备注", "操作"], rule => `<tr><td><strong>${esc(rule.name)}</strong><small>${esc(rule.id)}</small></td><td>${esc(rule.effectiveAt || "—")}</td><td>${esc(rule.scope || "全场商品")}</td><td>${status(rule.status)}</td><td>${esc(rule.note || "—")}</td><td><button class="text-action" data-action="rule-detail" data-id="${esc(rule.id)}">快照</button></td></tr>`);
    const tierFilters = filtersFor("tier-rules");
    const tierItems = [...state.distributionTiers].sort((a, b) => Number(a.sort) - Number(b.sort)).filter(tier =>
      (!tierFilters.status || tier.status === tierFilters.status) &&
      matchesQuery(tierFilters.query, [tier.name, tier.id, tier.period, tier.combination, ...(tier.conditions || []).map(row => `${row.metric} ${row.op} ${row.value}`)])
    );
    const tiersRows = pagedTable(tierItems, "tier-rules", ["等级", "命中条件", "组合关系", "统计周期", "状态"], tier => {
      const conditions = (tier.conditions || []).map(row => `${row.metric} ${row.op} ${row.value}`).join(tier.combination === "OR" ? " 或 " : " 且 ");
      return `<tr><td><strong>${esc(tier.name)}</strong><small>${esc(tier.id)}</small></td><td>${esc(conditions || "无升级条件")}</td><td>${esc(tier.combination || "AND")}</td><td>${esc(tier.period || "近90日")}</td><td>${status(tier.status)}</td></tr>`;
    });
    const actions = `<button class="admin-btn" data-action="tier-evaluate">立即评估等级</button><button class="admin-btn" data-action="edit-tier-rules">编辑等级规则</button><button class="admin-btn primary" data-action="edit-commission-rules">发布新佣金版本</button>`;
    const body = `<div class="dist-admin-note">佣金仅按直接推荐关系计算，比例按推广员等级配置；订单以商品实付净额（扣退款、不含运费）固化基数、比例和规则版本。以下演示参数不是已确认的商业政策。</div>
      <div class="dist-admin-grid">
        ${panel("当前直推佣金比例", table(["推广员等级", "直接推荐"], matrixRows), `${esc(current.id || "未发布")} · ${esc(current.effectiveAt || "")}`)}
        ${panel("结算与提现参数", `<div class="panel-body"><div class="dist-admin-kpi"><div><span>佣金推荐层级</span><strong>直接推荐</strong></div><div><span>收货冻结期</span><strong>${state.distributionSettings.freezeDays} 天</strong></div><div><span>最低提现</span><strong>${money(state.distributionSettings.minimumPayout)}</strong></div><div><span>单笔上限</span><strong>${money(state.distributionSettings.singlePayoutLimit)}</strong></div><div><span>日累计上限</span><strong>${money(state.distributionSettings.dailyPayoutLimit)}</strong></div><div><span>小额自动审核</span><strong>${money(state.distributionSettings.autoReviewThreshold)}</strong></div></div><div style="margin-top:12px"><button class="admin-btn" data-action="edit-distribution-settings">调整演示参数</button></div></div>`, "均待运营 / 财务确认")}
      </div>
      <div style="margin-top:14px">${filterBar("tier-rules", "等级 / 条件 / 周期", { statuses: distinctOptions(state.distributionTiers, item => item.status) })}
        ${panel("等级评估规则", tiersRows, `当前版本 ${esc(state.tierRuleVersion || "未发布")} · ${tierItems.length} 条匹配规则`)}</div>
      <div style="margin-top:14px">${filterBar("rule-versions", "版本名称 / 编号 / 适用范围 / 备注", { statuses: distinctOptions(state.commissionRuleVersions, item => item.status) })}
        ${panel("佣金规则版本", versions, `${versionItems.length} 条匹配版本 · 发布不修改历史订单`)}</div>`;
    page("等级与佣金规则", "配置推广员等级评估与按等级区分的直推佣金政策。", body, actions);
  }

  function renderLedger() {
    state = read();
    const filters = filtersFor("ledger");
    const items = state.commissionLedger.filter(item => {
      const commission = state.commissions.find(row => row.id === item.commissionId);
      return (!filters.status || (commission?.status || item.direction) === filters.status) &&
        (!filters.type || item.type === filters.type) &&
        matchesQuery(filters.query, [item.id, item.userId, name(item.userId), item.orderId, item.withdrawalId, item.commissionId, item.type, item.note, item.ruleVersion]);
    });
    const rows = pagedTable(items, "ledger", ["流水 / 时间", "业务类型 / 说明", "推广员", "业务关联", "层级 / 规则版本", "金额", "当前状态", "追溯"], item => {
      const commission = state.commissions.find(row => row.id === item.commissionId);
      const direction = item.direction === "debit" ? "−" : item.direction === "memo" ? "备忘" : "+";
      return `<tr><td><strong>${esc(item.id)}</strong><small>${esc(item.createdAt || "")}</small></td><td>${esc(item.type)}<small>${esc(item.note || "")}</small></td><td><strong>${esc(name(item.userId))}</strong><small>${esc(item.userId)}</small></td><td>${esc(item.orderId || item.withdrawalId || "—")}<small>${esc(item.commissionId || "")}</small></td><td>${item.level ? `${Number(item.level)} 级` : "—"}<small>${esc(item.ruleVersion || "")}</small></td><td><strong>${direction}${money(item.amount)}</strong></td><td>${status(commission?.status || item.direction)}</td><td class="nowrap"><button class="text-action" data-action="ledger-trace" data-id="${esc(item.id)}">解释链路</button></td></tr>`;
    });
    const snapshotFilters = filtersFor("commissions");
    const snapshots = state.commissions.filter(item =>
      (!snapshotFilters.status || item.status === snapshotFilters.status) &&
      matchesQuery(snapshotFilters.query, [item.id, item.orderId, item.userId, name(item.userId), item.ruleVersion, item.tierId])
    );
    const snapshotRows = pagedTable(snapshots, "commissions", ["佣金编号", "订单", "推广员", "基数", "费率 / 等级", "规则版本", "状态", "退款冲减"], item => `<tr><td>${esc(item.id)}</td><td>${esc(item.orderId)}</td><td>${esc(name(item.userId))}<small>${Number(item.level || 1)} 级</small></td><td>${money(item.basis || 0)}</td><td>${Number(item.rate || 0)}%<small>${esc(item.tierId || "历史等级")}</small></td><td>${esc(item.ruleVersion || "legacy")}</td><td>${status(item.status)}</td><td>${money(item.refundedAmount || 0)}${Number(item.recoverableAmount || 0) ? `<small>待人工 ${money(item.recoverableAmount)}</small>` : ""}</td></tr>`);
    const body = `${filterBar("ledger", "流水号 / 用户 / 订单 / 佣金号", { statuses: distinctOptions([...state.commissions.map(item => ({ status: item.status })), ...state.commissionLedger.map(item => ({ status: item.direction }))], item => item.status), types: distinctOptions(state.commissionLedger, item => item.type), note: "金额为正负向追加明细；余额仅作为可重建投影，不直接覆盖。" })}
      <div style="margin-top:12px">${panel("佣金账本流水", rows, `${items.length} 笔匹配明细`)}</div>
      <div style="margin-top:14px">${filterBar("commissions", "佣金号 / 订单 / 推广员 / 规则版本", { statuses: distinctOptions(state.commissions, item => item.status) })}
        ${panel("订单佣金快照", snapshotRows, `${snapshots.length} 条匹配快照 · 下单时固化，退款时追加冲正`)}</div>`;
    page("佣金账本", "逐笔解释待结算、冻结、释放、提现锁定、出款和退款调整。", body, `<button class="admin-btn" data-action="release-matured">运行到期释放任务</button>`);
  }

  function payoutAction(item) {
    if (["submitted", "reviewing"].includes(item.status)) {
      return `<button class="text-action" data-action="payout-review" data-id="${esc(item.id)}" data-decision="approve">审核通过</button><button class="text-action danger" data-action="payout-review" data-id="${esc(item.id)}" data-decision="reject">拒绝</button>`;
    }
    if (item.status === "approved") return `<button class="text-action" data-action="start-payout" data-id="${esc(item.id)}">开始出款</button>`;
    if (item.status === "paying") return `<button class="text-action" data-action="payout-result" data-id="${esc(item.id)}" data-outcome="succeeded">登记成功</button><button class="text-action danger" data-action="payout-result" data-id="${esc(item.id)}" data-outcome="failed">登记失败</button>`;
    if (item.status === "failed") return `<button class="text-action" data-action="retry-payout" data-id="${esc(item.id)}">重新锁定并重试</button>`;
    return `<button class="text-action" data-action="payout-detail" data-id="${esc(item.id)}">详情</button>`;
  }

  function renderPayouts() {
    state = read();
    const filters = filtersFor("payouts");
    const items = state.withdrawals.filter(item => {
      const person = user(item.userId);
      return (!filters.status || item.status === filters.status) &&
        (!filters.type || item.channelType === filters.type || item.channelLabel === filters.type || item.account === filters.type) &&
        matchesQuery(filters.query, [item.id, item.userId, person?.name, person?.phone, item.channelType, item.channelLabel, item.account, item.maskedAccount, item.reviewNote, item.outcomeNote]);
    });
    const rows = pagedTable(items, "payouts", ["提现单 / 时间", "推广员", "金额 / 收款渠道", "状态 / 说明", "审核记录", "出款尝试", "操作"], item => {
      const person = user(item.userId);
      const channel = item.channelLabel || item.account || "—";
      const attempts = state.payoutAttempts.filter(row => row.withdrawalId === item.id);
      return `<tr><td><strong>${esc(item.id)}</strong><small>${esc(item.createdAt || "")}</small></td><td><strong>${esc(person?.name || item.userId)}</strong><small>${esc(item.userId)} · ${esc(person?.phone || "")}</small></td><td><strong>${money(item.amount)}</strong><small>${esc(channel)} · ${esc(item.maskedAccount || "")}</small></td><td>${status(item.status)}<small>${esc(item.reviewNote || item.outcomeNote || "")}</small></td><td>${esc(item.reviewer || "—")}<small>${esc(item.reviewedAt || "")}</small></td><td>${attempts.length ? attempts.map(attempt => `<small>${esc(attempt.id)} · ${esc(statusNames[attempt.status] || attempt.status)}${attempt.providerRef ? ` · ${esc(attempt.providerRef)}` : ""}</small>`).join("") : "—"}</td><td class="nowrap">${payoutAction(item)}</td></tr>`;
    });
    const amountLocked = state.withdrawals.filter(item => ["submitted", "reviewing", "approved", "paying"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const body = `<div class="dist-admin-note">批准不等于到账。审核、发起出款、确认成功/失败是独立状态；银行转账成功必须登记凭证。超时未知结果需先查单/对账，禁止盲目重复出款。</div>
      <div class="stats-row">${stat("申请总量", state.withdrawals.length, "包含全部状态")}${stat("锁定金额", money(amountLocked), "提交至出款终态前保留")}${stat("人工审核", state.withdrawals.filter(item => ["submitted", "reviewing"].includes(item.status)).length, "大额或风险申请")}${stat("出款处理中", state.withdrawals.filter(item => item.status === "paying").length, "等待通道结果/财务登记")}</div>
      ${filterBar("payouts", "提现单 / 推广员 / 手机 / 收款渠道", { statuses: distinctOptions(state.withdrawals, item => item.status), types: distinctOptions(state.withdrawals, item => item.channelType || item.channelLabel || item.account, value => statusNames[value] || value) })}
      <div style="margin-top:12px">${panel("提现申请与出款", rows, `${items.length} 条匹配申请 · 双通道：微信商户出款 / 人工银行转账`)}</div>`;
    page("提现与出款", "按审核、出款、成功或失败释放的显式状态机处理提现，不把审核通过展示为已打款。", body);
  }

  function renderRisk() {
    state = read();
    const filters = filtersFor("risk");
    const items = state.distributionRiskCases.filter(item =>
      (!filters.status || item.status === filters.status) &&
      (!filters.type || item.type === filters.type) &&
      matchesQuery(filters.query, [item.id, item.userId, name(item.userId), item.type, item.level, item.summary, item.source, item.resolution])
    );
    const rows = pagedTable(items, "risk", ["异常编号", "推广员", "风险类型", "触发说明", "状态", "处理"], item => {
      const promoter = profile(item.userId);
      const actions = item.status === "reviewing"
        ? `<button class="text-action" data-action="risk-resolve" data-id="${esc(item.id)}" data-decision="normal">核验通过</button><button class="text-action danger" data-action="risk-resolve" data-id="${esc(item.id)}" data-decision="frozen">冻结资格</button>`
        : `<button class="text-action" data-action="risk-detail" data-id="${esc(item.id)}">处置记录</button>`;
      return `<tr><td><strong>${esc(item.id)}</strong><small>${esc(item.createdAt || "")}</small></td><td><strong>${esc(name(item.userId))}</strong><small>${esc(item.userId)} · 当前 ${esc(statusNames[promoter?.riskStatus] || promoter?.riskStatus || "正常")}</small></td><td><span class="dist-risk-badge">${esc(statusNames[item.type] || item.type)}</span><small>级别 ${esc(item.level || "medium")}</small></td><td>${esc(item.summary || "—")}<small>规则 ${esc(item.source || "manual")}</small></td><td>${status(item.status)}</td><td class="nowrap">${actions}</td></tr>`;
    });
    const body = `<div class="dist-admin-note">风控命中仅进入人工核验，不自动扣减或生成负佣金。处置需记录理由；冻结会阻止新归因和提现，历史资金仍走账本与财务复核。</div>
      ${filterBar("risk", "工单 / 推广员 / 异常说明 / 规则", { statuses: distinctOptions(state.distributionRiskCases, item => item.status), types: distinctOptions(state.distributionRiskCases, item => item.type) })}
      <div style="margin-top:12px">${panel("异常与人工复核", rows, `${items.length} 条匹配记录 · ${state.distributionRiskCases.filter(item => item.status === "reviewing").length} 项待处理`)}</div>`;
    page("风控异常", "复核自购刷单、批量注册、异常高频、退款套利、关系循环和提现异常。", body);
  }

  function renderAudit() {
    state = read();
    const filters = filtersFor("audit");
    const items = state.distributionAudit.filter(item =>
      (!filters.type || item.action === filters.type) &&
      matchesQuery(filters.query, [item.id, item.createdAt, item.action, item.actor, item.targetId, item.reason, JSON.stringify(item.before || ""), JSON.stringify(item.after || "")])
    );
    const rows = pagedTable(items, "audit", ["时间 / 事件号", "操作", "操作者", "目标", "业务理由", "前后值"], item => {
      const before = item.before ? JSON.stringify(item.before) : "—";
      const after = item.after ? JSON.stringify(item.after) : "—";
      return `<tr><td><strong>${esc(item.createdAt || "")}</strong><small>${esc(item.id)}</small></td><td>${esc(item.action)}</td><td>${esc(item.actor || "—")}</td><td>${esc(item.targetId || "—")}</td><td>${esc(item.reason || "—")}</td><td class="dist-audit-detail">前：${esc(before)}<br>后：${esc(after)}</td></tr>`;
    });
    const body = `${filterBar("audit", "事件 / 操作 / 操作者 / 目标 / 理由", { types: distinctOptions(state.distributionAudit, item => item.action) })}
      <div style="margin-top:12px">${panel("敏感操作审计", rows, `${items.length} 条匹配记录 · 全部 ${state.distributionAudit.length} 条不可覆盖记录`)}</div>
      <p class="inline-help" style="margin-top:10px">正式环境应由 audit 模块存储不可随意修改的审计日志，并实施权限控制、敏感字段脱敏和留存策略。此原型仅使用浏览器演示数据。</p>`;
    page("操作审计", "查询推广资格、关系更正、规则发布、佣金调账、提现出款和风控处置的操作者与前后值。", body);
  }

  function applicationReview(id, decision) {
    const item = state.promoterApplications.find(row => row.id === id);
    const backdrop = openModal(decision === "approve" ? "审核通过" : "审核拒绝", `<div class="inline-help" style="margin-bottom:10px">${esc(name(item?.userId))} · ${esc(item?.userId)}</div><form id="review-application-form"><label class="field">审核理由<textarea name="reason" rows="3" required placeholder="填写资格判断依据，写入审计记录"></textarea></label></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="confirm-application-review">确认${decision === "approve" ? "通过" : "拒绝"}</button>`);
    backdrop.querySelector("[data-action='confirm-application-review']").addEventListener("click", () => {
      const form = backdrop.querySelector("#review-application-form");
      if (!form.reportValidity()) return;
      try {
        window.MallOps.reviewPromoterApplication(id, decision, new FormData(form).get("reason"));
        closeModal();
        toast(decision === "approve" ? "已通过，推广档案与来源码已创建" : "已拒绝，审核历史已留存");
        renderApplications();
      } catch (error) { toast(error.message); }
    });
  }

  function promoterRiskForm(userId, riskStatus) {
    const backdrop = openModal(riskStatus === "frozen" ? "冻结推广资格" : "解除推广冻结", `<div class="inline-help" style="margin-bottom:10px">${esc(name(userId))} · ${esc(userId)}</div><form id="risk-form"><label class="field">处置理由<textarea name="reason" rows="3" required placeholder="说明风控判断及处置范围"></textarea></label></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="confirm-risk">确认</button>`);
    backdrop.querySelector("[data-action='confirm-risk']").addEventListener("click", () => {
      const form = backdrop.querySelector("#risk-form");
      if (!form.reportValidity()) return;
      try {
        window.MallOps.setPromoterRisk(userId, riskStatus, new FormData(form).get("reason"));
        closeModal();
        toast(riskStatus === "frozen" ? "推广资格已冻结" : "推广资格已恢复");
        renderPromoters();
      } catch (error) { toast(error.message); }
    });
  }

  function promoterEligibilityForm(userId, nextStatus) {
    const action = nextStatus === "revoked" ? "撤销资格" : "恢复资格";
    const backdrop = openModal(action, `<div class="dist-admin-note">撤销后停止新归因、提现并撤销现有分享码；已建立关系与历史订单佣金快照保持不变。</div><form id="eligibility-form"><div class="inline-help" style="margin-bottom:10px">${esc(name(userId))} · ${esc(userId)}</div><label class="field">业务理由<textarea name="reason" rows="3" required placeholder="填写资格变更依据，写入状态历史与审计"></textarea></label></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="confirm-eligibility">确认${action}</button>`);
    backdrop.querySelector("[data-action='confirm-eligibility']").addEventListener("click", () => {
      const form = backdrop.querySelector("#eligibility-form");
      if (!form.reportValidity()) return;
      try {
        window.MallOps.setPromoterEligibility(userId, nextStatus, new FormData(form).get("reason"));
        closeModal();
        toast(`推广员资格已${nextStatus === "revoked" ? "撤销" : "恢复"}，状态历史已留存`);
        renderPromoters();
      } catch (error) { toast(error.message); }
    });
  }

  function relationForm(memberId) {
    const options = state.promoterProfiles.filter(item => item.status === "active" && item.userId !== memberId)
      .map(item => `<option value="${esc(item.userId)}">${esc(name(item.userId))} · ${esc(item.userId)}</option>`).join("");
    const backdrop = openModal("纠正推广归属", `<div class="dist-admin-note">此操作会保留旧关系为已纠正，新增关系记录；必须填写业务依据并通过环路校验。</div><form id="relation-form"><div class="form-grid"><label class="field" style="grid-column:1/-1">被推广用户<input value="${esc(name(memberId))} · ${esc(memberId)}" disabled></label><label class="field" style="grid-column:1/-1">新的直接推广员<select name="promoterId" required>${options}</select></label><label class="field" style="grid-column:1/-1">纠正理由<textarea name="reason" rows="3" required></textarea></label></div></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="save-relation">保存关系变更</button>`);
    backdrop.querySelector("[data-action='save-relation']").addEventListener("click", () => {
      const form = backdrop.querySelector("#relation-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      try {
        window.MallOps.correctReferralRelation(memberId, values.get("promoterId"), values.get("reason"));
        closeModal();
        toast("关系已纠正，历史快照保持不变");
        renderRelations();
      } catch (error) { toast(error.message); }
    });
  }

  function commissionRuleForm() {
    const active = state.commissionRuleVersions.find(item => item.status === "active") || { tiers: {} };
    const ids = ["standard", "silver", "gold"];
    const labels = Object.fromEntries(state.distributionTiers.map(item => [item.id, item.name]));
    const rows = ids.map(id => {
      const configured = active.tiers?.[id] || [5];
      const value = Number(Array.isArray(configured) ? configured[0] || 0 : configured || 0);
      return `<div class="dist-admin-inline" style="margin:10px 0"><strong style="width:94px;font-size:10px">${esc(labels[id] || id)}</strong><label class="field">直推佣金 %<input name="${id}_rate" type="number" min="0" max="50" step="0.1" value="${value}" required></label></div>`;
    }).join("");
    const backdrop = openModal("发布佣金规则版本", `<form id="commission-rule-form"><div class="form-grid"><label class="field" style="grid-column:1/-1">规则名称<input name="name" required value="分销政策 ${new Date().toISOString().slice(0, 10)}"></label><label class="field">生效时间<input name="effectiveAt" type="datetime-local" required value="${new Date(Date.now() + 60000).toISOString().slice(0, 16)}"></label><label class="field">适用范围<input value="全场商品" disabled><input type="hidden" name="scope" value="全场商品"></label></div>${rows}<label class="field">规则备注<textarea name="note" rows="2" placeholder="佣金基数默认商品实付净额，不含运费"></textarea></label></form><p class="inline-help" style="margin-top:10px">新版本只影响生效时间之后创建的订单；历史订单佣金快照不可回算。</p>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="save-commission-rule">发布版本</button>`);
    backdrop.querySelector("[data-action='save-commission-rule']").addEventListener("click", () => {
      const form = backdrop.querySelector("#commission-rule-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const tiers = Object.fromEntries(ids.map(id => [id, [Number(values.get(`${id}_rate`))]]));
      try {
        window.MallOps.saveCommissionRule({ name: values.get("name"), effectiveAt: values.get("effectiveAt"), note: values.get("note"), tiers, scope: values.get("scope") });
        closeModal();
        toast("佣金规则版本已保存，历史快照不变");
        renderRules();
      } catch (error) { toast(error.message); }
    });
  }

  function tierRuleForm() {
    const metrics = [["sales", "近90日有效销售额"], ["newMembers", "近90日有效拉新"], ["selfPurchase", "自购金额"]];
    const tiers = [...state.distributionTiers].sort((a, b) => Number(a.sort) - Number(b.sort));
    const fields = tiers.map(tier => {
      const existing = Object.fromEntries((tier.conditions || []).map(condition => [condition.metric, condition]));
      return `<section class="dist-tier-editor"><div class="dist-tier-editor-head"><strong>${esc(tier.name)} · ${esc(tier.id)}</strong><label class="field">等级名称<input name="${esc(tier.id)}_name" required value="${esc(tier.name)}"></label></div>
        <div class="form-grid"><label class="field">排序<input name="${esc(tier.id)}_sort" type="number" min="0" value="${Number(tier.sort || 0)}" required></label>
          <label class="field">条件组合<select name="${esc(tier.id)}_combination"><option value="AND" ${tier.combination !== "OR" ? "selected" : ""}>全部满足（AND）</option><option value="OR" ${tier.combination === "OR" ? "selected" : ""}>任一满足（OR）</option></select></label>
          ${metrics.map(([metric, label]) => `<label class="field">${label}<input name="${esc(tier.id)}_${metric}" type="number" min="0" step="0.01" value="${existing[metric] ? Number(existing[metric].value) : ""}" placeholder="不设条件留空"></label>`).join("")}
          <label class="field">统计周期<input value="${esc(tier.period || "近90日")}" disabled></label>
          <label class="field">等级状态<select name="${esc(tier.id)}_status"><option value="active" ${tier.status !== "inactive" ? "selected" : ""}>启用</option><option value="inactive" ${tier.status === "inactive" ? "selected" : ""}>停用</option></select></label>
        </div></section>`;
    }).join("");
    const backdrop = openModal("编辑推广员等级规则", `<form id="tier-rule-form"><div class="dist-admin-note">每个等级可配置销售额、拉新人数、自购金额条件及 AND / OR 组合。普通推广员基础等级必须保留。</div>${fields}<label class="field">发布说明<textarea name="note" rows="2" placeholder="记录调整原因与运营口径"></textarea></label></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="save-tier-rules">发布等级规则版本</button>`);
    backdrop.querySelector("[data-action='save-tier-rules']").addEventListener("click", () => {
      const form = backdrop.querySelector("#tier-rule-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const next = tiers.map(tier => ({
        ...tier,
        name: String(values.get(`${tier.id}_name`) || "").trim(),
        sort: Number(values.get(`${tier.id}_sort`)),
        combination: String(values.get(`${tier.id}_combination`)),
        status: String(values.get(`${tier.id}_status`)),
        conditions: metrics.flatMap(([metric]) => {
          const value = String(values.get(`${tier.id}_${metric}`) || "").trim();
          return value === "" ? [] : [{ metric, op: ">=", value: Number(value) }];
        })
      }));
      try {
        window.MallOps.saveDistributionTierRules(next, { note: String(values.get("note") || "") });
        closeModal();
        toast("等级规则新版本已发布");
        renderRules();
      } catch (error) { toast(error.message); }
    });
  }

  function distributionSettingsForm() {
    const settings = state.distributionSettings;
    const backdrop = openModal("分销结算参数", `<form id="distribution-settings-form"><div class="form-grid">
      <label class="field">佣金归因层级<input value="直接推荐" disabled></label><label class="field">收货后冻结天数<input name="freezeDays" type="number" min="0" max="90" value="${Number(settings.freezeDays)}" required></label>
      <label class="field">最低提现金额<input name="minimumPayout" type="number" min="1" step="0.01" value="${Number(settings.minimumPayout)}" required></label><label class="field">单笔提现上限<input name="singlePayoutLimit" type="number" min="1" value="${Number(settings.singlePayoutLimit)}" required></label>
      <label class="field">日累计限额<input name="dailyPayoutLimit" type="number" min="1" value="${Number(settings.dailyPayoutLimit)}" required></label><label class="field">自动审核上限<input name="autoReviewThreshold" type="number" min="0" value="${Number(settings.autoReviewThreshold)}" required></label>
    </div></form><p class="dist-admin-note" style="margin-top:12px">当前为演示配置。上线前需运营、财务、法务确认并核验微信商户出款能力、实名要求和银行付款凭证流程。</p>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="save-distribution-settings">保存演示配置</button>`);
    backdrop.querySelector("[data-action='save-distribution-settings']").addEventListener("click", () => {
      const form = backdrop.querySelector("#distribution-settings-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      try {
        window.MallOps.saveDistributionSettings({
        freezeDays: Number(values.get("freezeDays")),
        minimumPayout: Number(values.get("minimumPayout")),
        singlePayoutLimit: Number(values.get("singlePayoutLimit")),
        dailyPayoutLimit: Number(values.get("dailyPayoutLimit")),
        autoReviewThreshold: Number(values.get("autoReviewThreshold"))
        });
        closeModal();
        toast("参数已更新并写入审计");
        renderRules();
      } catch (error) { toast(error.message); }
    });
  }

  function reviewPayout(id, decision) {
    const item = state.withdrawals.find(row => row.id === id);
    const backdrop = openModal(decision === "approve" ? "审核提现申请" : "拒绝提现申请", `<div class="dist-admin-note">${esc(item?.id)} · ${money(item?.amount)} · ${esc(item?.channelLabel || item?.account || "收款渠道")} ${esc(item?.maskedAccount || "")}</div><form id="payout-review-form"><label class="field">审核理由<textarea name="reason" rows="3" required placeholder="填写审核判断依据"></textarea></label></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="confirm-payout-review">确认${decision === "approve" ? "审核" : "拒绝"}</button>`);
    backdrop.querySelector("[data-action='confirm-payout-review']").addEventListener("click", () => {
      const form = backdrop.querySelector("#payout-review-form");
      if (!form.reportValidity()) return;
      try {
        window.MallOps.reviewWithdrawal(id, decision, new FormData(form).get("reason"));
        closeModal();
        toast(decision === "approve" ? "已批准，仍需发起独立出款" : "已拒绝并释放佣金锁定");
        renderPayouts();
      } catch (error) { toast(error.message); }
    });
  }

  function payoutResultForm(id, outcome) {
    const item = state.withdrawals.find(row => row.id === id);
    const bank = item?.channelType === "bank_transfer";
    const backdrop = openModal(outcome === "succeeded" ? "登记出款成功" : "登记出款失败", `<div class="dist-admin-note">${esc(item?.id)} · ${money(item?.amount)} · ${esc(item?.channelLabel || "")}</div><form id="payout-result-form"><div class="form-grid">
      <label class="field" style="grid-column:1/-1">${bank ? "银行流水号 / 凭证引用" : "通道交易号"}<input name="reference" ${outcome === "succeeded" && bank ? "required" : ""} placeholder="${bank ? "登记财务付款流水或受控凭证引用" : "可选，勿填写敏感凭据"}"></label>
      <label class="field" style="grid-column:1/-1">处理备注<textarea name="note" rows="2" ${outcome === "failed" ? "required" : ""} placeholder="${outcome === "failed" ? "填写明确失败原因；未知结果应保持处理中并先对账" : "补充回执说明"}"></textarea></label>
    </div></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="confirm-payout-result">登记结果</button>`);
    backdrop.querySelector("[data-action='confirm-payout-result']").addEventListener("click", () => {
      const form = backdrop.querySelector("#payout-result-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      try {
        window.MallOps.completePayout(id, outcome, { reference: values.get("reference"), note: values.get("note") });
        closeModal();
        toast(outcome === "succeeded" ? "出款成功已入账" : "已登记失败并释放提现锁定");
        renderPayouts();
      } catch (error) { toast(error.message); }
    });
  }

  function showPromoter(userId) {
    const item = profile(userId);
    const account = window.MallOps.accountSummary(state, userId);
    const chain = window.MallOps.resolveReferralChain(state, userId);
    const ownRelations = state.referralRelations.filter(row => row.promoterId === userId && row.status === "active");
    const orders = state.commissions.filter(row => row.userId === userId);
    const statusHistory = state.promoterStatusHistory.filter(row => row.userId === userId).slice(0, 5).map(row => `<div class="dist-audit-detail">${esc(row.createdAt)} · ${esc(statusNames[row.fromStatus] || row.fromStatus)} → ${esc(statusNames[row.toStatus] || row.toStatus)} · ${esc(row.reason)}</div>`).join("") || `<div class="inline-help">暂无资格变更记录</div>`;
    openModal("推广员档案详情", `<div class="dist-admin-kpi"><div><span>推广员</span><strong>${esc(name(userId))}</strong></div><div><span>等级</span><strong>${esc(item?.tierId || "—")}</strong></div><div><span>资格 / 风险</span><strong>${esc(statusNames[item?.status] || item?.status || "—")} / ${esc(item?.riskStatus || "—")}</strong></div><div><span>直接团队</span><strong>${ownRelations.length} 人</strong></div><div><span>上级链路</span><strong>${chain.map(row => `L${row.level} ${esc(name(row.promoterId))}`).join(" · ") || "无"}</strong></div><div><span>佣金余额</span><strong>可提 ${money(account.available)} · 冻结 ${money(account.frozen)}</strong></div></div><h3 class="dist-admin-subtitle">资格状态历史</h3>${statusHistory}<h3 class="dist-admin-subtitle">最近佣金快照</h3>${table(["订单", "层级", "基数 × 比例", "规则版本", "状态"], orders.slice(0, 5).map(row => `<tr><td>${esc(row.orderId)}</td><td>${Number(row.level || 1)}</td><td>${money(row.basis || 0)} × ${Number(row.rate || 0)}%</td><td>${esc(row.ruleVersion || "legacy")}</td><td>${status(row.status)}</td></tr>`).join(""))}`);
  }

  function showLedgerTrace(id) {
    const entry = state.commissionLedger.find(row => row.id === id);
    const commission = state.commissions.find(row => row.id === entry?.commissionId);
    const order = state.orders.find(row => row.id === (entry?.orderId || commission?.orderId));
    const snapshot = order?.commissionSnapshot?.find(row => row.promoterId === entry?.userId);
    const source = state.shareTokens.find(row => row.id === (snapshot?.shareTokenId || order?.referralSnapshot?.sourceTokenId));
    openModal("佣金解释链路", `<div class="rule-list"><div>流水：${esc(entry?.id || "—")} · ${esc(entry?.type || "")}</div><div>推广员：${esc(name(entry?.userId))} · ${esc(entry?.userId || "")}</div><div>订单：${esc(order?.id || entry?.orderId || "—")} · ${esc(order?.status || "—")}</div><div>绑定关系：${esc(snapshot?.relationId || order?.referralSnapshot?.promoterIds?.join(" → ") || "无快照")}</div><div>层级 / 费率：${Number(snapshot?.level || commission?.level || 0)} 级 · ${Number(snapshot?.rate || commission?.rate || 0)}%</div><div>计佣基数：${money(snapshot?.basis || commission?.basis || 0)}（商品净额，不含运费）</div><div>规则版本：${esc(snapshot?.ruleVersion || commission?.ruleVersion || entry?.ruleVersion || "legacy")}</div><div>分享来源：${esc(source?.channel || order?.referralSnapshot?.channel || "—")} · ${esc(source?.id || "—")}</div><div>退款冲减：${money(commission?.refundedAmount || 0)} · 已提现后异常：${money(commission?.recoverableAmount || 0)}</div><div>流水说明：${esc(entry?.note || "—")}</div></div>`);
  }

  root.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === "admin-page") {
      const listId = button.dataset.list;
      listPages[listId] = Number(button.dataset.page) || 1;
      renderList(listId);
      return;
    }
    try {
      if (action === "review-application") applicationReview(id, button.dataset.decision);
      else if (action === "application-detail") {
        const item = state.promoterApplications.find(row => row.id === id);
        openModal("申请审核记录", `<div class="rule-list"><div>申请人：${esc(name(item?.userId))} · ${esc(item?.userId || "")}</div><div>状态：${esc(statusNames[item?.status] || item?.status || "")}</div><div>申请说明：${esc(item?.motivation || "—")}</div><div>审核人：${esc(item?.reviewer || "—")}</div><div>审核理由：${esc(item?.reviewNote || "—")}</div><div>审核时间：${esc(item?.reviewedAt || "—")}</div></div>`);
      } else if (action === "promoter-detail") showPromoter(id);
      else if (action === "promoter-eligibility") promoterEligibilityForm(id, button.dataset.value);
      else if (action === "promoter-risk") promoterRiskForm(id, button.dataset.value);
      else if (action === "correct-relation") relationForm(id);
      else if (action === "relation-chain") {
        const chain = window.MallOps.resolveReferralChain(state, id);
        const relation = state.referralRelations.find(row => row.memberId === id && row.status === "active");
        openModal("推广关系链路", `<div class="rule-list"><div>被推广用户：${esc(name(id))} · ${esc(id)}</div><div>直接推广员：${esc(name(relation?.promoterId))} · ${esc(relation?.promoterId || "无")}</div>${chain.map(row => `<div>第 ${row.level} 级上级：${esc(name(row.promoterId))} · ${esc(row.relationId)}</div>`).join("")}<div>归因规则：首次有效绑定；历史订单关系快照不随纠正改写。</div></div>`);
      } else if (action === "edit-commission-rules") commissionRuleForm();
      else if (action === "edit-tier-rules") tierRuleForm();
      else if (action === "edit-distribution-settings") distributionSettingsForm();
      else if (action === "tier-evaluate") {
        const results = window.MallOps.evaluatePromoterTiers();
        toast(`等级评估完成：${results.length} 位推广员，结果已记录`);
        renderRules();
      } else if (action === "rule-detail") {
        const rule = state.commissionRuleVersions.find(row => row.id === id);
        openModal("佣金规则快照", `<div class="rule-list"><div>${esc(rule?.name || "")} · ${esc(rule?.id || "")}</div><div>生效时间：${esc(rule?.effectiveAt || "—")}</div><div>适用范围：${esc(rule?.scope || "全场商品")}</div>${Object.entries(rule?.tiers || {}).map(([tier, rates]) => `<div>${esc(tier)}：${rates.map((rate, index) => `L${index + 1} ${rate}%`).join(" · ")}</div>`).join("")}<div>备注：${esc(rule?.note || "—")}</div></div>`);
      } else if (action === "ledger-trace") showLedgerTrace(id);
      else if (action === "release-matured") {
        const released = window.MallOps.releaseMaturedCommissions();
        toast(`到期释放任务完成：${released} 笔佣金`);
        renderLedger();
      } else if (action === "payout-review") reviewPayout(id, button.dataset.decision);
      else if (action === "start-payout") {
        window.MallOps.startPayout(id);
        toast("已创建出款尝试；请在通道回执后登记结果");
        renderPayouts();
      } else if (action === "payout-result") payoutResultForm(id, button.dataset.outcome);
      else if (action === "retry-payout") {
        window.MallOps.retryPayout(id);
        toast("已重新锁定可用佣金，提现单回到待出款");
        renderPayouts();
      } else if (action === "payout-detail") {
        const item = state.withdrawals.find(row => row.id === id);
        const attempts = state.payoutAttempts.filter(row => row.withdrawalId === id);
        openModal("提现单详情", `<div class="rule-list"><div>单号：${esc(item?.id || "")}</div><div>推广员：${esc(name(item?.userId))}</div><div>金额：${money(item?.amount)}</div><div>收款渠道：${esc(item?.channelLabel || "")} · ${esc(item?.maskedAccount || "")}</div><div>状态：${esc(statusNames[item?.status] || item?.status || "")}</div><div>审核说明：${esc(item?.reviewNote || "—")}</div>${attempts.map(row => `<div>尝试 ${esc(row.id)}：${esc(statusNames[row.status] || row.status)} · ${esc(row.providerRef || "无通道流水")}</div>`).join("")}</div>`);
      } else if (action === "risk-resolve") {
        const decision = button.dataset.decision;
        const item = state.distributionRiskCases.find(row => row.id === id);
        const backdrop = openModal(decision === "frozen" ? "冻结推广资格" : "风险核验通过", `<div class="dist-admin-note">${esc(item?.id)} · ${esc(item?.summary || "")}</div><form id="risk-case-form"><label class="field">复核结论与依据<textarea name="reason" rows="3" required></textarea></label></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="confirm-risk-case">确认处置</button>`);
        backdrop.querySelector("[data-action='confirm-risk-case']").addEventListener("click", () => {
          const form = backdrop.querySelector("#risk-case-form");
          if (!form.reportValidity()) return;
          try {
            window.MallOps.setPromoterRisk(item.userId, decision, new FormData(form).get("reason"));
            closeModal();
            toast(decision === "frozen" ? "已冻结并关闭风险工单" : "已恢复资格并关闭风险工单");
            renderRisk();
          } catch (error) { toast(error.message); }
        });
      } else if (action === "risk-detail") {
        const item = state.distributionRiskCases.find(row => row.id === id);
        openModal("风险处置记录", `<div class="rule-list"><div>工单：${esc(item?.id || "")}</div><div>用户：${esc(name(item?.userId))} · ${esc(item?.userId || "")}</div><div>异常说明：${esc(item?.summary || "")}</div><div>处置结果：${esc(item?.resolution || "—")}</div><div>更新时间：${esc(item?.resolvedAt || item?.createdAt || "")}</div></div>`);
      } else if (action === "save-commission-rule" || action === "save-distribution-settings" || action === "save-tier-rules" || action === "confirm-application-review" || action === "confirm-risk" || action === "save-relation" || action === "confirm-payout-review" || action === "confirm-payout-result" || action === "confirm-risk-case") return;
    } catch (error) {
      toast(error.message || "操作失败");
    }
  });

  function updateListFilter(event) {
    const control = event.target.closest("[data-admin-filter]");
    if (!control) return;
    const { list: listId, filterField } = control.dataset;
    filtersFor(listId)[filterField] = control.value;
    listPages[listId] = 1;
    const cursor = filterField === "query" ? control.selectionStart : null;
    renderList(listId);
    const replacement = [...root.querySelectorAll("[data-admin-filter]")].find(item =>
      item.dataset.list === listId && item.dataset.filterField === filterField
    );
    replacement?.focus();
    if (cursor !== null && typeof replacement?.setSelectionRange === "function") {
      replacement.setSelectionRange(cursor, cursor);
    }
  }
  root.addEventListener("input", event => {
    if (event.target.matches('input[data-admin-filter]')) updateListFilter(event);
  });
  root.addEventListener("change", event => {
    if (event.target.matches('select[data-admin-filter]')) updateListFilter(event);
  });

  window.addEventListener("storage", event => { if (event.key === window.MallData.KEY) render(); });
  function render() {
    state = read();
    if (activeTab === "applications") renderApplications();
    else if (activeTab === "promoters") renderPromoters();
    else if (activeTab === "relations") renderRelations();
    else if (activeTab === "rules") renderRules();
    else if (activeTab === "ledger") renderLedger();
    else if (activeTab === "payouts") renderPayouts();
    else if (activeTab === "risk") renderRisk();
    else if (activeTab === "audit") renderAudit();
    else renderOverview();
  }
  render();
})();
