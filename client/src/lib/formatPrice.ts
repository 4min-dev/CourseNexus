export function formatPrice(price: number | string | undefined): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  
  // Handle undefined, null, or NaN
  if (numPrice === undefined || numPrice === null || isNaN(numPrice)) {
    return '0';
  }
  
  // Always round to whole number and don't show decimals
  const roundedPrice = Math.round(numPrice);
  return roundedPrice.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}
