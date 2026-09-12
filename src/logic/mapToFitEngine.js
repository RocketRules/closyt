/*
 * Map Closyt wardrobe items + body profile to the fit-scoring engine contract.
 *
 * Engine schemas (Python):
 *   BodyInfo:  { height_cm, weight_kg, age, gender, fit_preference, sleeve_preference, color_preference }
 *   ClothingItem: { id, category, description }
 *   RankRequest: { body: BodyInfo, items: [ClothingItem] }
 */

const CAT_MAP = {
  Shirt: 'shirt',
  Tee: 'shirt',
  Knitwear: 'sweater',
  Jacket: 'jacket',
  Trousers: 'pant',
  Jeans: 'pant',
  Shoes: 'shoe',
};

export function mapCategory(closytCat) {
  return CAT_MAP[closytCat] || 'shirt';
}

export function mapBody(profile) {
  const gender =
    profile.gender === 'Woman' ? 'f' : 'm';

  const fitPref =
    profile.fitBias === 'fitted' ? 'tighter'
    : profile.fitBias === 'relaxed' ? 'looser'
    : 'looser';

  return {
    height_cm: profile.heightCm || profile.height || 170,
    weight_kg: profile.weightKg || profile.weight || 70,
    age: profile.age || 25,
    gender,
    fit_preference: fitPref,
    sleeve_preference: 'long',
    color_preference: 'darker',
  };
}

export function mapItem(item) {
  return {
    id: item.id,
    category: mapCategory(item.cat),
    description: item.description || `${(item.colorName || '').toLowerCase()} ${(item.type || item.cat || 'item').toLowerCase()}`.trim(),
  };
}

export function buildRankRequest(items, profile) {
  return {
    body: mapBody(profile),
    items: items.map(mapItem),
  };
}
