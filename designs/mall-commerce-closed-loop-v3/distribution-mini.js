(() => {
  const { read } = window.MallData;
  const { escapeHtml: esc, money, toast, openModal, closeModal, tabbar } = window.MallUI;
  const root = document.getElementById("root");
  if (!root) return;

  const labels = {
    pending: "待确认收货",
    frozen: "冻结中",
    available: "可提现",
    settled: "可提现",
    withdrawn: "已提现",
    cancelled: "已冲销",
    recoverable: "待人工处理",
    submitted: "已提交",
    reviewing: "人工审核",
    approved: "待出款",
    paying: "出款处理中",
    succeeded: "已到账",
    failed: "出款失败",
    canceled: "已撤销",
    rejected: "审核拒绝"
  };
  let state = read();
  let activeTab = new URLSearchParams(location.search).get("tab") || "overview";

  const profile = () => state.promoterProfiles?.find(item => item.userId === state.user.id);
  const isPromoter = () => Boolean(profile()?.status === "active" && state.user.distributor);
  const commissions = () => state.commissions.filter(item => item.userId === state.user.id);
  const summary = () => window.MallOps.accountSummary(state, state.user.id);
  const userName = id => state.users.find(item => item.id === id)?.name || id;
  const tag = status => `<span class="dist-status ${["frozen", "reviewing", "failed", "recoverable"].includes(status) ? "warn" : ["available", "succeeded", "active"].includes(status) ? "good" : ""}">${esc(labels[status] || status)}</span>`;

  function shell(title, content) {
    root.innerHTML = `<div class="phone-stage"><div class="phone"><div class="mini-shell">
      <header class="mini-head"><div class="mini-head-row"><a href="mini-profile.html" aria-label="返回" style="color:#666">${window.MallUI.icon("chevron")}</a><span class="mini-title small">${title}</span><a href="index.html" class="head-link">总览</a></div></header>
      <main class="mini-main"><div class="mini-content dist-mini-content">${content}</div></main>${tabbar("profile")}
    </div></div></div>`;
    root.querySelector(".mini-head-row")?.insertAdjacentHTML("beforeend", window.MallUI.messageEntry());
  }

  function tabs() {
    const options = [["overview", "总览"], ["share", "推广"], ["team", "团队"], ["ledger", "佣金"], ["payout", "提现"], ["qualification", "资格"]];
    return `<nav class="dist-mini-tabs" aria-label="分销中心导航">${options.map(([id, label]) => `<button class="${activeTab === id ? "active" : ""}" data-action="tab" data-value="${id}">${label}</button>`).join("")}</nav>`;
  }

  function teamMembers() {
    const layers = [];
    let parents = [state.user.id];
    for (let level = 1; level <= 3; level += 1) {
      const rows = state.referralRelations.filter(row => parents.includes(row.promoterId) && row.status === "active");
      layers.push(rows.map(row => ({ ...row, level })));
      parents = rows.map(row => row.memberId);
    }
    return layers.flat();
  }

  function renderOverview() {
    state = read();
    if (!isPromoter()) return renderQualification();
    const account = summary();
    const myCommissions = commissions();
    const members = teamMembers();
    const tokens = state.shareTokens.filter(item => item.promoterId === state.user.id && item.status === "active");
    const recent = myCommissions.slice(0, 3).map(item => `<div class="dist-mini-row"><div><strong>订单 ${esc(item.orderId)}</strong><small>L${Number(item.level || 1)} · ${Number(item.rate || 0)}% · ${esc(item.ruleVersion || "历史规则")}</small></div><div class="dist-mini-right">${tag(item.status)}<strong>${money(item.amount)}</strong></div></div>`).join("");
    shell("分销中心", `<div class="dist-mini-hero">
        <div class="dist-mini-eyebrow">BRAND PARTNER · ${esc(profile()?.tierId || "standard").toUpperCase()}</div>
        <div class="dist-mini-name">${esc(state.user.name)}<span>合作推广员</span></div>
        <div class="dist-mini-code">推广编号　${esc(profile()?.referralCode || state.user.referralCode || "待生成")}</div>
        <div class="dist-mini-money-label">可提现佣金</div><div class="dist-mini-balance">${money(account.available)}</div>
        <button class="dist-mini-cta" data-action="tab" data-value="payout">查看提现账户 <span>›</span></button>
      </div>
      ${tabs()}
      <div class="dist-mini-kpis"><article><span>待确认</span><strong>${money(account.pending)}</strong></article><article><span>冻结中</span><strong>${money(account.frozen)}</strong></article><article><span>提现中</span><strong>${money(account.withdrawing)}</strong></article></div>
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>推广概览</h2><span>最多三级 · 首次绑定</span></div>
        <div class="dist-mini-overview"><div><strong>${members.length}</strong><span>团队成员</span></div><div><strong>${tokens.length}</strong><span>有效分享码</span></div><div><strong>${myCommissions.length}</strong><span>佣金记录</span></div></div>
        <button class="dist-mini-wide" data-action="tab" data-value="share">生成商品分享码 <span>→</span></button>
      </section>
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>最近佣金</h2><button data-action="tab" data-value="ledger">全部账单 ›</button></div>${recent || `<div class="dist-mini-empty">确认收货后，佣金会进入冻结期。</div>`}</section>
      <p class="dist-mini-note">佣金是推广服务奖励记录，不是储值账户，不支持充值、转账或购物消费。</p>`);
  }

  function renderShare() {
    state = read();
    const promoter = isPromoter();
    const tokens = state.shareTokens.filter(item => item.promoterId === state.user.id).slice(0, 8);
    const products = state.products.filter(item => item.status === "on");
    const rows = tokens.map(token => {
      const product = state.products.find(item => item.id === token.productId);
      const hits = state.shareEvents.filter(event => event.tokenId === token.id);
      return `<article class="dist-token">
        <div class="dist-token-top"><div><strong>${product ? esc(product.name) : "商城首页推广"}</strong><small>${esc(token.channel)} · 版本 ${Number(token.version || 1)}</small></div>${tag(token.status)}</div>
        <div class="dist-token-code">${esc(token.token)}</div>
        <div class="dist-token-foot"><span>${hits.length} 次触达 · 到期 ${esc(token.expiresAt || "长期有效")}</span>
          <div><button data-action="copy-token" data-token="${esc(token.token)}">复制链接</button>${token.status === "active" ? `<button class="danger" data-action="revoke-token" data-id="${esc(token.id)}">撤销</button>` : ""}</div>
        </div>
      </article>`;
    }).join("");
    shell("推广分享", `${tabs()}
      <section class="dist-mini-section dist-share-intro"><div class="dist-mini-eyebrow">${promoter ? "ATTRIBUTION LINK" : "SOURCE ANALYTICS"}</div><h2>${promoter ? "分享有来源，佣金可追溯" : "分享链接，查看访问来源"}</h2><p>${promoter ? "有效推广员分享码可建立首次推广关系；普通用户分享码只统计触达，不产生佣金归属。" : "普通用户分享仅用于来源分析，不建立推广关系、不产生佣金。申请并审核通过后才可获得推广归因资格。"}</p>
        <button class="primary-btn" data-action="new-token">${promoter ? "生成推广码" : "生成分析分享码"}</button>
      </section>
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>生成商品分享</h2><span>好友 / 朋友圈 / 海报</span></div>
        <div class="dist-share-product-picker"><select id="share-product"><option value="">商城首页</option>${products.map(item => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("")}</select>
        <select id="share-channel"><option value="wechat_friend">微信好友</option><option value="wechat_moments">朋友圈</option><option value="poster">分享海报</option></select></div>
        <button class="dist-mini-wide" data-action="create-product-token">${promoter ? "创建带归因分享码" : "创建来源分析链接"} <span>→</span></button>
      </section>
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>分享码</h2><span>${tokens.length} 个</span></div>${rows || `<div class="dist-mini-empty">还没有分享码，创建一个开始推广。</div>`}</section>
      <div class="dist-mini-callout">分享码只携带随机来源标识，不把用户 ID 当作佣金凭证。分享与访问记录仅保存归因所需的最少信息${promoter ? "；佣金归属以首次有效推广员绑定为准。" : "；普通分享不建立推广关系。"} </div>`);
  }

  function renderTeam() {
    state = read();
    if (!isPromoter()) return renderQualification();
    const members = teamMembers();
    const levels = [1, 2, 3].map(level => {
      const rows = members.filter(item => item.level === level);
      const names = rows.map(row => {
        const user = state.users.find(item => item.id === row.memberId);
        const promoter = state.promoterProfiles.find(profileRow => profileRow.userId === row.memberId);
        return `<div class="dist-team-row"><span class="dist-team-avatar">${esc((user?.name || row.memberId).slice(0, 1))}</span><div><strong>${esc(user?.name || row.memberId)}</strong><small>${esc(row.memberId)} · ${promoter?.status === "active" ? "合作推广员" : "商城用户"}</small></div><span>${esc(row.boundAt || "")}</span></div>`;
      }).join("");
      return `<section class="dist-mini-section"><div class="dist-mini-section-head"><h2>第 ${level} 级</h2><span>${rows.length} 人</span></div>${names || `<div class="dist-mini-empty">暂无第 ${level} 级团队成员</div>`}</section>`;
    }).join("");
    shell("我的团队", `${tabs()}
      <div class="dist-team-summary"><strong>${members.length}</strong><span>有效团队成员</span><small>关系最多追溯三级；资格失效的推广员不继续产生佣金。</small></div>
      ${levels}
      <div class="dist-mini-callout">归属按首次有效绑定确定。推广关系更正仅由有权限的运营人员处理，需填写原因并记录前后关系及审计信息。</div>`);
  }

  function renderLedger() {
    state = read();
    if (!isPromoter()) return renderQualification();
    const account = summary();
    const rows = commissions().map(item => {
      const order = state.orders.find(row => row.id === item.orderId);
      return `<article class="dist-ledger-row"><div class="dist-ledger-icon">${Number(item.level || 1)}级</div><div class="dist-ledger-copy"><strong>${esc(item.orderId)}</strong><small>${esc(order?.items?.[0]?.name || "推广订单")} · 基数 ${money(item.basis || 0)} × ${Number(item.rate || 0)}%</small><small>规则 ${esc(item.ruleVersion || "legacy")} · ${esc(item.createdAt || "")}</small></div><div class="dist-ledger-value">${money(item.amount)}${tag(item.status)}</div></article>`;
    }).join("");
    const ledger = state.commissionLedger.filter(item => item.userId === state.user.id).slice(0, 10).map(entry =>
      `<div class="dist-ledger-event"><span>${esc(entry.note || entry.type)}<small>${esc(entry.createdAt)} · ${esc(entry.orderId || entry.withdrawalId || "")}</small></span><strong class="${entry.direction === "debit" ? "minus" : ""}">${entry.direction === "memo" ? "备忘" : entry.direction === "debit" ? "−" : "+"}${money(entry.amount)}</strong></div>`
    ).join("");
    shell("佣金账单", `${tabs()}
      <div class="dist-account-strip"><div><span>可提现</span><strong>${money(account.available)}</strong></div><div><span>冻结中</span><strong>${money(account.frozen)}</strong></div><div><span>待确认</span><strong>${money(account.pending)}</strong></div></div>
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>佣金订单快照</h2><span>${commissions().length} 笔</span></div>${rows || `<div class="dist-mini-empty">暂无佣金订单</div>`}</section>
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>账本流水</h2><span>追加记录</span></div>${ledger || `<div class="dist-mini-empty">暂无资金流水</div>`}</section>
      <div class="dist-mini-callout">佣金基数按订单商品实付净额扣除退款，不含运费；下单时固定推广层级、规则版本和费率。历史快照不会随新规则改写。</div>`);
  }

  function renderPayout() {
    state = read();
    if (!isPromoter()) return renderQualification();
    const account = summary();
    const settings = state.distributionSettings;
    const channels = state.payoutChannels.filter(item => item.userId === state.user.id);
    const withdrawalRows = state.withdrawals.filter(item => item.userId === state.user.id).map(item => {
      const actions = ["submitted", "reviewing", "approved"].includes(item.status) ? `<button data-action="cancel-withdrawal" data-id="${esc(item.id)}">撤销</button>` : "";
      return `<article class="dist-payout-row"><div><strong>${money(item.amount)}</strong><small>${esc(item.channelLabel || item.account || "收款渠道")} · ${esc(item.maskedAccount || "")}</small><small>${esc(item.id)} · ${esc(item.createdAt || "")}</small></div><div>${tag(item.status)}${actions}</div></article>`;
    }).join("");
    const channelRows = channels.map(channel => `<div class="dist-channel"><span class="dist-channel-icon">${channel.type === "wechat_merchant" ? "微" : "银"}</span><div><strong>${esc(channel.label)}</strong><small>${esc(channel.maskedAccount)} · ${channel.verified ? "已验证" : "待验证"}</small></div><span class="dist-channel-check">${channel.status === "active" ? "可用" : "已停用"}</span></div>`).join("");
    shell("提现管理", `${tabs()}
      <div class="dist-payout-balance"><span>可申请提现</span><strong>${money(account.available)}</strong><small>最低 ${money(settings.minimumPayout)} · 单笔上限 ${money(settings.singlePayoutLimit)} · 冻结期 ${settings.freezeDays} 天</small></div>
      <button class="primary-btn dist-payout-action" data-action="withdraw" ${account.available < Number(settings.minimumPayout) ? "disabled" : ""}>申请提现</button>
      ${account.available < Number(settings.minimumPayout) ? `<p class="dist-mini-hint">可提现余额达到最低申请金额后即可提交；冻结佣金和待结算佣金不可提前提现。</p>` : ""}
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>已验证收款渠道</h2><span>敏感信息脱敏</span></div>${channelRows || `<div class="dist-mini-empty">暂无已验证收款渠道</div>`}</section>
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>申请记录</h2><span>提交 → 审核 → 出款</span></div>${withdrawalRows || `<div class="dist-mini-empty">暂无提现记录</div>`}</section>
      <div class="dist-mini-callout">微信商户出款取决于商户资质与产品开通情况；人工银行转账须登记财务凭证。接口超时或结果未知时保持处理中并对账，不直接重复付款。</div>`);
  }

  function renderQualification() {
    state = read();
    const application = state.promoterApplications.find(item => item.userId === state.user.id);
    const active = isPromoter();
    shell("推广员资格", `${tabs()}
      <section class="dist-qual-card"><div class="dist-qual-mark">M</div><h2>${active ? "你已成为合作推广员" : application?.status === "pending" ? "申请审核中" : application?.status === "rejected" ? "申请未通过" : "申请成为合作推广员"}</h2>
        <p>${active ? `推广编号 ${esc(profile()?.referralCode || "")} · 等级 ${esc(profile()?.tierId || "standard")}` : application?.status === "pending" ? `已于 ${esc(application.createdAt)} 提交。审核结果将在此更新。` : application?.status === "rejected" ? `审核说明：${esc(application.reviewNote || "请查看后台审核意见")}` : "完成申请与审核后，系统将签发推广身份和分享码。推广关系最多三级，按首次有效绑定归因。"} </p>
        ${active ? `<button class="primary-btn" data-action="tab" data-value="overview">进入推广中心</button>` : application?.status === "pending" ? `<span class="dist-pending-pill">待审核</span>` : `<button class="primary-btn" data-action="apply">提交推广申请</button>`}
      </section>
      <section class="dist-mini-section"><div class="dist-mini-section-head"><h2>合作规则摘要</h2><span>上线前待确认</span></div>
        <div class="dist-rule-mini"><span>推广关系</span><strong>最多三级 · 首次绑定</strong></div>
        <div class="dist-rule-mini"><span>佣金核算</span><strong>订单商品实付净额 · 不含运费</strong></div>
        <div class="dist-rule-mini"><span>佣金结算</span><strong>确认收货后冻结，再释放可提现</strong></div>
        <div class="dist-rule-mini"><span>收款方式</span><strong>微信商户 / 人工银行转账</strong></div>
      </section>
      <div class="dist-mini-callout">推广资质、等级权益及推广层级需经运营、财务和法务审核；页面展示的是演示规则，不构成正式费率或收益承诺。</div>`);
  }

  function withdrawalForm() {
    const settings = state.distributionSettings;
    const channels = state.payoutChannels.filter(item => item.userId === state.user.id && item.verified && item.status === "active" && settings.payoutChannels.includes(item.type));
    if (!channels.length) return toast("请先添加并验证收款渠道");
    const max = summary().available;
    const backdrop = openModal("申请提现", `<form id="dist-withdraw-form"><div class="dist-form-balance">可提现 <strong>${money(max)}</strong></div>
      <div class="form-grid">
        <label class="field" style="grid-column:1/-1">收款渠道<select name="channelId" required>${channels.map(item => `<option value="${esc(item.id)}">${esc(item.label)} · ${esc(item.maskedAccount)}</option>`).join("")}</select></label>
        <label class="field" style="grid-column:1/-1">申请金额<input name="amount" type="number" min="${Number(settings.minimumPayout)}" max="${max}" step="0.01" required></label>
      </div><p class="inline-help" style="margin-top:12px">超过 ${money(settings.autoReviewThreshold)} 或命中风险规则将进入人工审核；审核通过后仍需独立完成出款。</p>
    </form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-withdrawal">提交申请</button>`);
    backdrop.querySelector("[data-action='submit-withdrawal']").addEventListener("click", () => {
      const form = backdrop.querySelector("#dist-withdraw-form");
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      try {
        const record = window.MallOps.createWithdrawal(Number(values.get("amount")), String(values.get("channelId")));
        closeModal();
        toast(record.status === "approved" ? "风控校验通过，已锁定佣金并进入待出款" : "申请已提交，佣金已锁定");
        activeTab = "payout";
        renderPayout();
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
      if (action === "tab") {
        activeTab = control.dataset.value;
        history.replaceState(null, "", `mini-distribution.html?tab=${encodeURIComponent(activeTab)}`);
        render();
      } else if (action === "new-token" || action === "create-product-token") {
        const productId = action === "new-token" ? "" : root.querySelector("#share-product")?.value || "";
        const channel = action === "new-token" ? "wechat_friend" : root.querySelector("#share-channel")?.value || "wechat_friend";
        window.MallOps.createShareToken({ productId, channel });
        toast(isPromoter() ? "已生成签发推广来源码" : "已生成来源分析链接");
        renderShare();
      } else if (action === "copy-token") {
        const url = `${location.origin}${location.pathname.replace("mini-distribution.html", "mini-home.html")}?share=${encodeURIComponent(control.dataset.token)}`;
        if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => toast("推广链接已复制")).catch(() => toast(url));
        else toast(url);
      } else if (action === "revoke-token") {
        window.MallOps.revokeShareToken(id);
        toast("分享码已撤销，历史订单归因不受影响");
        renderShare();
      } else if (action === "withdraw") withdrawalForm();
      else if (action === "submit-withdrawal") return;
      else if (action === "cancel-withdrawal") {
        window.MallOps.cancelWithdrawal(id);
        toast("申请已撤销，锁定金额已释放");
        renderPayout();
      } else if (action === "apply") {
        const backdrop = openModal("推广员申请", `<form id="dist-apply-form"><label class="field">申请说明<textarea name="motivation" rows="4" required minlength="10" placeholder="简述你的推广经验、内容渠道和合作计划"></textarea></label><p class="inline-help" style="margin-top:10px">请勿提交身份证、银行卡号等敏感信息。</p></form>`, `<button class="secondary-btn" data-modal-close>取消</button><button class="primary-btn small" data-action="submit-application">提交申请</button>`);
        backdrop.querySelector("[data-action='submit-application']").addEventListener("click", () => {
          const form = backdrop.querySelector("#dist-apply-form");
          if (!form.reportValidity()) return;
          try {
            window.MallOps.submitPromoterApplication(new FormData(form).get("motivation"));
            closeModal();
            toast("申请已提交，可在本页查看审核状态");
            activeTab = "qualification";
            renderQualification();
          } catch (error) {
            toast(error.message);
          }
        });
      }
    } catch (error) {
      toast(error.message || "操作失败");
    }
  });

  function render() {
    if (activeTab === "share") renderShare();
    else if (activeTab === "team") renderTeam();
    else if (activeTab === "ledger") renderLedger();
    else if (activeTab === "payout") renderPayout();
    else if (activeTab === "qualification") renderQualification();
    else renderOverview();
  }

  window.addEventListener("mall:data-updated", () => {
    state = read();
    render();
  });
  window.addEventListener("storage", event => {
    if (event.key === window.MallData.KEY) render();
  });
  render();
})();
