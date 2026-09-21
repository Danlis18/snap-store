// Legacy products fall back to their shared gallery until colour photos are added.
export function productImages(product, color) {
  const images = product?.colors?.find((item) => item.name === color)?.images;
  return images?.length ? images : product?.images || [];
}
