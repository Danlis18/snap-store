export function sizePrice(product, size) {
  const prices = product.sizePrices || {};
  return size && Object.hasOwn(prices, size) ? prices[size] : product.price;
}
export function priceRange(product, color) {
  const available = [...new Set((product.variants || []).filter((v) => v.available && (!color || v.color === color)).map((v) => v.size))];
  const sizes = available.length ? available : product.sizes || [];
  const prices = sizes.length ? sizes.map((size) => sizePrice(product, size)) : [product.price];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
export function offerPrices(product) {
  const { min, max } = priceRange(product);
  return min === max ? { "@type": "Offer", price: (min / 100).toFixed(2) } : {
    "@type": "AggregateOffer", lowPrice: (min / 100).toFixed(2), highPrice: (max / 100).toFixed(2),
    offerCount: product.variants.filter((v) => v.available).length || product.variants.length,
  };
}
