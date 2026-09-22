import { sizePrice } from "../shared/product-pricing.js";
import { productImages } from "../shared/product-media.js";
export class PublicError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}
export const bulkPercent = (quantity) =>
  quantity >= 5 ? Math.min(quantity, 20) : 0;
export function quoteCart({
  items,
  product,
  settings,
  promo = null,
  balance = 0,
  bonus = 0,
  allowDemo = true,
}) {
  if (!Array.isArray(items) || items.length > 100)
    throw new PublicError("Некоректний кошик");
  const map = new Map();
  for (const raw of items) {
    const key = [raw.productId, raw.color, raw.size].join("\u0000");
    if (
      !Number.isSafeInteger(raw.quantity) ||
      raw.quantity < 1 ||
      raw.quantity > 50
    )
      throw new PublicError("Кількість: від 1 до 50");
    const previous = map.get(key);
    if (previous) previous.quantity += raw.quantity;
    else map.set(key, { ...raw });
  }
  const lines = [...map.values()].map((item) => {
    const p = product(item.productId);
    if (!p || !p.active) throw new PublicError("Товар більше недоступний");
    if (p.demo && !allowDemo)
      throw new PublicError(
        "Демонстраційний товар не можна купити. Замініть його у кошику.",
      );
    if (item.quantity > 50)
      throw new PublicError("Максимум 50 одиниць одного варіанта");
    if (
      !p.variants.some(
        (v) => v.color === item.color && v.size === item.size && v.available,
      )
    )
      throw new PublicError(`${p.name}: обраний колір або розмір недоступний`);
    return {
      ...item,
      name: p.name,
      nameEn: p.nameEn,
      brand: p.brand,
      slug: p.slug,
      image: productImages(p, item.color)[0],
      price: sizePrice(p, item.size),
      total: sizePrice(p, item.size) * item.quantity,
      demo: p.demo,
    };
  });
  const quantity = lines.reduce((s, l) => s + l.quantity, 0),
    subtotal = lines.reduce((s, l) => s + l.total, 0);
  if (quantity > 200)
    throw new PublicError("Максимум 200 речей в одному замовленні");
  let promoPercent = 0;
  if (promo) {
    if (
      !promo.active ||
      (promo.expires && new Date(promo.expires).getTime() < Date.now()) ||
      subtotal < promo.min_total ||
      (promo.max_uses && promo.used >= promo.max_uses)
    )
      throw new PublicError("Промокод недійсний або умови не виконано");
    promoPercent = promo.percent;
  }
  const bulk = bulkPercent(quantity),
    percent = Math.max(bulk, promoPercent),
    discount = Math.round((subtotal * percent) / 100),
    afterDiscount = subtotal - discount;
  const bonusCap = Math.floor(
    (afterDiscount * settings.bonusSpendPercent) / 100,
  );
  if (!Number.isSafeInteger(bonus) || bonus < 0)
    throw new PublicError("Некоректні бонуси");
  const bonusUsed = Math.min(bonus, Math.max(0, balance), bonusCap),
    total = afterDiscount - bonusUsed;
  return {
    lines,
    quantity,
    subtotal,
    percent,
    bulkPercent: bulk,
    promoPercent,
    discount,
    discountSource: promoPercent > bulk ? "promo" : bulk ? "bulk" : null,
    promoCode: promoPercent > bulk ? promo.code : null,
    bonusUsed,
    bonusCap,
    total,
    freeShipping: total >= settings.freeShipping,
    freeShippingRemaining: Math.max(0, settings.freeShipping - total),
    earn: Math.floor((total * settings.bonusPercent) / 100),
  };
}
export const transitions = {
  new: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: [],
  cancelled: [],
};
export function nextStatus(current, next) {
  if (!transitions[current]?.includes(next))
    throw new PublicError("Недозволена зміна статусу");
}
