(() => {
  const { read, write } = window.MallData;
  const nowText = () => new Date().toLocaleString("zh-CN", { hour12: false });
  const uid = prefix => `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
  const cents = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

  function findOrder(state, id) {
    return state.orders.find(order => order.id === id);
  }

  function findSku(product, skuId = "") {
    if (!product?.skus?.length) return null;
    return skuId ? product.skus.find(item => item.id === skuId) || null : product.skus[0];
  }

  function syncProductStock(product) {
    if (product?.skus?.length) product.stock = product.skus.reduce((sum, sku) => sum + Number(sku.stock || 0), 0);
  }

  function currentTier(state) {
    const points = Number(state.user?.points ?? state.points ?? 0);
    return [...state.tiers].sort((a, b) => a.points - b.points).filter(tier => points >= tier.points).at(-1) || state.tiers[0];
  }

  function syncUserTier(state) {
    const user = state.users.find(item => item.id === state.user.id);
    if (user) user.tier = currentTier(state)?.name || user.tier;
  }

  function ensureDistribution(state) {
    state.promoterApplications ||= [];
    state.promoterProfiles ||= [];
    state.promoterStatusHistory ||= [];
    state.referralRelations ||= [];
    state.shareTokens ||= [];
    state.shareEvents ||= [];
    state.distributionTiers ||= [];
    state.tierRuleVersions ||= [];
    state.commissionRuleVersions ||= [];
    state.commissionLedger ||= [];
    state.payoutChannels ||= [];
    state.payoutAttempts ||= [];
    state.distributionRiskCases ||= [];
    state.tierEvaluations ||= [];
    state.distributionAudit ||= [];
    state.distributionSettings ||= {
      maxLevels: 3,
      freezeDays: 7,
      minimumPayout: Number(state.settings?.minimumWithdrawal || 100),
      singlePayoutLimit: 5000,
      dailyPayoutLimit: 10000,
      autoReviewThreshold: 300,
      highRiskManualReview: true,
      payoutChannels: ["wechat_merchant", "bank_transfer"]
    };
    state.commissions ||= [];
    state.withdrawals ||= [];
    if (!Number.isFinite(Number(state.ledgerSequence))) {
      const chronological = [...state.commissionLedger].sort((a, b) => (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0));
      chronological.forEach((entry, index) => { entry.sequence ??= index + 1; });
      state.ledgerSequence = chronological.length;
    }
    return state;
  }

  function addAudit(state, action, targetId, reason, actor = "当前操作员", before = null, after = null) {
    ensureDistribution(state);
    state.distributionAudit.unshift({
      id: uid("DA"),
      actor,
      action,
      targetId,
      reason: String(reason || "").trim(),
      before,
      after,
      createdAt: nowText()
    });
  }

  function appendLedger(state, entry) {
    ensureDistribution(state);
    if (entry.idempotencyKey && state.commissionLedger.some(item => item.idempotencyKey === entry.idempotencyKey)) return null;
    state.ledgerSequence = Number(state.ledgerSequence || 0) + 1;
    const row = { id: uid("CL"), createdAt: nowText(), ...entry, sequence: state.ledgerSequence };
    state.commissionLedger.unshift(row);
    return row;
  }

  function appendShareEvent(state, tokenOrId, eventType, visitorKey = "", orderId = "") {
    ensureDistribution(state);
    const token = state.shareTokens.find(item => item.id === tokenOrId || item.token === tokenOrId);
    if (!token || token.status !== "active" || (token.expiresAt && Date.parse(token.expiresAt) < Date.now())
      || !["landing_view", "product_view", "order_created", "order_paid"].includes(eventType)) return null;
    const event = {
      id: uid("SE"),
      tokenId: token.id,
      promoterId: token.promoterId,
      productId: token.productId || "",
      channel: token.channel || "unknown",
      event: eventType,
      visitorKey: String(visitorKey || "").slice(0, 48),
      orderId,
      createdAt: nowText()
    };
    state.shareEvents.unshift(event);
    return event;
  }

  function activePromoter(state, userId) {
    const user = state.users.find(item => item.id === userId);
    const profile = state.promoterProfiles.find(item => item.userId === userId);
    return Boolean(user && user.status === "active" && user.distributor && profile?.status === "active" && profile.riskStatus !== "frozen");
  }

  function resolveReferralChain(state, memberId) {
    ensureDistribution(state);
    const chain = [];
    const seen = new Set([memberId]);
    let currentMemberId = memberId;
    const maxLevels = Math.min(3, Number(state.distributionSettings.maxLevels || 3));
    for (let level = 1; level <= maxLevels; level += 1) {
      const relation = state.referralRelations.find(item => item.memberId === currentMemberId && item.status === "active");
      if (!relation || seen.has(relation.promoterId) || !activePromoter(state, relation.promoterId)) break;
      seen.add(relation.promoterId);
      chain.push({ promoterId: relation.promoterId, relationId: relation.id, level });
      currentMemberId = relation.promoterId;
    }
    return chain;
  }

  function activeCommissionRule(state, at = Date.now()) {
    return state.commissionRuleVersions
      .filter(item => ["active", "scheduled"].includes(item.status) && (!item.effectiveAt || Date.parse(item.effectiveAt) <= at))
      .sort((a, b) => (Date.parse(b.effectiveAt || "") || 0) - (Date.parse(a.effectiveAt || "") || 0))[0]
      || state.commissionRuleVersions.find(item => item.status === "active")
      || state.commissionRuleVersions[0];
  }

  function resolveShareToken(state, tokenOrId, memberId, { bind = true, channel } = {}) {
    ensureDistribution(state);
    const token = state.shareTokens.find(item => item.id === tokenOrId || item.token === tokenOrId);
    const owner = state.users.find(item => item.id === token?.promoterId);
    if (!token || token.status !== "active" || !owner || owner.status !== "active" || token.promoterId === memberId) throw new Error("分享来源码无效或已失效");
    if (token.expiresAt && Date.parse(token.expiresAt) < Date.now()) throw new Error("推广来源码已过期");
    const existing = state.referralRelations.find(item => item.memberId === memberId && item.status === "active");
    if (existing) return { token, relation: existing, firstBind: false };
    if (!activePromoter(state, token.promoterId)) return { token, relation: null, firstBind: false };
    if (!bind) return { token, relation: null, firstBind: false };
    const relation = {
      id: uid("RR"),
      promoterId: token.promoterId,
      memberId,
      status: "active",
      boundAt: nowText(),
      sourceTokenId: token.id,
      channel: channel || token.channel || "unknown",
      bindType: "first_bind"
    };
    state.referralRelations.unshift(relation);
    state.shareEvents.unshift({
      id: uid("SE"),
      tokenId: token.id,
      promoterId: token.promoterId,
      productId: token.productId || "",
      channel: channel || token.channel || "unknown",
      event: "first_bind",
      visitorKey: `member:${memberId}`,
      createdAt: nowText()
    });
    return { token, relation, firstBind: true };
  }

  function createCommissionSnapshot(state, memberId, goodsNet, attribution) {
    const chain = resolveReferralChain(state, memberId);
    const rule = activeCommissionRule(state);
    const sourceRelation = attribution?.relation || state.referralRelations.find(item => item.memberId === memberId && item.status === "active");
    const shareTokenId = sourceRelation?.sourceTokenId || (attribution?.firstBind ? attribution.token?.id : "") || "";
    if (!chain.length && attribution?.relation) {
      chain.push({ promoterId: attribution.relation.promoterId, relationId: attribution.relation.id, level: 1 });
      let currentMemberId = attribution.relation.promoterId;
      const seen = new Set([memberId, currentMemberId]);
      for (let level = 2; level <= Math.min(3, Number(state.distributionSettings.maxLevels || 3)); level += 1) {
        const parent = state.referralRelations.find(item => item.memberId === currentMemberId && item.status === "active");
        if (!parent || seen.has(parent.promoterId) || !activePromoter(state, parent.promoterId)) break;
        chain.push({ promoterId: parent.promoterId, relationId: parent.id, level });
        seen.add(parent.promoterId);
        currentMemberId = parent.promoterId;
      }
    }
    return chain.map(({ promoterId, relationId, level }) => {
      const profile = state.promoterProfiles.find(item => item.userId === promoterId);
      const rates = rule?.tiers?.[profile?.tierId || "standard"] || rule?.tiers?.standard || [Number(state.settings?.commissionRate || 5), 0, 0];
      const rate = Number(rates[level - 1] || 0);
      return {
        promoterId,
        relationId,
        level,
        basis: cents(goodsNet),
        rate,
        amount: cents(goodsNet * rate / 100),
        tierId: profile?.tierId || "standard",
        ruleVersion: rule?.id || "legacy",
        shareTokenId
      };
    }).filter(item => item.amount > 0);
  }

  function createOrder({ lines, address, couponId = "", remark = "", promoType = "", promoId = "", shareTokenId = "" }) {
    const state = read();
    ensureDistribution(state);
    if (state.user.status === "disabled") throw new Error("当前账号已停用，请联系商城客服");
    let attribution = null;
    if (shareTokenId) attribution = resolveShareToken(state, shareTokenId, state.user.id, { bind: true });
    const referralChain = resolveReferralChain(state, state.user.id);
    let promo;
    if (promoType === "flash") {
      promo = state.flashSales.find(item => item.id === promoId && item.status === "active");
      if (!promo || Number(promo.sold) >= Number(promo.quota)) throw new Error("秒杀名额已售罄或活动已结束");
    } else if (promoType === "group") {
      promo = state.groupDeals.find(item => item.id === promoId && item.status === "active");
      if (!promo) throw new Error("拼团活动暂不可参与");
    }
    if (promoType && !["flash", "group", "campaign"].includes(promoType)) throw new Error("不支持的营销活动");
    if (promoType && (lines || []).length !== 1) throw new Error("活动商品请单独下单");
    const items = (lines || []).map(line => {
      const product = state.products.find(item => item.id === line.productId);
      if (!product || product.status !== "on") throw new Error("所选商品暂不可购买");
      if (promo && product.id !== promo.productId) throw new Error("活动商品与所选商品不匹配");
      const sku = findSku(product, line.skuId);
      if (!sku || sku.status !== "on") throw new Error("所选商品规格已下架");
      const requestedQty = Number(line.qty || 1);
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) throw new Error("商品数量无效");
      const qty = Math.max(1, Math.floor(requestedQty));
      if (Number(sku.stock) < qty) throw new Error(`${product.name}（${sku.label}）库存不足`);
      return {
        productId: product.id,
        spuId: product.spuId || product.id,
        skuId: sku.id,
        skuLabel: sku.label,
        skuSpecs: (sku.specs || []).map(spec => ({ ...spec })),
        name: product.name,
        image: sku.image || product.gallery?.[0] || product.image,
        price: cents(promo ? (promoType === "flash" ? promo.price : promo.groupPrice) : sku.price),
        qty,
        promoType
      };
    });
    if (!items.length) throw new Error("请先选择要购买的商品");
    const requestedBySku = new Map();
    items.forEach(item => {
      const key = `${item.productId}:${item.skuId}`;
      requestedBySku.set(key, { item, qty: Number(requestedBySku.get(key)?.qty || 0) + item.qty });
    });
    requestedBySku.forEach(({ item, qty }) => {
      const product = state.products.find(entry => entry.id === item.productId);
      const sku = findSku(product, item.skuId);
      if (Number(sku?.stock) < qty) throw new Error(`${item.name}（${item.skuLabel}）库存不足`);
    });

    const subtotal = cents(items.reduce((sum, item) => sum + item.price * item.qty, 0));
    const tier = currentTier(state);
    const memberRate = Number(tier?.discount || 100) / 100;
    const memberDiscount = cents(subtotal * (1 - memberRate));
    let couponDiscount = 0;
    let couponClaimId = "";
    if (couponId) {
      const claim = state.claimedCoupons.find(item => item.claimId === couponId || item.id === couponId);
      const coupon = state.coupons.find(item => item.id === (claim?.couponId || claim?.id));
      if (!claim || claim.status !== "available" || !coupon || subtotal < Number(coupon.threshold || 0)) {
        throw new Error("该优惠券不可用或未达到使用门槛");
      }
      const couponValue = Number(coupon.value);
      if (!Number.isFinite(couponValue) || couponValue <= 0 || (coupon.type === "rate" && couponValue > 100)) {
        throw new Error("优惠券规则配置无效");
      }
      couponDiscount = coupon.type === "rate"
        ? cents(subtotal * memberRate * (1 - couponValue / 100))
        : cents(couponValue);
      couponClaimId = claim.claimId || claim.id;
    }
    const totalDiscount = Math.min(subtotal, memberDiscount + couponDiscount);
    const shippingFee = subtotal - totalDiscount >= Number(state.settings?.freeShippingThreshold || 99) ? 0 : 8;
    const commissionSnapshot = createCommissionSnapshot(state, state.user.id, subtotal - totalDiscount, attribution);
    const order = {
      id: uid("M"),
      status: "pending_payment",
      createdAt: nowText(),
      expiresAt: "30 分钟内",
      address: address || { name: state.user.name, phone: state.user.phone, text: "上海市徐汇区漕溪北路 88 号" },
      userId: state.user.id,
      items,
      subtotal,
      memberDiscount,
      couponDiscount,
      discount: totalDiscount,
      couponClaimId,
      shippingFee,
      total: cents(Math.max(0, subtotal - totalDiscount + shippingFee)),
      paymentMethod: "微信支付",
      remark,
      promoType,
      promoId,
      referrerId: referralChain[0]?.promoterId || attribution?.relation?.promoterId || "",
      referralSnapshot: {
        promoterIds: commissionSnapshot.map(item => item.promoterId),
        sourceTokenId: (attribution?.firstBind ? attribution.token?.id : "") || state.referralRelations.find(item => item.memberId === state.user.id && item.status === "active")?.sourceTokenId || "",
        channel: (attribution?.firstBind ? attribution.token?.channel : "") || state.referralRelations.find(item => item.memberId === state.user.id && item.status === "active")?.channel || "",
        boundAtOrder: Boolean(attribution?.firstBind),
        ruleVersion: commissionSnapshot[0]?.ruleVersion || ""
      },
      commissionSnapshot,
      shareEventTokenId: shareTokenId || "",
      groupParticipationId: "",
      tracking: []
    };
    if (shareTokenId) appendShareEvent(state, shareTokenId, "order_created", `member:${state.user.id}`, order.id);
    state.orders.unshift(order);
    write(state);
    return order;
  }

  function payOrder(orderId) {
    const state = read();
    const order = findOrder(state, orderId);
    if (!order || order.status !== "pending_payment") throw new Error("当前订单不可支付");
    const requestedBySku = new Map();
    for (const item of order.items) {
      const product = state.products.find(entry => entry.id === item.productId);
      const sku = findSku(product, item.skuId);
      if (!product || !sku) throw new Error(`${item.name} 所选规格不存在`);
      const key = `${product.id}:${sku.id}`;
      requestedBySku.set(key, { product, sku, qty: Number(requestedBySku.get(key)?.qty || 0) + Number(item.qty || 0), item });
    }
    requestedBySku.forEach(({ sku, qty, item }) => {
      if (Number(sku.stock) < qty) throw new Error(`${item.name}（${item.skuLabel || sku.label || "默认规格"}）库存不足`);
    });
    if (order.promoType === "flash") {
      const sale = state.flashSales.find(item => item.id === order.promoId && item.status === "active");
      if (!sale || Number(sale.sold) + order.items[0].qty > Number(sale.quota)) throw new Error("秒杀库存不足");
      sale.sold = Number(sale.sold) + order.items[0].qty;
    }
    order.items.forEach(item => {
      const product = state.products.find(entry => entry.id === item.productId);
      const sku = findSku(product, item.skuId);
      sku.stock = Number(sku.stock) - item.qty;
      sku.salesCount = Number(sku.salesCount || 0) + item.qty;
      syncProductStock(product);
      product.salesCount = Number(product.salesCount || 0) + item.qty;
    });
    order.status = "to_ship";
    order.paidAt = nowText();
    order.paymentId = uid("PAY");
    const buyer = state.users.find(item => item.id === order.userId);
    if (buyer) {
      buyer.orders = Number(buyer.orders || 0) + 1;
      buyer.spend = Math.round((Number(buyer.spend || 0) + Number(order.total)) * 100) / 100;
    }
    if (order.couponClaimId) {
      const claim = state.claimedCoupons.find(item => (item.claimId || item.id) === order.couponClaimId);
      if (claim) claim.status = "used";
    }
    if (order.promoType === "group") {
      const participation = state.groupParticipations.find(item => item.id === order.groupParticipationId);
      const deal = state.groupDeals.find(item => item.id === order.promoId);
      if (participation && participation.status === "assembling") {
        participation.pendingOrders = (participation.pendingOrders || []).filter(id => id !== order.id);
        participation.joined = Number(participation.joined || 0) + 1;
        participation.paidAt = nowText();
        if (deal) {
          deal.joined = Number(deal.joined || 0) + 1;
          if (participation.joined >= Number(participation.target || deal.targetMembers || 3)) participation.status = "success";
        }
      }
    }
    ensureDistribution(state);
    if (order.shareEventTokenId) appendShareEvent(state, order.shareEventTokenId, "order_paid", `member:${order.userId}`, order.id);
    (order.commissionSnapshot || []).forEach(snapshot => {
      const idempotencyKey = `order:${order.id}:${snapshot.promoterId}:${snapshot.level}`;
      if (state.commissions.some(item => item.idempotencyKey === idempotencyKey)) return;
      const commission = {
        id: uid("CM"),
        orderId: order.id,
        userId: snapshot.promoterId,
        amount: Number(snapshot.amount),
        originalAmount: Number(snapshot.amount),
        basis: Number(snapshot.basis),
        level: Number(snapshot.level),
        rate: Number(snapshot.rate),
        tierId: snapshot.tierId,
        ruleVersion: snapshot.ruleVersion,
        shareTokenId: snapshot.shareTokenId,
        status: "pending",
        idempotencyKey,
        createdAt: nowText()
      };
      state.commissions.unshift(commission);
      appendLedger(state, {
        commissionId: commission.id,
        userId: commission.userId,
        type: "commission_accrued",
        amount: commission.amount,
        direction: "credit",
        orderId: order.id,
        level: commission.level,
        basis: commission.basis,
        rate: commission.rate,
        ruleVersion: commission.ruleVersion,
        idempotencyKey,
        note: "支付成功，进入待确认收货"
      });
    });
    write(state);
    return order;
  }

  function cancelOrder(orderId) {
    const state = read();
    const order = findOrder(state, orderId);
    if (!order || order.status !== "pending_payment") throw new Error("仅待付款订单可取消");
    order.status = "cancelled";
    order.cancelledAt = nowText();
    if (order.groupParticipationId) {
      const group = state.groupParticipations.find(item => item.id === order.groupParticipationId);
      if (group) group.pendingOrders = (group.pendingOrders || []).filter(id => id !== order.id);
    }
    if (order.couponClaimId) {
      const claim = state.claimedCoupons.find(item => (item.claimId || item.id) === order.couponClaimId);
      if (claim) claim.status = "available";
    }
    write(state);
    return order;
  }

  function shipOrder(orderId, { carrier, trackingNo }) {
    const state = read();
    const order = findOrder(state, orderId);
    if (!order || order.status !== "to_ship") throw new Error("订单当前状态不可发货");
    if (!carrier || !trackingNo?.trim()) throw new Error("请填写承运商和物流单号");
    order.status = "to_receive";
    order.carrier = carrier;
    order.trackingNo = trackingNo.trim();
    order.shippedAt = nowText();
    order.tracking = [
      { time: nowText(), text: `${carrier} 已揽收，正在发往下一站`, place: "商家仓" },
      ...(order.tracking || [])
    ];
    write(state);
    return order;
  }

  function confirmReceived(orderId) {
    const state = read();
    const order = findOrder(state, orderId);
    if (!order || order.status !== "to_receive") throw new Error("只有运输中的订单可以确认收货");
    order.status = "completed";
    order.receivedAt = nowText();
    const pointsAwarded = Math.floor(Number(order.total));
    order.pointsAwarded = pointsAwarded;
    state.user.points = Number(state.user.points || state.points || 0) + pointsAwarded;
    state.points = state.user.points;
    const buyer = state.users.find(item => item.id === order.userId);
    if (buyer) buyer.points = Number(buyer.points || 0) + pointsAwarded;
    syncUserTier(state);
    ensureDistribution(state);
    const freezeDays = Math.max(0, Number(state.distributionSettings.freezeDays || 0));
    state.commissions.filter(item => item.orderId === order.id && item.status === "pending").forEach(item => {
      item.status = freezeDays > 0 ? "frozen" : "available";
      item.settledAt = nowText();
      item.releaseAt = new Date(Date.now() + freezeDays * 86400000).toLocaleString("zh-CN", { hour12: false });
      appendLedger(state, {
        commissionId: item.id,
        userId: item.userId,
        type: freezeDays > 0 ? "commission_frozen" : "commission_released",
        amount: Number(item.amount),
        direction: "credit",
        orderId: order.id,
        level: item.level || 1,
        ruleVersion: item.ruleVersion || "legacy",
        idempotencyKey: `${freezeDays > 0 ? "freeze" : "release"}:${item.id}`,
        note: freezeDays > 0 ? `确认收货，冻结 ${freezeDays} 天` : "确认收货，佣金可提现"
      });
    });
    write(state);
    return order;
  }

  function applyAfterSale({ orderId, type = "refund", reason, description = "", amount }) {
    const state = read();
    const order = findOrder(state, orderId);
    const eligible = ["to_ship", "to_receive", "completed"].includes(order?.status);
    const openTicket = state.afterSales.find(item => item.orderId === orderId && ["pending", "approved"].includes(item.status));
    if (!eligible || openTicket) throw new Error("订单当前不可申请售后，或已有处理中申请");
    const refundable = cents(Math.max(0, Number(order.total) - Number(order.refundedAmount || 0)));
    const refundAmount = Number(amount || refundable);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > refundable) {
      throw new Error("退款金额需大于 0 且不超过订单剩余可退金额");
    }
    const ticket = {
      id: uid("AS"),
      orderId,
      type,
      reason: reason || "其他问题",
      description,
      amount: cents(refundAmount),
      status: "pending",
      createdAt: nowText()
    };
    state.afterSales.unshift(ticket);
    order.afterSaleId = ticket.id;
    write(state);
    return ticket;
  }

  function ledgerProjection(state, userId) {
    ensureDistribution(state);
    const events = state.commissionLedger.filter(item => item.userId === userId).map(item => ({ ...item }));
    state.commissions.filter(item => item.userId === userId).forEach(item => {
      const commissionEvents = events.filter(row => row.commissionId === item.id);
      const amount = Number(item.originalAmount ?? item.amount);
      if (!commissionEvents.some(row => row.type === "commission_accrued")) {
        events.push({ userId, commissionId: item.id, type: "commission_accrued", amount, createdAt: item.createdAt });
      }
      if (["frozen", "available", "settled", "withdrawn", "recoverable"].includes(item.status)
        && !commissionEvents.some(row => row.type === "commission_frozen" || row.type === "commission_released")) {
        events.push({ userId, commissionId: item.id, type: "commission_frozen", amount, createdAt: item.settledAt || item.createdAt });
      }
      if (["available", "settled", "withdrawn", "recoverable"].includes(item.status)
        && !commissionEvents.some(row => row.type === "commission_released")) {
        events.push({ userId, commissionId: item.id, type: "commission_released", amount: Number(item.amount), createdAt: item.releasedAt || item.createdAt });
      }
      if (Number(item.withdrawnAmount || 0) > 0
        && !events.some(row => row.type === "withdrawal_paid" && (row.allocations || []).some(part => part.commissionId === item.id))) {
        const paidAmount = Number(item.withdrawnAmount);
        events.push({ userId, commissionId: item.id, type: "withdrawal_locked", amount: paidAmount, allocations: [{ commissionId: item.id, amount: paidAmount }], createdAt: item.paidAt || item.createdAt });
        events.push({ userId, commissionId: item.id, type: "withdrawal_paid", amount: paidAmount, allocations: [{ commissionId: item.id, amount: paidAmount }], createdAt: item.paidAt || item.createdAt });
      }
    });
    const eventRank = { commission_accrued: 0, commission_frozen: 1, commission_released: 2, withdrawal_locked: 3, withdrawal_released: 4, withdrawal_paid: 5, commission_refund_adjusted: 6 };
    events.sort((a, b) => {
      if (Number.isFinite(Number(a.sequence)) && Number.isFinite(Number(b.sequence)) && Number(a.sequence) !== Number(b.sequence)) {
        return Number(a.sequence) - Number(b.sequence);
      }
      const timeDelta = (Date.parse(a.createdAt || "") || 0) - (Date.parse(b.createdAt || "") || 0);
      return timeDelta || (eventRank[a.type] ?? 9) - (eventRank[b.type] ?? 9);
    });
    const buckets = new Map();
    const ensure = id => {
      if (!buckets.has(id)) buckets.set(id, { pending: 0, frozen: 0, available: 0, locked: 0, withdrawn: 0, recoverable: 0 });
      return buckets.get(id);
    };
    let recoverable = 0;
    events.forEach(entry => {
      const amount = Math.max(0, Number(entry.amount || 0));
      if (entry.type === "commission_accrued" && entry.commissionId) {
        ensure(entry.commissionId).pending += amount;
      } else if (entry.type === "commission_frozen" && entry.commissionId) {
        const bucket = ensure(entry.commissionId);
        const moved = Math.min(bucket.pending, amount);
        bucket.pending -= moved;
        bucket.frozen += moved || amount;
      } else if (entry.type === "commission_released" && entry.commissionId) {
        const bucket = ensure(entry.commissionId);
        const fromFrozen = Math.min(bucket.frozen, amount);
        bucket.frozen -= fromFrozen;
        const remainder = amount - fromFrozen;
        const fromPending = Math.min(bucket.pending, remainder);
        bucket.pending -= fromPending;
        bucket.available += fromFrozen + fromPending || amount;
      } else if (entry.type === "commission_refund_adjusted" && entry.commissionId) {
        const bucket = ensure(entry.commissionId);
        const key = ["pending", "frozen", "available"].includes(entry.bucketFrom) ? entry.bucketFrom : "available";
        bucket[key] = Math.max(0, bucket[key] - amount);
      } else if (["withdrawal_locked", "withdrawal_released", "withdrawal_paid"].includes(entry.type)) {
        const legacyWithdrawal = state.withdrawals.find(item => item.id === entry.withdrawalId);
        const allocations = entry.allocations?.length ? entry.allocations : (legacyWithdrawal?.allocations || []);
        allocations.forEach(allocation => {
          const bucket = ensure(allocation.commissionId);
          const part = Number(allocation.amount || 0);
          if (entry.type === "withdrawal_locked") {
            bucket.available = Math.max(0, bucket.available - part);
            bucket.locked += part;
          } else {
            const moved = Math.min(bucket.locked, part);
            bucket.locked -= moved;
            if (entry.type === "withdrawal_released") bucket.available += moved;
            else bucket.withdrawn += moved;
          }
        });
      } else if (entry.type === "payout_exception") {
        recoverable += amount;
      }
    });
    return [...buckets.values()].reduce((summary, bucket) => ({
      pending: summary.pending + bucket.pending,
      frozen: summary.frozen + bucket.frozen,
      available: summary.available + bucket.available,
      withdrawing: summary.withdrawing + bucket.locked,
      withdrawn: summary.withdrawn + bucket.withdrawn,
      recoverable: summary.recoverable + bucket.recoverable
    }), { pending: 0, frozen: 0, available: 0, withdrawing: 0, withdrawn: 0, recoverable });
  }

  function availableBalance(state, userId = state.user.id) {
    return cents(ledgerProjection(state, userId).available);
  }

  function accountSummary(state, userId = state.user.id) {
    const projection = ledgerProjection(state, userId);
    return Object.fromEntries(Object.entries(projection).map(([key, value]) => [key, cents(value)]));
  }

  function releaseMaturedCommissions(userId = "") {
    const state = read();
    ensureDistribution(state);
    let released = 0;
    state.commissions.filter(item => item.status === "frozen" && (!userId || item.userId === userId)).forEach(item => {
      if (!item.releaseAt || Date.parse(item.releaseAt) > Date.now()) return;
      if (state.afterSales.some(ticket => ticket.orderId === item.orderId && ["pending", "approved"].includes(ticket.status))) return;
      item.status = "available";
      item.releasedAt = nowText();
      appendLedger(state, {
        commissionId: item.id,
        userId: item.userId,
        type: "commission_released",
        amount: Number(item.amount),
        direction: "credit",
        orderId: item.orderId,
        level: item.level || 1,
        ruleVersion: item.ruleVersion || "legacy",
        idempotencyKey: `release:${item.id}`,
        note: "冻结期结束且无阻断售后"
      });
      released += 1;
    });
    if (released) write(state);
    return released;
  }

  function applyCommissionRefundAdjustment(state, item, amount, orderId, ticketId) {
    const remainingBasis = Math.max(0, Number(item.originalAmount ?? item.amount) - Number(item.refundedAmount || 0));
    const adjustment = cents(Math.min(remainingBasis, amount));
    if (adjustment <= 0) return;
    const priorStatus = item.status;
    const paidImpact = cents(Math.min(Number(item.withdrawnAmount || 0), adjustment));
    const unpaidImpact = cents(adjustment - paidImpact);
    item.amount = cents(Math.max(0, Number(item.amount) - adjustment));
    item.refundedAmount = cents(Number(item.refundedAmount || 0) + adjustment);
    if (paidImpact > 0) {
      item.status = "recoverable";
      item.recoverableAmount = cents(Number(item.recoverableAmount || 0) + paidImpact);
      appendLedger(state, {
        commissionId: item.id,
        userId: item.userId,
        type: "payout_exception",
        amount: paidImpact,
        direction: "memo",
        orderId,
        level: item.level || 1,
        ruleVersion: item.ruleVersion || "legacy",
        idempotencyKey: `refund-exception:${ticketId}:${item.id}`,
        note: "已提现佣金关联退款，转人工财务处置；不自动扣款"
      });
    }
    if (unpaidImpact > 0) {
      if (!paidImpact && item.amount <= 0.01) item.status = "cancelled";
      appendLedger(state, {
        commissionId: item.id,
        userId: item.userId,
        type: "commission_refund_adjusted",
        amount: unpaidImpact,
        direction: "debit",
        orderId,
        level: item.level || 1,
        ruleVersion: item.ruleVersion || "legacy",
        bucketFrom: priorStatus,
        idempotencyKey: `refund-adjust:${ticketId}:${item.id}`,
        note: "按退款金额冲减未提现佣金"
      });
    }
  }

  function adjustCommissionsForRefund(state, orderId, refundAmount, ticketId) {
    const order = findOrder(state, orderId);
    if (!order) return;
    ensureDistribution(state);
    const denominator = Math.max(Number(order.total || order.subtotal || 1) - Number(order.shippingFee || 0), 1);
    const ratio = Math.min(1, Number(refundAmount || 0) / denominator);
    state.commissions.filter(item => item.orderId === orderId && !["cancelled", "adjusted"].includes(item.status)).forEach(item => {
      const unadjusted = Math.max(0, Number(item.originalAmount ?? item.amount) - Number(item.refundedAmount || 0));
      const adjustment = cents(Math.min(unadjusted, Number(item.originalAmount ?? item.amount) * ratio));
      if (adjustment <= 0) return;
      const activeWithdrawals = state.withdrawals.filter(withdrawal =>
        ["submitted", "reviewing", "approved", "paying"].includes(withdrawal.status)
        && (withdrawal.allocations || []).some(allocation => allocation.commissionId === item.id));
      activeWithdrawals.filter(withdrawal => withdrawal.status !== "paying").forEach(withdrawal => {
        withdrawal.status = "canceled";
        withdrawal.reviewNote = "关联订单退款，提现锁定金额已释放";
        withdrawal.updatedAt = nowText();
        appendLedger(state, {
          userId: withdrawal.userId,
          type: "withdrawal_released",
          amount: Number(withdrawal.amount),
          direction: "credit",
          withdrawalId: withdrawal.id,
          allocations: (withdrawal.allocations || []).map(row => ({ ...row })),
          idempotencyKey: `refund-release:${withdrawal.id}`,
          note: withdrawal.reviewNote
        });
      });
      const isPaying = activeWithdrawals.some(withdrawal => withdrawal.status === "paying");
      if (isPaying) {
        item.status = "recoverable";
        item.pendingRefundAdjustments ||= [];
        item.pendingRefundAdjustments.push({ amount: adjustment, orderId, ticketId });
        state.distributionRiskCases.unshift({
          id: uid("DR"),
          userId: item.userId,
          type: "refund_during_payout",
          level: "high",
          status: "reviewing",
          summary: `订单 ${orderId} 退款与出款处理中佣金重叠，待根据出款结果调整`,
          createdAt: nowText(),
          source: `after_sale:${ticketId}`
        });
        return;
      }
      applyCommissionRefundAdjustment(state, item, adjustment, orderId, ticketId);
    });
  }

  function reviewAfterSale(ticketId, decision, note = "") {
    const state = read();
    const ticket = state.afterSales.find(item => item.id === ticketId);
    if (!ticket || ticket.status !== "pending") throw new Error("售后单当前不可审核");
    const order = findOrder(state, ticket.orderId);
    ticket.reviewNote = note;
    ticket.reviewedAt = nowText();
    if (decision === "approve") {
      ticket.status = "refunded";
      ticket.refundedAt = nowText();
      if (order) {
        order.refundedAmount = cents(Number(order.refundedAmount || 0) + Number(ticket.amount));
        if (order.refundedAmount >= Number(order.total || 0) - 0.01) order.status = "refunded";
        order.refundedAt = nowText();
        const buyer = state.users.find(item => item.id === order.userId);
        if (buyer) buyer.spend = Math.max(0, Math.round((Number(buyer.spend || 0) - Number(ticket.amount)) * 100) / 100);
        if (order.pointsAwarded) {
          const pointsToRevoke = Math.min(order.pointsAwarded, Math.floor(Number(ticket.amount)));
          state.user.points = Math.max(0, Number(state.user.points || 0) - pointsToRevoke);
          state.points = state.user.points;
          if (buyer) buyer.points = Math.max(0, Number(buyer.points || 0) - pointsToRevoke);
          order.pointsAwarded -= pointsToRevoke;
          syncUserTier(state);
        }
      }
      adjustCommissionsForRefund(state, ticket.orderId, ticket.amount, ticket.id);
    } else {
      ticket.status = "rejected";
      if (order?.afterSaleId === ticket.id) delete order.afterSaleId;
    }
    write(state);
    return ticket;
  }

  function claimCoupon(couponId) {
    const state = read();
    const coupon = state.coupons.find(item => item.id === couponId && item.status === "active");
    if (!coupon || Number(coupon.stock) <= 0) throw new Error("优惠券已领完或已结束");
    if (state.claimedCoupons.some(item => item.couponId === couponId || item.id === couponId)) throw new Error("你已领取过这张优惠券");
    coupon.claimed = Number(coupon.claimed || 0) + 1;
    coupon.stock -= 1;
    state.claimedCoupons.unshift({ claimId: uid("CC"), couponId, status: "available", receivedAt: nowText() });
    write(state);
    return coupon;
  }

  function joinGroup(dealId, orderId) {
    const state = read();
    const deal = state.groupDeals.find(item => item.id === dealId && item.status === "active");
    if (!deal) throw new Error("拼团活动暂不可参与");
    const order = findOrder(state, orderId);
    if (!order || order.promoType !== "group" || order.promoId !== dealId || order.status !== "pending_payment") {
      throw new Error("请先创建该拼团商品订单");
    }
    if (state.groupParticipations.some(item => (item.pendingOrders || []).includes(orderId))) {
      return state.groupParticipations.find(item => (item.pendingOrders || []).includes(orderId));
    }
    const participation = state.groupParticipations.find(item => item.dealId === dealId && item.status === "assembling") || {
      id: uid("GP"),
      dealId,
      groupCode: uid("G").slice(-6).toUpperCase(),
      joined: 0,
      target: Number(deal.targetMembers || 3),
      status: "assembling",
      createdAt: nowText(),
      pendingOrders: []
    };
    if (!state.groupParticipations.some(item => item.id === participation.id)) state.groupParticipations.unshift(participation);
    participation.pendingOrders ||= [];
    participation.pendingOrders.push(orderId);
    order.groupParticipationId = participation.id;
    write(state);
    return participation;
  }

  function createWithdrawal(amount, payoutChannelId) {
    const state = read();
    ensureDistribution(state);
    const profile = state.promoterProfiles.find(item => item.userId === state.user.id);
    if (!activePromoter(state, state.user.id) || profile?.riskStatus === "frozen") throw new Error("推广员账户当前不可提现，请联系运营");
    const available = availableBalance(state);
    const rawValue = Number(amount);
    const value = cents(rawValue);
    if (!Number.isFinite(rawValue)) throw new Error("请输入有效的提现金额");
    const settings = state.distributionSettings;
    const channel = state.payoutChannels.find(item => item.id === payoutChannelId && item.userId === state.user.id && item.status === "active" && item.verified);
    if (!channel || !settings.payoutChannels.includes(channel.type)) throw new Error("请选择已验证且当前启用的收款渠道");
    if (value < Number(settings.minimumPayout || state.settings?.minimumWithdrawal || 100)) throw new Error(`最低提现金额为 ¥${settings.minimumPayout || state.settings.minimumWithdrawal || 100}`);
    if (value > Number(settings.singlePayoutLimit || 5000)) throw new Error(`单笔提现不能超过 ¥${settings.singlePayoutLimit || 5000}`);
    if (value > available) throw new Error("提现金额超过可提现余额");
    const since = Date.now() - 86400000;
    const todayTotal = state.withdrawals.filter(item => item.userId === state.user.id && Date.parse(item.createdAt) >= since && !["canceled", "rejected"].includes(item.status))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    if (todayTotal + value > Number(settings.dailyPayoutLimit || 10000)) throw new Error("超过当日累计提现限额");
    const allocations = [];
    let remaining = value;
    for (const commission of state.commissions.filter(item => item.userId === state.user.id && ["available", "settled"].includes(item.status))) {
      const reserved = state.withdrawals.filter(item => !["succeeded", "failed", "canceled", "rejected", "paid"].includes(item.status)).flatMap(item => item.allocations || [])
        .filter(item => item.commissionId === commission.id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const availableForCommission = Math.max(0, cents(Number(commission.amount) - Number(commission.withdrawnAmount || 0) - reserved));
      const allocated = Math.min(remaining, availableForCommission);
      if (allocated > 0) {
        allocations.push({ commissionId: commission.id, amount: cents(allocated) });
        remaining = cents(remaining - allocated);
      }
      if (remaining <= 0) break;
    }
    if (remaining > 0) throw new Error("可提现佣金不足，请刷新后重试");
    const manualReview = value > Number(settings.autoReviewThreshold || 0) || profile.riskStatus !== "normal";
    const withdrawal = {
      id: uid("WD"),
      userId: state.user.id,
      amount: value,
      payoutChannelId: channel.id,
      channelType: channel.type,
      channelLabel: channel.label,
      maskedAccount: channel.maskedAccount,
      allocations,
      status: manualReview ? "reviewing" : "approved",
      createdAt: nowText(),
      reviewNote: manualReview ? "命中大额/风险规则，进入人工审核" : "小额申请通过自动风控，等待出款执行",
      autoReviewed: !manualReview,
      idempotencyKey: uid("IDEM")
    };
    if (!manualReview) {
      withdrawal.reviewedAt = nowText();
      withdrawal.reviewer = "系统风控";
    }
    state.withdrawals.unshift(withdrawal);
    appendLedger(state, {
      userId: withdrawal.userId,
      type: "withdrawal_locked",
      amount: value,
      direction: "debit",
      withdrawalId: withdrawal.id,
      allocations: allocations.map(row => ({ ...row })),
      idempotencyKey: `withdrawal-lock:${withdrawal.id}`,
      note: `申请锁定佣金，渠道：${channel.label}`
    });
    addAudit(state, "payout.submit", withdrawal.id, withdrawal.reviewNote, "小程序用户", null, { amount: value, status: withdrawal.status });
    write(state);
    return withdrawal;
  }

  function reviewWithdrawal(withdrawalId, decision, note = "") {
    const state = read();
    ensureDistribution(state);
    const withdrawal = state.withdrawals.find(item => item.id === withdrawalId);
    if (!withdrawal || !["submitted", "reviewing"].includes(withdrawal.status)) throw new Error("仅待审核提现可处理");
    if (!["approve", "reject"].includes(decision)) throw new Error("不支持的审核结果");
    const before = withdrawal.status;
    withdrawal.status = decision === "approve" ? "approved" : "rejected";
    withdrawal.reviewNote = note;
    withdrawal.reviewedAt = nowText();
    withdrawal.reviewer = "林运营";
    if (decision === "reject") {
      appendLedger(state, {
        userId: withdrawal.userId,
        type: "withdrawal_released",
        amount: Number(withdrawal.amount),
        direction: "credit",
        withdrawalId: withdrawal.id,
        allocations: (withdrawal.allocations || []).map(row => ({ ...row })),
        idempotencyKey: `withdrawal-release:${withdrawal.id}`,
        note: note || "审核拒绝，释放提现锁定金额"
      });
    }
    addAudit(state, `payout.${decision}`, withdrawal.id, note, "林运营", { status: before }, { status: withdrawal.status });
    write(state);
    return withdrawal;
  }

  function startPayout(withdrawalId, actor = "林运营") {
    const state = read();
    ensureDistribution(state);
    const withdrawal = state.withdrawals.find(item => item.id === withdrawalId);
    if (!withdrawal || withdrawal.status !== "approved") throw new Error("只有已批准的提现单可以发起出款");
    const attempt = {
      id: uid("PA"),
      withdrawalId,
      channelType: withdrawal.channelType,
      status: "paying",
      attemptNo: 1 + state.payoutAttempts.filter(item => item.withdrawalId === withdrawalId).length,
      providerRef: "",
      createdAt: nowText()
    };
    state.payoutAttempts.unshift(attempt);
    withdrawal.status = "paying";
    withdrawal.currentAttemptId = attempt.id;
    withdrawal.payingAt = nowText();
    addAudit(state, "payout.start", withdrawalId, `启动${withdrawal.channelLabel}出款`, actor, { status: "approved" }, { status: "paying", attemptId: attempt.id });
    write(state);
    return attempt;
  }

  function completePayout(withdrawalId, outcome, { reference = "", note = "", actor = "林运营" } = {}) {
    const state = read();
    ensureDistribution(state);
    const withdrawal = state.withdrawals.find(item => item.id === withdrawalId);
    if (!withdrawal || withdrawal.status !== "paying") throw new Error("提现单不在出款处理中");
    const attempt = state.payoutAttempts.find(item => item.id === withdrawal.currentAttemptId);
    if (!attempt || attempt.status !== "paying") throw new Error("找不到有效出款尝试");
    if (!["succeeded", "failed"].includes(outcome)) throw new Error("出款结果无效");
    if (outcome === "succeeded" && withdrawal.channelType === "bank_transfer" && !String(reference).trim()) throw new Error("银行转账成功必须登记财务付款凭证/流水号");
    attempt.status = outcome;
    attempt.providerRef = String(reference).trim();
    attempt.note = String(note).trim();
    attempt.finishedAt = nowText();
    withdrawal.status = outcome;
    withdrawal.updatedAt = nowText();
    withdrawal.outcomeNote = note;
    if (outcome === "succeeded") {
      withdrawal.paidAt = nowText();
      (withdrawal.allocations || []).forEach(allocation => {
        const commission = state.commissions.find(item => item.id === allocation.commissionId);
        if (!commission) return;
        commission.withdrawnAmount = cents(Number(commission.withdrawnAmount || 0) + Number(allocation.amount));
        if (commission.withdrawnAmount >= Number(commission.amount) - 0.01) commission.status = "withdrawn";
      });
      appendLedger(state, {
        userId: withdrawal.userId,
        type: "withdrawal_paid",
        amount: Number(withdrawal.amount),
        direction: "debit",
        withdrawalId,
        allocations: (withdrawal.allocations || []).map(row => ({ ...row })),
        providerRef: attempt.providerRef,
        idempotencyKey: `withdrawal-paid:${withdrawalId}`,
        note: note || "出款成功"
      });
    } else {
      appendLedger(state, {
        userId: withdrawal.userId,
        type: "withdrawal_released",
        amount: Number(withdrawal.amount),
        direction: "credit",
        withdrawalId,
        allocations: (withdrawal.allocations || []).map(row => ({ ...row })),
        providerRef: attempt.providerRef,
        idempotencyKey: `withdrawal-failed:${withdrawalId}:${attempt.id}`,
        note: note || "出款失败，佣金锁定已释放"
      });
    }
    (withdrawal.allocations || []).forEach(allocation => {
      const commission = state.commissions.find(item => item.id === allocation.commissionId);
      if (!commission?.pendingRefundAdjustments?.length) return;
      const pending = commission.pendingRefundAdjustments.splice(0);
      pending.forEach(adjustment => applyCommissionRefundAdjustment(
        state,
        commission,
        Number(adjustment.amount),
        adjustment.orderId,
        adjustment.ticketId
      ));
      if (!commission.pendingRefundAdjustments.length) delete commission.pendingRefundAdjustments;
    });
    addAudit(state, `payout.${outcome}`, withdrawalId, note || attempt.providerRef, actor, { status: "paying" }, { status: outcome, attemptId: attempt.id });
    write(state);
    return withdrawal;
  }

  function cancelWithdrawal(withdrawalId, note = "用户撤销申请") {
    const state = read();
    ensureDistribution(state);
    const withdrawal = state.withdrawals.find(item => item.id === withdrawalId);
    if (!withdrawal || !["submitted", "reviewing", "approved"].includes(withdrawal.status)) throw new Error("当前提现状态不可撤销");
    withdrawal.status = "canceled";
    withdrawal.reviewNote = note;
    withdrawal.updatedAt = nowText();
    appendLedger(state, {
      userId: withdrawal.userId,
      type: "withdrawal_released",
      amount: Number(withdrawal.amount),
      direction: "credit",
      withdrawalId,
      allocations: (withdrawal.allocations || []).map(row => ({ ...row })),
      idempotencyKey: `withdrawal-cancel:${withdrawalId}`,
      note
    });
    addAudit(state, "payout.cancel", withdrawalId, note, withdrawal.userId);
    write(state);
    return withdrawal;
  }

  function retryPayout(withdrawalId, note = "复核后重新发起") {
    const state = read();
    ensureDistribution(state);
    const withdrawal = state.withdrawals.find(item => item.id === withdrawalId);
    if (!withdrawal || withdrawal.status !== "failed") throw new Error("仅明确失败的提现单可重试");
    if (availableBalance(state, withdrawal.userId) < Number(withdrawal.amount)) throw new Error("可提现余额不足，无法重新锁定");
    let remaining = Number(withdrawal.amount);
    const allocations = [];
    state.commissions.filter(item => item.userId === withdrawal.userId && ["available", "settled"].includes(item.status)).forEach(commission => {
      const reserved = state.withdrawals.filter(item => !["succeeded", "failed", "canceled", "rejected", "paid"].includes(item.status)).flatMap(item => item.allocations || [])
        .filter(item => item.commissionId === commission.id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const free = Math.max(0, cents(Number(commission.amount) - Number(commission.withdrawnAmount || 0) - reserved));
      const part = Math.min(remaining, free);
      if (part > 0) {
        allocations.push({ commissionId: commission.id, amount: cents(part) });
        remaining = cents(remaining - part);
      }
    });
    if (remaining > 0) throw new Error("原佣金已被调整，无法完整重新锁定");
    withdrawal.allocations = allocations;
    withdrawal.status = "approved";
    withdrawal.retryNote = note;
    withdrawal.updatedAt = nowText();
    appendLedger(state, {
      userId: withdrawal.userId,
      type: "withdrawal_locked",
      amount: Number(withdrawal.amount),
      direction: "debit",
      withdrawalId,
      allocations: allocations.map(row => ({ ...row })),
      idempotencyKey: `withdrawal-retry-lock:${withdrawalId}:${Date.now()}`,
      note
    });
    addAudit(state, "payout.retry", withdrawalId, note, "林运营", { status: "failed" }, { status: "approved" });
    write(state);
    return withdrawal;
  }

  function submitPromoterApplication(motivation) {
    const state = read();
    ensureDistribution(state);
    if (state.user.status === "disabled") throw new Error("账号不可申请推广员");
    if (activePromoter(state, state.user.id)) throw new Error("你已是有效推广员");
    if (state.promoterApplications.some(item => item.userId === state.user.id && item.status === "pending")) throw new Error("申请已提交，请勿重复申请");
    const application = { id: uid("APP"), userId: state.user.id, status: "pending", motivation: String(motivation || "").trim(), createdAt: nowText() };
    state.promoterApplications.unshift(application);
    addAudit(state, "promoter.apply", application.id, application.motivation, state.user.id);
    write(state);
    return application;
  }

  function reviewPromoterApplication(applicationId, decision, reason = "", actor = "林运营") {
    const state = read();
    ensureDistribution(state);
    const application = state.promoterApplications.find(item => item.id === applicationId);
    if (!application || application.status !== "pending") throw new Error("申请状态已变化，无法重复审核");
    if (!["approve", "reject"].includes(decision) || !String(reason).trim()) throw new Error("请填写审核结论和原因");
    const user = state.users.find(item => item.id === application.userId);
    if (!user || user.status !== "active") throw new Error("用户不存在或已停用");
    const before = application.status;
    application.status = decision === "approve" ? "approved" : "rejected";
    application.reviewNote = String(reason).trim();
    application.reviewedAt = nowText();
    application.reviewer = actor;
    if (decision === "approve") {
      user.distributor = true;
      const profile = state.promoterProfiles.find(item => item.userId === user.id);
      const previousStatus = profile?.status || "not_promoter";
      const referralCode = profile?.referralCode || `${user.id.slice(-4).toUpperCase()}${Date.now().toString().slice(-4)}`;
      if (profile) {
        profile.status = "active";
        profile.approvedAt = nowText();
        profile.referralCode = referralCode;
      } else {
        state.promoterProfiles.unshift({ userId: user.id, status: "active", tierId: "standard", approvedAt: nowText(), referralCode, riskStatus: "normal", selfPurchaseEnabled: false });
      }
      user.referralCode = referralCode;
      state.promoterStatusHistory.unshift({
        id: uid("PSH"),
        userId: user.id,
        fromStatus: previousStatus,
        toStatus: "active",
        reason: String(reason).trim(),
        actor,
        createdAt: nowText()
      });
    }
    addAudit(state, `promoter.${decision}`, application.userId, reason, actor, { status: before }, { status: application.status });
    write(state);
    return application;
  }

  function setPromoterEligibility(userId, nextStatus, reason, actor = "林运营") {
    const state = read();
    ensureDistribution(state);
    const profile = state.promoterProfiles.find(item => item.userId === userId);
    const user = state.users.find(item => item.id === userId);
    if (!profile || !user || !["active", "revoked"].includes(nextStatus) || !String(reason || "").trim()) {
      throw new Error("推广员资格状态或处置理由无效");
    }
    if (profile.status === nextStatus) throw new Error("推广员资格状态未发生变化");
    if (nextStatus === "active" && user.status !== "active") throw new Error("用户账号已停用，不能恢复推广资格");
    const before = profile.status;
    profile.status = nextStatus;
    profile.statusNote = String(reason).trim();
    profile.statusUpdatedAt = nowText();
    user.distributor = nextStatus === "active";
    if (nextStatus === "revoked") {
      state.shareTokens.filter(item => item.promoterId === userId && item.status === "active").forEach(token => {
        token.status = "revoked";
        token.revokedAt = nowText();
        token.revokeReason = "推广员资格撤销";
      });
    }
    state.promoterStatusHistory.unshift({
      id: uid("PSH"),
      userId,
      fromStatus: before,
      toStatus: nextStatus,
      reason: String(reason).trim(),
      actor,
      createdAt: nowText()
    });
    addAudit(state, `promoter.eligibility.${nextStatus}`, userId, reason, actor, { status: before }, { status: nextStatus });
    write(state);
    return profile;
  }

  function createShareToken({ productId = "", channel = "wechat_friend" } = {}) {
    const state = read();
    ensureDistribution(state);
    const owner = state.users.find(item => item.id === state.user.id);
    if (!owner || owner.status !== "active") throw new Error("当前账号不可生成分享码");
    const id = uid("SH");
    const token = `tkn_${Math.random().toString(36).slice(2, 10)}`;
    const row = { id, token, promoterId: state.user.id, promoterEligible: activePromoter(state, state.user.id), productId, channel, status: "active", createdAt: nowText(), expiresAt: new Date(Date.now() + 30 * 86400000).toLocaleString("zh-CN", { hour12: false }), version: 1 };
    state.shareTokens.unshift(row);
    addAudit(state, "share_token.issue", id, `渠道：${channel}；${row.promoterEligible ? "有效推广员佣金归因码" : "普通用户来源分析码"}`, state.user.id);
    write(state);
    return row;
  }

  function recordShareEvent(tokenOrId, eventType = "landing_view", visitorKey = "") {
    const state = read();
    const event = appendShareEvent(state, tokenOrId, eventType, visitorKey);
    if (!event) return null;
    write(state);
    return event;
  }

  function revokeShareToken(tokenId, reason = "推广员主动撤销") {
    const state = read();
    ensureDistribution(state);
    const token = state.shareTokens.find(item => item.id === tokenId && item.promoterId === state.user.id);
    if (!token || token.status !== "active") throw new Error("分享码不存在或已撤销");
    token.status = "revoked";
    token.revokedAt = nowText();
    addAudit(state, "share_token.revoke", tokenId, reason, state.user.id);
    write(state);
    return token;
  }

  function correctReferralRelation(memberId, newPromoterId, reason, actor = "林运营") {
    const state = read();
    ensureDistribution(state);
    if (!String(reason || "").trim()) throw new Error("关系纠正必须填写业务理由");
    if (memberId === newPromoterId || !activePromoter(state, newPromoterId)) throw new Error("不能绑定本人，且新上级必须具备有效推广资格");
    let cursor = newPromoterId;
    const seen = new Set([memberId]);
    for (let level = 0; level <= state.referralRelations.length; level += 1) {
      if (seen.has(cursor)) throw new Error("关系调整会形成循环链路");
      seen.add(cursor);
      const parent = state.referralRelations.find(item => item.memberId === cursor && item.status === "active");
      if (!parent) break;
      cursor = parent.promoterId;
    }
    const prior = state.referralRelations.find(item => item.memberId === memberId && item.status === "active");
    const before = prior ? { promoterId: prior.promoterId, id: prior.id } : null;
    if (prior) {
      prior.status = "corrected";
      prior.endedAt = nowText();
      prior.endReason = String(reason).trim();
    }
    const relation = { id: uid("RR"), promoterId: newPromoterId, memberId, status: "active", boundAt: nowText(), bindType: "admin_correction", correctedFrom: before?.id || "", reason: String(reason).trim() };
    state.referralRelations.unshift(relation);
    addAudit(state, "referral.correct", memberId, reason, actor, before, { promoterId: newPromoterId, relationId: relation.id });
    write(state);
    return relation;
  }

  function setPromoterRisk(userId, riskStatus, reason, actor = "林运营") {
    const state = read();
    ensureDistribution(state);
    const profile = state.promoterProfiles.find(item => item.userId === userId);
    if (!profile || !["normal", "reviewing", "frozen"].includes(riskStatus) || !String(reason || "").trim()) throw new Error("风险状态或处置原因无效");
    const before = profile.riskStatus;
    profile.riskStatus = riskStatus;
    profile.riskNote = String(reason).trim();
    profile.riskUpdatedAt = nowText();
    const openCase = state.distributionRiskCases.find(item => item.userId === userId && item.status === "reviewing");
    if (openCase) {
      openCase.status = riskStatus === "reviewing" ? "reviewing" : "resolved";
      openCase.resolution = String(reason).trim();
      openCase.resolvedAt = nowText();
    }
    addAudit(state, "risk.status_change", userId, reason, actor, { riskStatus: before }, { riskStatus });
    write(state);
    return profile;
  }

  function saveCommissionRule({ name, tiers, effectiveAt, note, scope = "全场商品" }, actor = "林运营") {
    const state = read();
    ensureDistribution(state);
    const rates = Object.values(tiers || {}).flat();
    if (!name || !effectiveAt || !Number.isFinite(Date.parse(effectiveAt)) || scope !== "全场商品"
      || rates.some(rate => !Number.isFinite(Number(rate)) || Number(rate) < 0 || Number(rate) > 50)) throw new Error("佣金规则字段无效，单层比例须为 0–50%");
    for (const row of Object.values(tiers)) {
      if (row.reduce((sum, rate) => sum + Number(rate), 0) > 100) throw new Error("各级佣金比例合计不能超过 100%");
    }
    const active = state.commissionRuleVersions.find(item => item.status === "active");
    const effectiveNow = Date.parse(effectiveAt) <= Date.now();
    if (active && effectiveNow) active.status = "archived";
    const version = `CR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${state.commissionRuleVersions.length + 1}`;
    const rule = { id: version, name, status: effectiveNow ? "active" : "scheduled", tiers, effectiveAt, scope, note: String(note || ""), createdAt: nowText() };
    state.commissionRuleVersions.unshift(rule);
    addAudit(state, "commission.rule.publish", version, note || "发布佣金规则版本", actor, { activeVersion: active?.id || "" }, { version, status: rule.status, effectiveAt, scope });
    write(state);
    return rule;
  }

  function saveDistributionTierRules(tiers, { effectiveAt = "", note = "" } = {}, actor = "林运营") {
    const state = read();
    ensureDistribution(state);
    if (!Array.isArray(tiers) || !tiers.length) throw new Error("至少需要配置一个推广等级");
    const ids = new Set();
    tiers.forEach(tier => {
      if (!tier.id || !tier.name || ids.has(tier.id)) throw new Error("等级 ID 必须唯一且名称不能为空");
      ids.add(tier.id);
      if (!["AND", "OR"].includes(tier.combination || "AND")) throw new Error("等级条件组合仅支持 AND / OR");
      (tier.conditions || []).forEach(condition => {
        if (!["sales", "newMembers", "selfPurchase"].includes(condition.metric) || ![">=", ">"].includes(condition.op) || !Number.isFinite(Number(condition.value)) || Number(condition.value) < 0) {
          throw new Error("等级指标、比较符或阈值无效");
        }
      });
    });
    if (!tiers.some(tier => tier.id === "standard")) throw new Error("必须保留普通推广员基础等级");
    const prior = state.tierRuleVersions.find(item => item.status === "active");
    if (prior) prior.status = "archived";
    const version = `TR-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${state.tierRuleVersions.length + 1}`;
    const snapshot = { id: version, name: "推广员等级规则", status: "active", effectiveAt: effectiveAt || nowText(), note: String(note || ""), tiers: JSON.parse(JSON.stringify(tiers)), createdAt: nowText() };
    state.tierRuleVersions.unshift(snapshot);
    state.tierRuleVersion = version;
    state.distributionTiers = JSON.parse(JSON.stringify(tiers));
    addAudit(state, "tier.rule.publish", version, note || "发布推广员等级规则", actor, { version: prior?.id || "" }, { version });
    write(state);
    return snapshot;
  }

  function saveDistributionSettings(settings, actor = "林运营") {
    const state = read();
    ensureDistribution(state);
    const before = { ...state.distributionSettings };
    const next = { ...before, ...settings };
    const numericKeys = ["freezeDays", "minimumPayout", "singlePayoutLimit", "dailyPayoutLimit", "autoReviewThreshold"];
    if (numericKeys.some(key => !Number.isFinite(Number(next[key])) || Number(next[key]) < 0)) throw new Error("分销结算参数需为非负数值");
    if (Number(next.singlePayoutLimit) < Number(next.minimumPayout) || Number(next.dailyPayoutLimit) < Number(next.singlePayoutLimit)) {
      throw new Error("限额需满足：日累计限额 ≥ 单笔上限 ≥ 最低提现金额");
    }
    state.distributionSettings = next;
    addAudit(state, "distribution.settings.update", "distributionSettings", "更新分销结算参数", actor, before, next);
    write(state);
    return next;
  }

  function evaluatePromoterTiers(actor = "系统任务") {
    const state = read();
    ensureDistribution(state);
    const period = "近90日";
    const since = Date.now() - 90 * 86400000;
    const evaluations = [];
    state.promoterProfiles.filter(item => item.status === "active").forEach(profile => {
      const relations = state.referralRelations.filter(item => item.promoterId === profile.userId && item.status === "active" && (Date.parse(item.boundAt || "") || 0) >= since);
      const sales = state.orders.filter(order => Date.parse(order.paidAt || order.createdAt) >= since && ["completed", "to_receive", "to_ship"].includes(order.status) && (order.commissionSnapshot || []).some(row => row.promoterId === profile.userId))
        .reduce((sum, order) => sum + Math.max(0, Number(order.subtotal || order.total || 0) - Number(order.discount || 0) - Number(order.refundedAmount || 0)), 0);
      const selfPurchase = state.orders.filter(order => order.userId === profile.userId && Date.parse(order.paidAt || order.createdAt) >= since
        && ["completed", "to_receive", "to_ship"].includes(order.status))
        .reduce((sum, order) => sum + Math.max(0, Number(order.subtotal || order.total || 0) - Number(order.discount || 0) - Number(order.refundedAmount || 0)), 0);
      const metrics = { sales: cents(sales), newMembers: relations.length, selfPurchase: cents(selfPurchase) };
      const matched = state.distributionTiers.filter(tier => tier.status === "active").sort((a, b) => Number(b.sort) - Number(a.sort)).find(tier => {
        const outcomes = (tier.conditions || []).map(condition => {
          const actual = Number(metrics[condition.metric] || 0);
          return condition.op === ">=" ? actual >= Number(condition.value) : actual > Number(condition.value);
        });
        return outcomes.length > 0 && (tier.combination === "OR" ? outcomes.some(Boolean) : outcomes.every(Boolean));
      });
      const priorTierId = profile.tierId;
      const tierId = matched?.id || "standard";
      profile.tierId = tierId;
      const row = {
        id: uid("TE"),
        userId: profile.userId,
        tierId,
        previousTierId: priorTierId,
        ruleVersion: state.tierRuleVersions.find(rule => rule.status === "active")?.id || state.tierRuleVersion || "TIER-DEMO-01",
        period,
        metrics,
        result: "matched",
        reason: `${matched?.name || "普通推广员"} · 有效销售额 ¥${metrics.sales} / 有效拉新 ${metrics.newMembers} 人`,
        evaluatedAt: nowText()
      };
      state.tierEvaluations.unshift(row);
      evaluations.push(row);
    });
    addAudit(state, "tier.evaluate", "all_active_promoters", `周期评估 ${evaluations.length} 人`, actor);
    write(state);
    return evaluations;
  }

  function participateCampaign(campaignId) {
    const state = read();
    const campaign = state.campaigns.find(item => item.id === campaignId && item.status === "active");
    if (!campaign) throw new Error("活动暂不可参与");
    state.campaignParticipations ||= [];
    const prior = state.campaignParticipations.find(item => item.campaignId === campaignId && item.userId === state.user.id);
    if (prior) return prior;
    const record = { id: uid("AP"), campaignId, userId: state.user.id, status: "joined", createdAt: nowText() };
    state.campaignParticipations.unshift(record);
    write(state);
    return record;
  }

  window.MallOps = {
    read,
    write,
    currentTier,
    availableBalance,
    accountSummary,
    resolveReferralChain,
    resolveShareToken,
    releaseMaturedCommissions,
    findOrder,
    createOrder,
    payOrder,
    cancelOrder,
    shipOrder,
    confirmReceived,
    applyAfterSale,
    reviewAfterSale,
    claimCoupon,
    joinGroup,
    createWithdrawal,
    reviewWithdrawal,
    startPayout,
    completePayout,
    cancelWithdrawal,
    retryPayout,
    submitPromoterApplication,
    reviewPromoterApplication,
    setPromoterEligibility,
    createShareToken,
    recordShareEvent,
    revokeShareToken,
    correctReferralRelation,
    setPromoterRisk,
    saveCommissionRule,
    saveDistributionTierRules,
    saveDistributionSettings,
    evaluatePromoterTiers,
    participateCampaign
  };
})();
