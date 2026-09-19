export const brands = [
  "Alexander McQueen",
  "Balenciaga",
  "Dior",
  "Fendi",
  "Givenchy",
  "Gucci",
  "Hermès",
  "Valentino",
  "Louis Vuitton",
  "Prada",
];
export const slugify = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const types = [
  [
    "tshirt",
    "clothing",
    "Футболка Washed Oversize",
    "Washed oversized tee",
    129000,
    "tshirt",
    "Чорний",
    "#24252a",
    "літо",
  ],
  [
    "hoodie",
    "clothing",
    "Худі Essential Zip",
    "Essential zip hoodie",
    219000,
    "hoodie",
    "Сірий",
    "#a4a7af",
    "демісезон",
  ],
  [
    "jacket",
    "clothing",
    "Куртка Cobalt Puffer",
    "Cobalt puffer jacket",
    329000,
    "puffer",
    "Синій",
    "#2c53df",
    "зима",
  ],
  [
    "sneakers",
    "shoes",
    "Кросівки Future Runner",
    "Future Runner sneakers",
    279000,
    "sneakers",
    "Білий",
    "#efefee",
    "демісезон",
  ],
  [
    "trousers",
    "clothing",
    "Штани Utility Cargo",
    "Utility cargo trousers",
    189000,
    "cargo",
    "Чорний",
    "#2b2c32",
    "демісезон",
  ],
  [
    "bag",
    "accessories",
    "Сумка Urban Crossbody",
    "Urban crossbody bag",
    149000,
    "bag",
    "Чорний",
    "#202126",
    "всесезон",
  ],
  [
    "tshirt",
    "clothing",
    "Футболка Everyday Fit",
    "Everyday fit tee",
    119000,
    "tshirt",
    "Чорний",
    "#24252a",
    "літо",
  ],
  [
    "hoodie",
    "clothing",
    "Худі Relaxed Club",
    "Relaxed club hoodie",
    239000,
    "hoodie",
    "Сірий",
    "#a4a7af",
    "демісезон",
  ],
  [
    "sneakers",
    "shoes",
    "Кросівки City Low",
    "City low sneakers",
    259000,
    "sneakers",
    "Білий",
    "#efefee",
    "літо",
  ],
  [
    "bag",
    "accessories",
    "Сумка Daily Compact",
    "Daily compact bag",
    139000,
    "bag",
    "Чорний",
    "#202126",
    "всесезон",
  ],
];
export function seedProducts() {
  return brands.flatMap((brand, bi) =>
    types.map((t, ti) => {
      const [type, category, name, nameEn, base, image, color, hex, season] = t;
      const price = base + bi * 5000;
      const sizes =
        category === "shoes"
          ? ["39", "40", "41", "42", "43", "44", "45"]
          : category === "accessories"
            ? ["ONE SIZE"]
            : ["XS", "S", "M", "L", "XL", "XXL"];
      const colors = [
        { name: color, hex },
        {
          name: color === "Синій" ? "Чорний" : "Синій",
          hex: color === "Синій" ? "#26282d" : "#3155ce",
        },
      ];
      return {
        id: `p${String(bi * 10 + ti + 1).padStart(3, "0")}`,
        slug: `${slugify(brand)}-${type}-${ti + 1}`,
        brand,
        name,
        nameEn,
        category,
        type,
        price,
        oldPrice: ti % 3 === 0 ? price + 60000 : null,
        description:
          "Демонстраційна картка для наповнення каталогу SNAP. Фото згенероване і не зображує реальний товар зазначеного бренду. Перед публікацією замініть фото, опис, склад, ціни та заміри.",
        descriptionEn:
          "Demo listing for the SNAP catalog. Generated imagery does not depict an actual product from this brand. Replace images, description, composition, prices and measurements before publishing.",
        composition: "Додайте фактичний склад товару",
        fit: "Вільний крій",
        season,
        colors,
        sizes,
        variants: colors.flatMap((c, ci) =>
          sizes.map((s, si) => ({
            color: c.name,
            size: s,
            available: !(si === 0 && ci === 1),
          })),
        ),
        images: [`/assets/${image}.webp`],
        badge: ti === 0 ? "hit" : ti === 2 ? "new" : ti === 5 ? "last" : "",
        demo: true,
        active: true,
        sku: `SN-${bi + 1}-${ti + 1}`,
        createdAt: new Date(
          Date.now() - (bi * 10 + ti) * 86400000,
        ).toISOString(),
        popularity: 100 - bi * 2 - ti,
        sizeGuide:
          "XS: 86–91 см; S: 92–97 см; M: 98–103 см; L: 104–109 см; XL: 110–115 см; XXL: 116–121 см. Демонстраційні значення обхвату грудей. Замініть реальними замірами.",
      };
    }),
  );
}
export const defaultSettings = {
  storeName: "SNAP",
  headline: "Твій стиль.\nТвої правила.",
  headlineEn: "Your style.\nYour rules.",
  heroText: "Одяг, який говорить за тебе. Обирай свій ритм — решту ми зібрали.",
  heroTextEn: "Wear your own energy. Find your rhythm. Build your look.",
  heroProductId: "",
  shopLive: false,
  seoIndex: false,
  supportEmail: "",
  phone: "",
  telegram: "",
  instagram: "",
  viber: "",
  whatsapp: "",
  sellerDetails: "",
  freeShipping: 777700,
  bonusPercent: 3,
  bonusSpendPercent: 10,
  deliveryText:
    "Нова пошта, Укрпошта або кур’єр по Україні. Оплата при отриманні. Вартість доставки — за тарифами перевізника. Від 7 777 грн після знижок — за рахунок магазину. Комісія за післяплату, якщо є, оплачується окремо.",
  deliveryTextEn:
    "Nova Poshta, Ukrposhta or courier within Ukraine. Cash on delivery. Carrier rates apply; orders of UAH 7,777 or more after discounts ship at our expense. Any cash-on-delivery fee is paid separately.",
  returnsText:
    "Умови повернення ще не затверджено продавцем. Додайте адресу для повернення, строки, винятки та порядок звернення перед відкриттям продажів.",
  returnsTextEn:
    "The seller has not finalized the return policy. Add the return address, time limits, exclusions and contact procedure before enabling sales.",
  privacyText:
    "Перед запуском додайте політику конфіденційності: хто обробляє дані, навіщо, як довго зберігає, яким сервісам передає і як звернутися для видалення.",
  privacyTextEn:
    "Before launch, provide your data controller, processing purposes, retention period, service providers and data deletion contact.",
  termsText:
    "Перед запуском заповніть публічну оферту та реквізити продавця. Товари позиціонуються як репліки, не оригінали. SNAP не є офіційним представником зазначених брендів.",
  termsTextEn:
    "Add your terms of sale and seller details before launch. Products are replicas, not originals. SNAP is not affiliated with the listed brands.",
  policiesApproved: false,
  newsletterEnabled: false,
  analyticsEnabled: false,
  gaId: "",
  metaPixelId: "",
  tiktokPixelId: "",
};
