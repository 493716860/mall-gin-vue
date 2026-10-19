(() => {
  const { read, write } = window.MallData;
  const nowText = () => new Date().toLocaleString("zh-CN", { hour12: false });
  const uid = prefix => `${prefix}${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
  const cents = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

  function findOrder(state, id) {
    return state.orders.find(order => order.id === id);
  }

  function currentTier(state) {
    const points = Number(state.user?.points ?? state.points ?? 0);
    return [...state.tiers].sort((a, b) => a.points - b.points).filter(tier => points >= tier.points).at(-1) || state.tiers[0];
  }

  function syncUserTier(state) {
    const user = state.users.find(item => item.id === state.user.id);
    if (user) user.tier = currentTier(state)?.name || user.tier;
  }

  function createOrder({ lines, address, couponId = "", remark = "", promoType = "", promoId = "", referrerId = "" }) {
    const state = read();
    if (state.user.status === "disabled") throw new Error("当前账号已停用，请联系商城客服");
    if (referrerId && !state.users.some(item => item.id === referrerId && item.distributor && item.status === "active")) {
      throw new Error("分销推荐人无效");
    }
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
      const requestedQty = Number(line.qty || 1);
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) throw new Error("商品数量无效");
      const qty = Math.max(1, Math.floor(requestedQty));
      return {
        productId: product.id,
        name: product.name,
        image: product.image,
        price: cents(promo ? (promoType === "flash" ? promo.price : promo.groupPrice) : product.price),
        qty,
        promoType
      };
    });
    if (!items.length) throw new Error("请先选择要购买的商品");

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
      referrerId,
      groupParticipationId: "",
      tracking: []
    };
    state.orders.unshift(order);
    write(state);
    return order;
  }

  function payOrder(orderId) {
    const state = read();
    const order = findOrder(state, orderId);
    if (!order || order.status !== "pending_payment") throw new Error("当前订单不可支付");
    for (const item of order.items) {
      const product = state.products.find(entry => entry.id === item.productId);
      if (!product || Number(product.stock) < item.qty) throw new Error(`${item.name} 库存不足`);
    }
    if (order.promoType === "flash") {
      const sale = state.flashSales.find(item => item.id === order.promoId && item.status === "active");
      if (!sale || Number(sale.sold) + order.items[0].qty > Number(sale.quota)) throw new Error("秒杀库存不足");
      sale.sold = Number(sale.sold) + order.items[0].qty;
    }
    order.items.forEach(item => {
      const product = state.products.find(entry => entry.id === item.productId);
      product.stock = Number(product.stock) - item.qty;
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
    if (order.referrerId && !state.commissions.some(item => item.orderId === order.id)) {
      state.commissions.unshift({
        id: uid("CM"),
        orderId: order.id,
        userId: order.referrerId,
        amount: cents(order.total * Number(state.settings?.commissionRate || 5) / 100),
        status: "pending",
        createdAt: nowText()
      });
    }
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
    state.commissions.filter(item => item.orderId === order.id && item.status === "pending").forEach(item => {
      item.status = "settled";
      item.settledAt = nowText();
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
    const refundAmount = Number(amount || order.total);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > Number(order.total)) {
      throw new Error("退款金额需大于 0 且不超过订单实付金额");
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

  function availableBalance(state, userId = state.user.id) {
    const reserved = new Map();
    state.withdrawals.filter(item => item.status === "pending").forEach(item => {
      (item.allocations || []).forEach(allocation => {
        reserved.set(allocation.commissionId, (reserved.get(allocation.commissionId) || 0) + Number(allocation.amount || 0));
      });
    });
    const balance = state.commissions.filter(item => item.userId === userId && item.status === "settled").reduce((sum, item) => {
      const remaining = Number(item.amount) - Number(item.withdrawnAmount || 0) - Number(reserved.get(item.id) || 0);
      return sum + Math.max(0, remaining);
    }, 0);
    return Math.round(balance * 100) / 100;
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
        order.status = "refunded";
        order.refundedAmount = ticket.amount;
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
      state.commissions.filter(item => item.orderId === ticket.orderId).forEach(item => {
        state.withdrawals.filter(withdrawal => withdrawal.status === "pending" && (withdrawal.allocations || []).some(allocation => allocation.commissionId === item.id)).forEach(withdrawal => {
          withdrawal.status = "rejected";
          withdrawal.reviewNote = "关联订单已退款，提现申请自动释放";
          withdrawal.reviewedAt = nowText();
        });
        item.status = Number(item.withdrawnAmount || 0) > 0 ? "recoverable" : "cancelled";
      });
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

  function createWithdrawal(amount, account) {
    const state = read();
    const available = availableBalance(state);
    const rawValue = Number(amount);
    const value = Math.round(rawValue * 100) / 100;
    if (!Number.isFinite(rawValue)) throw new Error("请输入有效的提现金额");
    if (!String(account || "").trim()) throw new Error("请填写收款账户");
    if (value < Number(state.settings?.minimumWithdrawal || 100)) throw new Error(`最低提现金额为 ¥${state.settings.minimumWithdrawal || 100}`);
    if (value > available) throw new Error("提现金额超过可提现余额");
    let remaining = value;
    const allocations = [];
    for (const commission of state.commissions.filter(item => item.userId === state.user.id && item.status === "settled")) {
      const reserved = state.withdrawals.filter(item => item.status === "pending").flatMap(item => item.allocations || [])
        .filter(item => item.commissionId === commission.id).reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const availableForCommission = Math.max(0, Number(commission.amount) - Number(commission.withdrawnAmount || 0) - reserved);
      const allocated = Math.min(remaining, availableForCommission);
      if (allocated > 0) {
        allocations.push({ commissionId: commission.id, amount: Math.round(allocated * 100) / 100 });
        remaining = Math.round((remaining - allocated) * 100) / 100;
      }
      if (remaining <= 0) break;
    }
    if (remaining > 0) throw new Error("可提现佣金不足，请刷新后重试");
    const withdrawal = { id: uid("WD"), userId: state.user.id, amount: value, account, allocations, status: "pending", createdAt: nowText() };
    state.withdrawals.unshift(withdrawal);
    write(state);
    return withdrawal;
  }

  function reviewWithdrawal(withdrawalId, decision, note = "") {
    const state = read();
    const withdrawal = state.withdrawals.find(item => item.id === withdrawalId);
    if (!withdrawal || withdrawal.status !== "pending") throw new Error("提现申请当前不可处理");
    withdrawal.status = decision === "approve" ? "paid" : "rejected";
    withdrawal.reviewNote = note;
    withdrawal.reviewedAt = nowText();
    if (decision === "approve") {
      withdrawal.paidAt = nowText();
      (withdrawal.allocations || []).forEach(allocation => {
        const commission = state.commissions.find(item => item.id === allocation.commissionId);
        if (!commission) return;
        commission.withdrawnAmount = Math.round((Number(commission.withdrawnAmount || 0) + Number(allocation.amount)) * 100) / 100;
        if (commission.withdrawnAmount >= Number(commission.amount) - 0.01) commission.status = "withdrawn";
      });
    }
    write(state);
    return withdrawal;
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
    participateCampaign
  };
})();
