/*
 * Build a ~5-word garment description from tag metadata.
 * No network call — this runs synchronously after tagGarment.
 *
 * Examples:
 *   "navy slim cotton shirt"
 *   "black straight denim jeans"
 *   "oatmeal relaxed knit jacket"
 */

const TYPE_LABELS = {
  Shirt: 'shirt',
  Tee: 'tee shirt',
  Knitwear: 'knit sweater',
  Jacket: 'jacket',
  Trousers: 'trousers',
  Jeans: 'jeans',
  Shoes: 'shoes',
};

export function describeGarment(item) {
  const parts = [];

  if (item.colorName) {
    parts.push(item.colorName.toLowerCase());
  }

  if (item.fit && item.fit !== 'Regular') {
    parts.push(item.fit.toLowerCase());
  }

  const label = TYPE_LABELS[item.cat] || item.type?.toLowerCase() || item.cat?.toLowerCase() || 'item';
  parts.push(label);

  return parts.join(' ').slice(0, 60);
}
