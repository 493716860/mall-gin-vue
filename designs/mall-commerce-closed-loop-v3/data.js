(() => {
  const KEY = "mall-commerce-closed-loop-v3";
  const image = (prompt, size = "square") =>
    `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;

  const defaults = {
    points: 2680,
    chatMessages: [
      { id: "CS-MSG-WELCOME", sender: "staff", type: "text", text: "您好，欢迎联系在线客服。有商品、订单或物流问题都可以留言。", createdAt: "2026-10-19 09:30", read: false }
    ],
    products: [
      {
        id: "p01",
        name: "Xiaomi 15 Ultra",
        subtitle: "徕卡光学四摄｜16GB+512GB",
        price: 6499,
        original: 6999,
        stock: 128,
        parent: "digital",
        category: "phones",
        tags: ["top", "recommend"],
        status: "on",
        image: image("Premium titanium flagship smartphone in pearl silver, rear camera detail, clean white studio product photography, subtle warm gray shadow, centered, no text"),
        skus: [
          { id: "p01-sku-001", specs: [{ name: "颜色", value: "曜石黑" }, { name: "容量", value: "256GB" }], label: "曜石黑 / 256GB", price: 6199, originalPrice: 6699, stock: 56, salesCount: 1120, image: image("Obsidian black titanium flagship smartphone rear camera close-up, premium white studio ecommerce photography, no text"), status: "on" },
          { id: "p01-sku-silver-256", specs: [{ name: "颜色", value: "月光银" }, { name: "容量", value: "256GB" }], label: "月光银 / 256GB", price: 6199, originalPrice: 6699, stock: 32, salesCount: 760, image: image("Pearl silver titanium flagship smartphone rear camera close-up, premium white studio ecommerce photography, no text"), status: "on" },
          { id: "p01-sku-black-512", specs: [{ name: "颜色", value: "曜石黑" }, { name: "容量", value: "512GB" }], label: "曜石黑 / 512GB", price: 6799, originalPrice: 7299, stock: 24, salesCount: 520, image: image("Obsidian black titanium flagship smartphone rear camera close-up, premium white studio ecommerce photography, no text"), status: "on" },
          { id: "p01-sku-silver-512", specs: [{ name: "颜色", value: "月光银" }, { name: "容量", value: "512GB" }], label: "月光银 / 512GB", price: 6799, originalPrice: 7299, stock: 16, salesCount: 280, image: image("Pearl silver titanium flagship smartphone rear camera close-up, premium white studio ecommerce photography, no text"), status: "on" }
        ]
      },
      {
        id: "p02",
        name: "Xiaomi Buds 5 Pro",
        subtitle: "同轴三单元｜沉浸空间音频",
        price: 1299,
        original: 1499,
        stock: 84,
        parent: "digital",
        category: "audio",
        tags: ["top", "new"],
        status: "on",
        image: image("Minimal white wireless earbuds and compact charging case, premium studio product photography, soft white background, warm gray shadow, no text"),
        skus: [
          { id: "p02-sku-001", specs: [{ name: "颜色", value: "云岩白" }], label: "云岩白", price: 1299, originalPrice: 1499, stock: 38, salesCount: 1000, image: image("White wireless earbuds and compact charging case, premium studio product photograph on soft white background, no text"), status: "on" },
          { id: "p02-sku-black", specs: [{ name: "颜色", value: "钛金黑" }], label: "钛金黑", price: 1299, originalPrice: 1499, stock: 29, salesCount: 620, image: image("Graphite black wireless earbuds and compact charging case, premium studio product photograph on soft white background, no text"), status: "on" },
          { id: "p02-sku-blue", specs: [{ name: "颜色", value: "冰川蓝" }], label: "冰川蓝", price: 1349, originalPrice: 1549, stock: 17, salesCount: 320, image: image("Ice blue wireless earbuds and compact charging case, premium studio product photograph on soft white background, no text"), status: "on" }
        ]
      },
      {
        id: "p03",
        name: "米家空气净化器 5",
        subtitle: "双滤芯大循环｜智能除醛",
        price: 1799,
        original: 1999,
        stock: 63,
        parent: "home",
        category: "air",
        tags: ["top"],
        status: "on",
        image: image("Tall minimalist white air purifier with subtle perforated grille, modern home appliance, white seamless studio background, soft warm shadows, no text")
      },
      {
        id: "p04",
        name: "米家无线吸尘器 3",
        subtitle: "轻量机身｜全屋深度清洁",
        price: 899,
        original: 1099,
        stock: 41,
        parent: "home",
        category: "cleaning",
        tags: ["top", "recommend"],
        status: "on",
        image: image("Sleek cordless stick vacuum cleaner in white and graphite, clean studio product photography, pale warm gray backdrop, no text")
      },
      {
        id: "p05",
        name: "城市轻行双肩包",
        subtitle: "轻盈防泼水｜14 英寸电脑仓",
        price: 249,
        original: 299,
        stock: 215,
        parent: "fashion",
        category: "bags",
        tags: ["top", "new"],
        status: "on",
        image: image("Modern charcoal minimalist commuter backpack with clean silhouette, studio product photography, warm white background, soft shadow, no logo no text")
      },
      {
        id: "p06",
        name: "云南高山挂耳咖啡",
        subtitle: "中浅烘焙｜花果香 10 袋装",
        price: 59,
        original: 79,
        stock: 360,
        parent: "food",
        category: "coffee",
        tags: ["top", "recommend"],
        status: "on",
        image: image("Elegant matte cream coffee pouch and a small cup of black pour-over coffee, premium food product photography, bright natural light, no text")
      },
      {
        id: "p07",
        name: "轻云缓震跑鞋",
        subtitle: "轻弹中底｜日常慢跑适用",
        price: 399,
        original: 459,
        stock: 97,
        parent: "fashion",
        category: "shoes",
        tags: ["top"],
        status: "on",
        image: image("Minimal white and pale gray running shoe in profile, premium athletic footwear studio photography, clean white backdrop, no logo no text"),
        skus: [
          { id: "p07-sku-001", specs: [{ name: "尺码", value: "39" }], label: "尺码 39", price: 399, originalPrice: 459, stock: 20, salesCount: 150, status: "on" },
          { id: "p07-sku-40", specs: [{ name: "尺码", value: "40" }], label: "尺码 40", price: 399, originalPrice: 459, stock: 28, salesCount: 210, status: "on" },
          { id: "p07-sku-41", specs: [{ name: "尺码", value: "41" }], label: "尺码 41", price: 399, originalPrice: 459, stock: 27, salesCount: 220, status: "on" },
          { id: "p07-sku-42", specs: [{ name: "尺码", value: "42" }], label: "尺码 42", price: 399, originalPrice: 459, stock: 22, salesCount: 140, status: "on" }
        ]
      },
      {
        id: "p08",
        name: "声波电动牙刷 Pro",
        subtitle: "智能压力提醒｜长续航",
        price: 299,
        original: 349,
        stock: 156,
        parent: "beauty",
        category: "care",
        tags: ["top", "new"],
        status: "on",
        image: image("Minimal white electric toothbrush with charging base, premium personal care product photography, soft white studio background, no text")
      },
      {
        id: "p09",
        name: "米家智能手表 S",
        subtitle: "全天候健康监测｜长续航",
        price: 699,
        original: 799,
        stock: 72,
        parent: "digital",
        category: "wearables",
        tags: ["top", "recommend"],
        status: "on",
        image: image("Minimal dark graphite smartwatch with a clean round display and soft woven strap, premium ecommerce studio photography, pale warm background, no text"),
        skus: [
          { id: "p09-sku-001", specs: [{ name: "表带颜色", value: "曜石黑" }, { name: "表盘尺寸", value: "42mm" }], label: "曜石黑 / 42mm", price: 699, originalPrice: 799, stock: 24, salesCount: 110, image: image("Graphite black smartwatch with woven strap and round display, premium ecommerce studio photography, pale warm background, no text"), status: "on" },
          { id: "p09-sku-silver-42", specs: [{ name: "表带颜色", value: "月光银" }, { name: "表盘尺寸", value: "42mm" }], label: "月光银 / 42mm", price: 699, originalPrice: 799, stock: 18, salesCount: 80, image: image("Silver smartwatch with light woven strap and round display, premium ecommerce studio photography, pale warm background, no text"), status: "on" },
          { id: "p09-sku-black-46", specs: [{ name: "表带颜色", value: "曜石黑" }, { name: "表盘尺寸", value: "46mm" }], label: "曜石黑 / 46mm", price: 799, originalPrice: 899, stock: 17, salesCount: 65, image: image("Graphite black smartwatch with woven strap and round display, premium ecommerce studio photography, pale warm background, no text"), status: "on" },
          { id: "p09-sku-silver-46", specs: [{ name: "表带颜色", value: "月光银" }, { name: "表盘尺寸", value: "46mm" }], label: "月光银 / 46mm", price: 799, originalPrice: 899, stock: 13, salesCount: 45, image: image("Silver smartwatch with light woven strap and round display, premium ecommerce studio photography, pale warm background, no text"), status: "on" }
        ]
      },
      {
        id: "p10",
        name: "轻薄平板 11",
        subtitle: "高刷护眼屏｜学习办公两用",
        price: 1899,
        original: 2199,
        stock: 58,
        parent: "digital",
        category: "tablets",
        tags: ["top", "new"],
        status: "on",
        image: image("Slim silver tablet computer with a bright minimal screen and keyboard cover, premium ecommerce product photography, clean white studio, no text")
      }
    ],
    tiers: [
      { id: "normal", name: "普通会员", points: 0, discount: 100, benefits: "基础购物权益 · 积分回馈" },
      { id: "silver", name: "银卡会员", points: 1000, discount: 98, benefits: "全场 98 折 · 生日积分加赠" },
      { id: "gold", name: "金卡会员", points: 5000, discount: 90, benefits: "全场 9 折 · 每月专属礼券" },
      { id: "black", name: "黑卡会员", points: 12000, discount: 85, benefits: "全场 85 折 · 新品优先购" }
    ],
    banners: [
      { id: "b01", title: "影像旗舰 新一代", subtitle: "专业光学体验，记录每个精彩瞬间", label: "新品上市", target: "mini-shop.html?category=phones", image: image("Premium silver flagship smartphone on clean pale gray studio set with restrained orange light accent, wide ecommerce hero photography, no text", "landscape_16_9"), enabled: true },
      { id: "b02", title: "让家更清新", subtitle: "智能净化，舒适呼吸每一天", label: "品质生活", target: "mini-zone.html?zone=home", image: image("Minimal white air purifier in calm modern living room, pale warm gray interior, wide premium ecommerce hero photo, no text", "landscape_16_9"), enabled: true },
      { id: "b03", title: "轻装出发", subtitle: "为日常通勤留一份从容", label: "本周精选", target: "mini-zone.html?zone=fashion", image: image("Charcoal commuter backpack on a warm off-white pedestal with soft daylight, wide premium ecommerce hero photo, no text", "landscape_16_9"), enabled: true }
    ],
    zones: [
      { id: "digital", name: "手机数码", icon: "phone", subcats: [{ id: "phones", name: "手机" }, { id: "audio", name: "耳机音频" }, { id: "tablets", name: "平板" }, { id: "wearables", name: "智能穿戴" }] },
      { id: "home", name: "智能家电", icon: "home", subcats: [{ id: "air", name: "空气净化" }, { id: "cleaning", name: "清洁电器" }, { id: "kitchen", name: "厨房电器" }] },
      { id: "fashion", name: "服饰鞋包", icon: "bag", subcats: [{ id: "bags", name: "箱包" }, { id: "shoes", name: "鞋履" }, { id: "clothing", name: "服装" }] },
      { id: "food", name: "食品饮料", icon: "coffee", subcats: [{ id: "coffee", name: "咖啡冲饮" }, { id: "snacks", name: "休闲零食" }, { id: "drinks", name: "饮品" }] },
      { id: "beauty", name: "美妆个护", icon: "spark", subcats: [{ id: "care", name: "个人护理" }, { id: "skin", name: "护肤" }] },
      { id: "outdoor", name: "户外运动", icon: "run", subcats: [{ id: "sports", name: "运动装备" }, { id: "camp", name: "露营" }] },
      { id: "daily", name: "生活日用", icon: "sun", subcats: [{ id: "home-daily", name: "家居用品" }, { id: "travel", name: "出行好物" }] },
      { id: "more", name: "更多好物", icon: "grid", subcats: [{ id: "other", name: "精选好物" }] }
    ],
    cart: [
      { productId: "p01", qty: 1, selected: true },
      { productId: "p02", qty: 1, selected: true },
      { productId: "p03", qty: 1, selected: true }
    ],
    user: {
      id: "u1001",
      name: "林间有风",
      phone: "138****6218",
      points: 2680,
      distributor: true,
      referralCode: "LIN2680",
      avatar: "林",
      avatarDataUrl: "",
      gender: "女",
      birthday: "1994-08-16",
      province: "上海市",
      city: "上海市",
      district: "徐汇区",
      passwordConfigured: true,
      passwordUpdatedAt: "2026-09-20",
      authorizations: { location: true, camera: false, album: false, notifications: true },
      realName: { name: "林女士", maskedId: "310***********6218", status: "已认证" },
      pets: [
        { id: "PET-001", name: "团团", kind: "猫咪", breed: "英短", birthday: "2021-05-16" }
      ]
    },
    orders: [
      {
        id: "M202610190001",
        userId: "u1001",
        status: "pending_payment",
        createdAt: "2026-10-19 10:32",
        expiresAt: "2026-10-19 11:02",
        address: { name: "林女士", phone: "138****6218", text: "上海市徐汇区漕溪北路 88 号" },
        items: [{ productId: "p01", name: "Xiaomi 15 Ultra", image: image("Premium titanium flagship smartphone in pearl silver, clean white studio product photography, no text"), price: 6499, qty: 1 }],
        subtotal: 6499,
        discount: 0,
        shippingFee: 0,
        total: 6499,
        paymentMethod: "微信支付",
        remark: ""
      },
      {
        id: "M202610180024",
        userId: "u1001",
        status: "to_ship",
        createdAt: "2026-10-18 16:20",
        paidAt: "2026-10-18 16:24",
        address: { name: "林女士", phone: "138****6218", text: "上海市徐汇区漕溪北路 88 号" },
        items: [{ productId: "p02", name: "Xiaomi Buds 5 Pro", image: image("Minimal white wireless earbuds and compact case on white background, no text"), price: 1299, qty: 1 }],
        subtotal: 1299,
        discount: 0,
        shippingFee: 0,
        total: 1299,
        paymentMethod: "微信支付",
        remark: ""
      },
      {
        id: "M202610170018",
        userId: "u1001",
        status: "to_receive",
        createdAt: "2026-10-17 12:05",
        paidAt: "2026-10-17 12:11",
        shippedAt: "2026-10-18 09:18",
        address: { name: "林女士", phone: "138****6218", text: "上海市徐汇区漕溪北路 88 号" },
        items: [{ productId: "p03", name: "米家空气净化器 5", image: image("Minimal white air purifier, product photography on a white background, no text"), price: 1799, qty: 1 }],
        subtotal: 1799,
        discount: 0,
        shippingFee: 0,
        total: 1799,
        carrier: "顺丰速运",
        trackingNo: "SF148620261018",
        tracking: [
          { time: "10-19 08:42", text: "快件已到达上海徐汇集散中心", place: "上海" },
          { time: "10-18 21:16", text: "快件离开杭州转运中心，发往上海", place: "杭州" },
          { time: "10-18 09:18", text: "顺丰已揽收，正在发往下一站", place: "杭州" }
        ],
        paymentMethod: "微信支付",
        remark: ""
      },
      {
        id: "M202610150012",
        userId: "u1001",
        status: "completed",
        createdAt: "2026-10-15 09:18",
        paidAt: "2026-10-15 09:22",
        shippedAt: "2026-10-15 14:02",
        receivedAt: "2026-10-17 18:10",
        address: { name: "林女士", phone: "138****6218", text: "上海市徐汇区漕溪北路 88 号" },
        items: [{ productId: "p06", name: "云南高山挂耳咖啡", image: image("Coffee pouch and cup on cream studio background, no text"), price: 59, qty: 2 }],
        subtotal: 118,
        discount: 20,
        shippingFee: 0,
        total: 98,
        carrier: "中通快递",
        trackingNo: "ZTO881026101522",
        tracking: [{ time: "10-17 18:10", text: "已签收，感谢使用中通快递", place: "上海" }],
        paymentMethod: "微信支付",
        remark: "",
        afterSaleId: "AS202610190001"
      },
      {
        id: "M202610140006",
        userId: "u1001",
        status: "completed",
        createdAt: "2026-10-14 10:26",
        paidAt: "2026-10-14 10:31",
        shippedAt: "2026-10-14 15:08",
        receivedAt: "2026-10-16 17:42",
        address: { name: "林女士", phone: "138****6218", text: "上海市徐汇区漕溪北路 88 号" },
        items: [{ productId: "p06", name: "云南高山挂耳咖啡", image: image("Coffee pouch and cup on cream studio background, no text"), price: 59, qty: 1 }],
        subtotal: 59,
        discount: 0,
        shippingFee: 0,
        total: 59,
        carrier: "中通快递",
        trackingNo: "ZTO881026101426",
        tracking: [{ time: "10-16 17:42", text: "已签收，感谢使用中通快递", place: "上海" }],
        paymentMethod: "微信支付",
        remark: ""
      },
      {
        id: "M202610120026",
        userId: "u1003",
        status: "completed",
        createdAt: "2026-10-12 14:10",
        paidAt: "2026-10-12 14:16",
        receivedAt: "2026-10-15 18:30",
        address: { name: "陈小姐", phone: "136****9028", text: "杭州市西湖区文三路 188 号" },
        items: [{ productId: "p02", name: "Xiaomi Buds 5 Pro", image: image("Minimal white wireless earbuds and compact charging case, premium studio product photography, soft white background, no text"), price: 1299, qty: 2 }],
        subtotal: 2598,
        discount: 0,
        shippingFee: 0,
        total: 2598,
        paymentMethod: "微信支付",
        remark: "",
        referralSnapshot: { promoterIds: ["u1001"], sourceTokenId: "SH-CHEN-01", channel: "poster", boundAtOrder: false, ruleVersion: "CR-2026-03" },
        commissionSnapshot: [{ promoterId: "u1001", relationId: "RR-1003", level: 1, basis: 2598, rate: 5, amount: 129.9, tierId: "silver", ruleVersion: "CR-2026-03", shareTokenId: "SH-CHEN-01" }]
      }
    ],
    afterSales: [
      {
        id: "AS202610190001",
        orderId: "M202610150012",
        type: "refund",
        reason: "商品与描述不符",
        description: "外包装有轻微破损，希望退还其中一件。",
        amount: 49,
        status: "pending",
        createdAt: "2026-10-19 11:08"
      }
    ],
    coupons: [
      { id: "C20", name: "满 199 减 20", type: "amount", value: 20, threshold: 199, stock: 280, claimed: 64, status: "active", validDays: 30 },
      { id: "C50", name: "满 499 减 50", type: "amount", value: 50, threshold: 499, stock: 160, claimed: 37, status: "active", validDays: 30 },
      { id: "C95", name: "全场 95 折", type: "rate", value: 95, threshold: 0, stock: 500, claimed: 214, status: "active", validDays: 14 }
    ],
    claimedCoupons: [{ id: "C20", status: "available", receivedAt: "2026-10-18" }],
    campaigns: [
      { id: "A618", name: "秋日焕新季", type: "campaign", subtitle: "精选好物限时直降，会员再享专属礼遇", status: "active", startAt: "2026-10-16", endAt: "2026-10-26", badge: "全场活动", productIds: ["p01", "p03", "p05"] },
      { id: "A24", name: "会员周末礼", type: "campaign", subtitle: "周末下单加赠双倍成长积分", status: "active", startAt: "2026-10-18", endAt: "2026-10-20", badge: "会员专享", productIds: ["p02", "p06"] }
    ],
    flashSales: [
      { id: "FS01", productId: "p02", title: "每日限时秒杀", price: 999, originalPrice: 1299, quota: 80, sold: 28, startAt: "10:00", endAt: "22:00", status: "active" }
    ],
    groupDeals: [
      { id: "GD01", productId: "p07", title: "好友一起拼", groupPrice: 329, originalPrice: 399, targetMembers: 3, joined: 2, status: "active", expiresIn: "23:45:00" }
    ],
    groupParticipations: [{ id: "GP01", dealId: "GD01", groupCode: "T8K2", joined: 2, target: 3, status: "assembling", createdAt: "2026-10-19 09:42" }],
    commissions: [
      { id: "CM001", orderId: "M202610150012", userId: "u1001", amount: 19.6, originalAmount: 19.6, basis: 392, level: 1, rate: 5, ruleVersion: "CR-2026-03", status: "frozen", createdAt: "2026-10-17 18:10", releaseAt: "2026-10-24 18:10" },
      { id: "CM002", orderId: "M202610180024", userId: "u1001", amount: 64.95, originalAmount: 64.95, basis: 1299, level: 1, rate: 5, ruleVersion: "CR-2026-03", status: "pending", createdAt: "2026-10-18 16:24" },
      { id: "CM003", orderId: "M202610120026", userId: "u1001", amount: 129.9, originalAmount: 129.9, basis: 2598, level: 1, rate: 5, ruleVersion: "CR-2026-03", status: "available", createdAt: "2026-10-15 18:30", releasedAt: "2026-10-18 09:00" }
    ],
    withdrawals: [],
    promoterApplications: [
      { id: "PA-260018", userId: "u1002", status: "pending", motivation: "长期分享数码产品，希望申请品牌推广员", createdAt: "2026-10-19 09:42" }
    ],
    promoterProfiles: [
      { userId: "u1001", status: "active", tierId: "silver", approvedAt: "2025-06-02", referralCode: "LIN2680", riskStatus: "normal", selfPurchaseEnabled: false },
      { userId: "u1003", status: "active", tierId: "standard", approvedAt: "2026-02-18", referralCode: "CHEN9028", riskStatus: "normal", selfPurchaseEnabled: false },
      { userId: "u1004", status: "active", tierId: "standard", approvedAt: "2026-08-05", referralCode: "U10045519", riskStatus: "normal", selfPurchaseEnabled: false }
    ],
    promoterStatusHistory: [
      { id: "PSH-001", userId: "u1001", fromStatus: "not_promoter", toStatus: "active", reason: "首批合作推广员", actor: "林运营", createdAt: "2025-06-02 10:00" }
    ],
    referralRelations: [
      { id: "RR-1003", promoterId: "u1001", memberId: "u1003", status: "active", boundAt: "2026-02-18 14:20", sourceTokenId: "SH-LIN-01", channel: "wechat_friend", bindType: "first_bind" },
      { id: "RR-1004", promoterId: "u1003", memberId: "u1004", status: "active", boundAt: "2026-03-02 11:16", sourceTokenId: "SH-CHEN-01", channel: "poster", bindType: "first_bind" },
      { id: "RR-1005", promoterId: "u1004", memberId: "u1005", status: "active", boundAt: "2026-08-05 17:35", sourceTokenId: "SH-U1004-01", channel: "wechat_moments", bindType: "first_bind" }
    ],
    shareTokens: [
      { id: "SH-LIN-01", token: "tkn_L8mQ2a", promoterId: "u1001", productId: "p01", channel: "wechat_friend", status: "active", createdAt: "2026-10-18 10:12", expiresAt: "2026-11-18 10:12", version: 1 },
      { id: "SH-CHEN-01", token: "tkn_C3vP7n", promoterId: "u1003", productId: "p06", channel: "poster", status: "active", createdAt: "2026-10-17 15:30", expiresAt: "2026-11-17 15:30", version: 1 },
      { id: "SH-U1004-01", token: "tkn_U4kR9x", promoterId: "u1004", productId: "", channel: "wechat_moments", status: "active", createdAt: "2026-08-05 17:40", expiresAt: "2026-11-05 17:40", version: 1 }
    ],
    shareEvents: [
      { id: "SE-901", tokenId: "SH-LIN-01", promoterId: "u1001", productId: "p01", channel: "wechat_friend", event: "order_paid", orderId: "M202610150012", visitorKey: "anon_71a2", createdAt: "2026-10-15 09:22" },
      { id: "SE-902", tokenId: "SH-LIN-01", promoterId: "u1001", productId: "p01", channel: "wechat_friend", event: "landing_view", visitorKey: "anon_88c1", createdAt: "2026-10-19 10:05" }
    ],
    distributionTiers: [
      { id: "standard", name: "普通推广员", sort: 1, conditions: [{ metric: "sales", op: ">=", value: 0 }], combination: "AND", period: "近90日", status: "active" },
      { id: "silver", name: "银牌推广员", sort: 2, conditions: [{ metric: "sales", op: ">=", value: 10000 }, { metric: "newMembers", op: ">=", value: 10 }], combination: "AND", period: "近90日", status: "active" },
      { id: "gold", name: "金牌推广员", sort: 3, conditions: [{ metric: "sales", op: ">=", value: 50000 }, { metric: "newMembers", op: ">=", value: 30 }], combination: "AND", period: "近90日", status: "active" }
    ],
    tierRuleVersion: "TR-2026-04",
    tierRuleVersions: [
      { id: "TR-2026-04", name: "推广员成长规则", status: "active", effectiveAt: "2026-10-01 00:00", createdAt: "2026-09-25 16:00", note: "统计近90日有效销售额与有效拉新", tiers: [] },
      { id: "TR-2026-03", name: "夏季推广员成长规则", status: "archived", effectiveAt: "2026-07-01 00:00", createdAt: "2026-06-20 10:00", note: "历史规则只读", tiers: [] }
    ],
    commissionRuleVersions: [
      { id: "CR-2026-03", name: "秋季分销政策", status: "active", effectiveAt: "2026-10-01 00:00", createdAt: "2026-09-25 16:00", tiers: { standard: [5, 2, 1], silver: [6, 2.5, 1.2], gold: [7, 3, 1.5] }, scope: "全场商品", note: "按订单商品实付净额计佣，不含运费" },
      { id: "CR-2026-02", name: "夏季分销政策", status: "archived", effectiveAt: "2026-07-01 00:00", createdAt: "2026-06-20 10:00", tiers: { standard: [4, 1.5, 0.5], silver: [5, 2, 1], gold: [6, 2.5, 1.2] }, scope: "全场商品", note: "历史快照只读" }
    ],
    commissionLedger: [
      { id: "CL-001", commissionId: "CM001", userId: "u1001", type: "commission_accrued", amount: 19.6, direction: "credit", orderId: "M202610150012", level: 1, ruleVersion: "CR-2026-03", idempotencyKey: "order:M202610150012:u1001:1", createdAt: "2026-10-17 18:10" },
      { id: "CL-002", commissionId: "CM001", userId: "u1001", type: "commission_frozen", amount: 19.6, direction: "credit", orderId: "M202610150012", level: 1, ruleVersion: "CR-2026-03", idempotencyKey: "freeze:CM001", createdAt: "2026-10-17 18:10" },
      { id: "CL-003", commissionId: "CM002", userId: "u1001", type: "commission_accrued", amount: 64.95, direction: "credit", orderId: "M202610180024", level: 1, ruleVersion: "CR-2026-03", idempotencyKey: "order:M202610180024:u1001:1", createdAt: "2026-10-18 16:24" },
      { id: "CL-004", commissionId: "CM003", userId: "u1001", type: "commission_accrued", amount: 129.9, direction: "credit", orderId: "M202610120026", level: 1, ruleVersion: "CR-2026-03", idempotencyKey: "order:M202610120026:u1001:1", createdAt: "2026-10-15 18:30" },
      { id: "CL-005", commissionId: "CM003", userId: "u1001", type: "commission_released", amount: 129.9, direction: "credit", orderId: "M202610120026", level: 1, ruleVersion: "CR-2026-03", idempotencyKey: "release:CM003", createdAt: "2026-10-18 09:00" }
    ],
    payoutChannels: [
      { id: "PC-WX-01", userId: "u1001", type: "wechat_merchant", label: "微信商户出款", maskedAccount: "林* · 微信实名", tokenRef: "payout_token_demo_01", verified: true, status: "active", verifiedAt: "2026-09-20" },
      { id: "PC-BANK-01", userId: "u1001", type: "bank_transfer", label: "人工银行转账", maskedAccount: "招商银行 · 尾号 6218", tokenRef: "secure_ref_demo_01", verified: true, status: "active", verifiedAt: "2026-09-20" }
    ],
    payoutAttempts: [],
    distributionRiskCases: [
      { id: "DR-0081", userId: "u1003", type: "high_frequency", level: "medium", status: "reviewing", summary: "短时分享访问与注册转化偏高，待人工核验", createdAt: "2026-10-19 08:55", source: "risk_rule:R-04" }
    ],
    tierEvaluations: [
      { id: "TE-202610-01", userId: "u1001", tierId: "silver", ruleVersion: "TIER-2026-04", period: "近90日", result: "matched", reason: "有效销售额与有效拉新人数均达标", evaluatedAt: "2026-10-01 02:00" }
    ],
    distributionAudit: [
      { id: "DA-001", actor: "林运营", action: "promoter.approve", targetId: "u1001", reason: "首批合作推广员", createdAt: "2025-06-02 10:00" },
      { id: "DA-002", actor: "系统任务", action: "commission.rule.publish", targetId: "CR-2026-03", reason: "版本发布，历史订单快照不变", createdAt: "2026-10-01 00:00" }
    ],
    distributionSettings: { maxLevels: 3, freezeDays: 7, minimumPayout: 100, singlePayoutLimit: 5000, dailyPayoutLimit: 10000, autoReviewThreshold: 300, highRiskManualReview: true, payoutChannels: ["wechat_merchant", "bank_transfer"], pendingConfirm: true },
    users: [
      { id: "u1001", name: "林间有风", phone: "138****6218", tier: "银卡会员", points: 2680, orders: 12, spend: 8326, distributor: true, status: "active", joinedAt: "2025-04-18" },
      { id: "u1002", name: "周先生", phone: "139****2701", tier: "金卡会员", points: 7380, orders: 26, spend: 18220, distributor: false, status: "active", joinedAt: "2024-12-03" },
      { id: "u1003", name: "陈小姐", phone: "136****9028", tier: "普通会员", points: 620, orders: 3, spend: 890, distributor: true, status: "active", joinedAt: "2026-02-16" },
      { id: "u1004", name: "许同学", phone: "137****5519", tier: "银卡会员", points: 1640, orders: 8, spend: 3980, distributor: true, status: "active", joinedAt: "2025-08-22" },
      { id: "u1005", name: "赵女士", phone: "158****1162", tier: "普通会员", points: 180, orders: 1, spend: 299, distributor: false, status: "disabled", joinedAt: "2026-08-05" }
    ],
    carriers: [
      { id: "sf", name: "顺丰速运", enabled: true },
      { id: "yto", name: "圆通速递", enabled: true },
      { id: "zto", name: "中通快递", enabled: true },
      { id: "jd", name: "京东物流", enabled: true }
    ],
    shippingTemplates: [
      {
        id: "SHIP-STANDARD",
        name: "全国标准配送",
        fee: 8,
        freeShipping: false,
        freeThreshold: 99,
        rules: [
          { provinces: ["上海市", "江苏省", "浙江省"], fee: 0, freeShipping: true, freeThreshold: 0 },
          { provinces: ["西藏自治区", "新疆维吾尔自治区", "青海省"], fee: 15, freeShipping: false, freeThreshold: 0 }
        ]
      }
    ],
    settings: { commissionRate: 5, minimumWithdrawal: 100, freeShippingThreshold: 99 },
    legalDocuments: [
      { id: "privacy", title: "隐私声明", category: "隐私政策", version: "v1.0", updatedAt: "2026-10-01", status: "active", content: "我们仅为提供商城服务收集必要的信息，包括账号资料、订单与配送信息、客服沟通内容及必要的设备信息。我们会采取合理的安全措施保护信息，并按法律法规要求处理和保存。您可以在授权管理中调整非必要权限，或通过安全中心提交账号注销申请。" },
      { id: "mall-terms", title: "商城用户服务协议", category: "服务协议", version: "v1.0", updatedAt: "2026-10-01", status: "active", content: "欢迎使用本商城服务。您可浏览和购买商品、管理订单、申请售后及联系在线客服。提交订单前请核对商品、规格、价格和收货信息。支付、配送、退款及售后以订单页面和运营规则为准。" },
      { id: "membership-rules", title: "会员与积分规则", category: "业务规则", version: "v1.0", updatedAt: "2026-10-01", status: "active", content: "会员等级、成长值、积分获取和使用规则由商城运营页面公布。积分及会员权益不可兑换现金，具体有效期、使用范围和限制以活动页面及订单结算页提示为准。" },
      { id: "after-sales-rules", title: "售后与退换货规则", category: "业务规则", version: "v1.0", updatedAt: "2026-10-01", status: "active", content: "您可在订单页面提交售后申请。售后范围、处理时限、退货地址及退款方式以订单详情和客服确认信息为准。商品及配件请保持完整，依法不适用无理由退货的商品除外。" }
    ]
  };

  const demoSales = [2680, 1940, 1510, 1280, 980, 860, 720, 640];
  const reviewSamples = [
    { name: "周*然", date: "2026-10-16", text: "做工和质感都很好，和页面介绍一致，物流也很快。", images: [] },
    { name: "M*e", date: "2026-10-12", text: "包装完整，细节很用心，日常使用体验不错。", images: [] },
    { name: "陈*宇", date: "2026-10-08", text: "已经用了一段时间，整体满意，会推荐给朋友。", images: [] }
  ];
  defaults.products = defaults.products.map((product, index) => {
    const gallery = product.gallery?.length ? product.gallery : [
      product.image,
      image(`Premium ecommerce detail photography of ${product.name}, rear or side angle, clean pale warm-gray studio, soft natural shadow, no logo, no text`),
      image(`Close-up material and craftsmanship detail of ${product.name}, premium commercial product photography, bright neutral background, no text`)
    ];
    const skuList = product.skus?.length ? product.skus : [{
      id: `${product.id}-sku-001`,
      spuId: product.spuId || product.id,
      specs: [{ name: "版本", value: "标准版" }],
      label: "标准版",
      price: Number(product.price || 0),
      originalPrice: Number(product.original || product.price || 0),
      stock: Number(product.stock || 0),
      image: gallery[0],
      salesCount: demoSales[index] || 300,
      barcode: "",
      status: product.status || "on"
    }];
    return {
      ...product,
      spuId: product.spuId || product.id,
      gallery,
      skus: skuList.map((sku, skuIndex) => ({
        ...sku,
        id: sku.id || `${product.id}-sku-${String(skuIndex + 1).padStart(3, "0")}`,
        spuId: product.spuId || product.id,
        specs: sku.specs || [{ name: "版本", value: "标准版" }],
        label: sku.label || (sku.specs || [{ value: "标准版" }]).map(spec => spec.value).join(" / "),
        originalPrice: Number(sku.originalPrice ?? sku.original ?? sku.price ?? product.price ?? 0),
        image: sku.image || gallery[0],
        salesCount: Number(sku.salesCount ?? demoSales[index] ?? 300),
        status: sku.status || product.status || "on"
      })),
      price: Math.min(...skuList.filter(sku => sku.status !== "off").map(sku => Number(sku.price)), Number(product.price || 0)),
      stock: skuList.reduce((sum, sku) => sum + Number(sku.stock || 0), 0),
      salesCount: Number(product.salesCount ?? demoSales[index] ?? 300),
      rating: Number(product.rating || 4.8),
      reviewCount: Number(product.reviewCount || 386 + index * 117),
      shippingTemplateId: product.shippingTemplateId || "SHIP-STANDARD",
      detailIntro: product.detailIntro || `${product.name} ${product.subtitle || "为日常生活带来更好的使用体验。"}严选品质与实用设计，提供清晰的商品保障与售后服务。`,
      detailImages: product.detailImages?.length ? product.detailImages : [
        image(`Long-form ecommerce product detail image for ${product.name}, elegant product in a real modern home setting, premium Chinese retail visual merchandising, no text`, "portrait_4_3"),
        image(`Product feature close-up for ${product.name}, realistic premium studio photography, bright clean background, no text`, "portrait_4_3")
      ],
      reviews: product.reviews?.length ? product.reviews : reviewSamples.map(review => ({ ...review }))
    };
  });

  defaults.addresses = defaults.addresses || [
    { id: "ADDR-001", name: "林女士", phone: "138****6218", province: "上海市", city: "上海市", district: "徐汇区", detail: "漕溪北路 88 号", isDefault: true }
  ];

  function read() {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) {
        localStorage.setItem(KEY, JSON.stringify(defaults));
        return JSON.parse(JSON.stringify(defaults));
      }
      const parsed = JSON.parse(stored);
      const state = { ...JSON.parse(JSON.stringify(defaults)), ...parsed };
      state.user = { ...defaults.user, ...(state.user || {}) };
      state.user.authorizations = { ...defaults.user.authorizations, ...(state.user.authorizations || {}) };
      state.user.realName = { ...defaults.user.realName, ...(state.user.realName || {}) };
      state.user.pets ||= JSON.parse(JSON.stringify(defaults.user.pets));
      state.legalDocuments ||= JSON.parse(JSON.stringify(defaults.legalDocuments));
      state.shippingTemplates ||= JSON.parse(JSON.stringify(defaults.shippingTemplates));
      state.orders ||= [];
      if (!state.orders.some(order => order.id === "M202610140006")) {
        const reviewDemoOrder = defaults.orders.find(order => order.id === "M202610140006");
        state.orders.push(JSON.parse(JSON.stringify(reviewDemoOrder)));
      }
      state.products = (state.products || []).map((product, index) => {
        const fallback = defaults.products.find(item => item.id === product.id) || defaults.products[index];
        const gallery = product.gallery?.length ? product.gallery : fallback?.gallery || [product.image].filter(Boolean);
        const legacySeedSku = product.skus?.length === 1
          && fallback?.skus?.length > 1
          && product.name === fallback.name
          && product.skus[0].id === `${product.id}-sku-001`
          && product.skus[0].label === "标准版";
        const migratedSkus = legacySeedSku
          ? (() => {
            const seedSkus = fallback.skus;
            const splitTotal = (total, field) => {
              const weights = seedSkus.map(sku => Math.max(0, Number(sku[field] || 0)));
              const weightSum = weights.reduce((sum, value) => sum + value, 0) || seedSkus.length;
              let remaining = Math.max(0, Math.floor(Number(total) || 0));
              return seedSkus.map((_, skuIndex) => {
                const part = skuIndex === seedSkus.length - 1
                  ? remaining
                  : Math.floor(Number(total || 0) * (weights[skuIndex] || 1) / weightSum);
                remaining -= part;
                return part;
              });
            };
            const oldSku = product.skus[0];
            const stocks = splitTotal(oldSku.stock ?? product.stock, "stock");
            const sales = splitTotal(oldSku.salesCount ?? product.salesCount, "salesCount");
            return seedSkus.map((sku, skuIndex) => ({
              ...sku,
              stock: stocks[skuIndex],
              salesCount: sales[skuIndex],
              status: oldSku.status || product.status || sku.status
            }));
          })()
          : null;
        const rawSkus = migratedSkus || (product.skus?.length ? product.skus : [{
          id: `${product.id}-sku-001`,
          spuId: product.spuId || product.id,
          specs: [{ name: "版本", value: "标准版" }],
          label: "标准版",
          price: Number(product.price || 0),
          originalPrice: Number(product.original || product.price || 0),
          stock: Number(product.stock || 0),
          image: gallery[0],
          salesCount: Number(product.salesCount || fallback?.salesCount || 300),
          status: product.status || "on"
        }]);
        const skus = rawSkus.map((sku, skuIndex) => ({
          ...sku,
          id: sku.id || `${product.id}-sku-${String(skuIndex + 1).padStart(3, "0")}`,
          spuId: product.spuId || product.id,
          specs: sku.specs || [{ name: "版本", value: "标准版" }],
          label: sku.label || (sku.specs || [{ value: "标准版" }]).map(spec => spec.value).join(" / "),
          price: Number(sku.price ?? product.price ?? 0),
          originalPrice: Number(sku.originalPrice ?? sku.original ?? sku.price ?? product.price ?? 0),
          stock: Number(sku.stock || 0),
          image: sku.image || gallery[0],
          salesCount: Number(sku.salesCount || fallback?.salesCount || 300),
          status: sku.status || product.status || "on"
        }));
        return {
          ...fallback,
          ...product,
          spuId: product.spuId || product.id,
          gallery,
          skus,
          rating: Number(product.rating || fallback?.rating || 4.8),
          reviewCount: Number(product.reviewCount || fallback?.reviewCount || 386),
          detailIntro: product.detailIntro || fallback?.detailIntro || "",
          detailImages: product.detailImages?.length ? product.detailImages : fallback?.detailImages || [],
          shippingTemplateId: product.shippingTemplateId || fallback?.shippingTemplateId || state.shippingTemplates[0]?.id || "",
          reviews: (product.reviews?.length ? product.reviews : fallback?.reviews || []).map((review, reviewIndex) => ({
            ...review,
            id: review.id || `REV-${product.id}-${reviewIndex + 1}`,
            rating: Number(review.rating || 5),
            status: review.status || "visible",
            reply: review.reply || null
          })),
          price: Math.min(...(skus.filter(sku => sku.status === "on").length ? skus.filter(sku => sku.status === "on") : skus).map(sku => sku.price)),
          stock: skus.reduce((sum, sku) => sum + sku.stock, 0)
        };
      });
      return state;
    } catch {
      return JSON.parse(JSON.stringify(defaults));
    }
  }

  function write(next) {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("mall:data-updated", { detail: next }));
  }

  window.MallData = { KEY, defaults, read, write, image };
})();
