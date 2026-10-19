(() => {
  const KEY = "mall-prototype-v2";
  const image = (prompt, size = "square") =>
    `https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;

  const defaults = {
    points: 2680,
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
        image: image("Premium titanium flagship smartphone in pearl silver, rear camera detail, clean white studio product photography, subtle warm gray shadow, centered, no text")
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
        image: image("Minimal white wireless earbuds and compact charging case, premium studio product photography, soft white background, warm gray shadow, no text")
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
        image: image("Minimal white and pale gray running shoe in profile, premium athletic footwear studio photography, clean white backdrop, no logo no text")
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
    ]
  };

  function read() {
    try {
      const stored = localStorage.getItem(KEY);
      if (!stored) {
        localStorage.setItem(KEY, JSON.stringify(defaults));
        return JSON.parse(JSON.stringify(defaults));
      }
      const parsed = JSON.parse(stored);
      return { ...JSON.parse(JSON.stringify(defaults)), ...parsed };
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
