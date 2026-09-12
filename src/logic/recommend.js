/*
 * Closyt's outfit optimiser.
 *
 * The whole point of the app: rather than suggesting purchases, enumerate the
 * combinations already sitting in the user's closet and rank them against the
 * body profile. Pure functions, no network — an AI tagger can later improve the
 * item metadata this reads without any of the scoring below changing.
 */

const ROLE = {
  Shirt: 'top',
  Tee: 'top',
  Knitwear: 'layer',
  Jacket: 'layer',
  Trousers: 'bottom',
  Jeans: 'bottom',
  Shoes: 'shoes',
};

const NEUTRALS = ['Black', 'Grey', 'White', 'Cream', 'Beige', 'Brown', 'Navy'];
const FAMILY = {
  Red: 'warm', Burgundy: 'warm', Orange: 'warm', Yellow: 'warm', Pink: 'warm',
  Brown: 'warm', Beige: 'warm', Cream: 'warm',
  Blue: 'cool', Navy: 'cool', Purple: 'cool',
  Green: 'earth', Olive: 'earth',
  Black: 'mono', Grey: 'mono', White: 'mono',
};

export const roleOf = (item) => ROLE[item.cat] || 'top';

/* Split the wardrobe into the slots an outfit needs to fill. */
function byRole(items) {
  const slots = { top: [], layer: [], bottom: [], shoes: [] };
  items.forEach((i) => slots[roleOf(i)].push(i));
  return slots;
}

/*
 * Colour harmony: neutrals are free, one statement colour reads deliberate,
 * two clash unless they share a family.
 */
function colourScore(pieces) {
  const loud = pieces.filter((p) => !NEUTRALS.includes(p.colorName));
  if (loud.length === 0) return { score: 22, note: 'a full neutral run — quiet and hard to get wrong' };
  if (loud.length === 1) return { score: 30, note: `the ${loud[0].colorName.toLowerCase()} carries it while everything else stays neutral` };
  const families = new Set(loud.map((p) => FAMILY[p.colorName]));
  if (families.size === 1) return { score: 25, note: `${loud.map((p) => p.colorName.toLowerCase()).join(' and ')} sit in the same family, so they read as one palette` };
  return { score: 8, note: 'two competing colours, worth watching in daylight' };
}

/*
 * Proportion: judged against the stored body profile. Volume on volume
 * flattens a shorter frame; some structure against a relaxed piece lengthens it.
 */
function proportionScore(pieces, profile) {
  const top = pieces.find((p) => roleOf(p) === 'top');
  const bottom = pieces.find((p) => roleOf(p) === 'bottom');
  if (!top || !bottom) return { score: 15, note: '' };

  const height = profile?.height ?? 170;
  const shortFrame = height < 168;
  const relaxed = (p) => p.fit === 'Relaxed';
  const structured = (p) => p.fit === 'Slim' || p.fit === 'Straight';

  if (relaxed(top) && relaxed(bottom)) {
    return shortFrame
      ? { score: 6, note: 'volume top and bottom — it will shorten you, so tuck the top' }
      : { score: 14, note: 'relaxed throughout, which your height carries easily' };
  }
  if (relaxed(top) && structured(bottom)) {
    return { score: 30, note: 'a relaxed top over a clean line below balances your proportions' };
  }
  if (structured(top) && relaxed(bottom)) {
    return { score: 28, note: 'the fitted top keeps the looser leg from taking over' };
  }
  return { score: 24, note: 'a trim silhouette top to bottom' };
}

/* A layer adds depth, but only when it is not fighting the top. */
function layerScore(pieces) {
  const layer = pieces.find((p) => roleOf(p) === 'layer');
  if (!layer) return { score: 8, note: '' };
  return { score: 18, note: `the ${layer.type.toLowerCase()} adds a second layer without bulk` };
}

/* Push pieces the user rarely wears back into rotation. */
function freshnessScore(pieces, wornCounts) {
  const total = pieces.reduce((sum, p) => sum + (wornCounts[p.id] || 0), 0);
  const avg = total / pieces.length;
  if (avg === 0) return { score: 20, note: 'nothing here has been out yet this week' };
  if (avg < 1.5) return { score: 14, note: '' };
  return { score: 4, note: '' };
}

function combos(slots) {
  const out = [];
  const layers = [null, ...slots.layer];
  slots.top.forEach((top) =>
    slots.bottom.forEach((bottom) =>
      slots.shoes.forEach((shoes) =>
        layers.forEach((layer) => {
          out.push([top, bottom, shoes, layer].filter(Boolean));
        })
      )
    )
  );
  return out;
}

const NAMES = ['Easy Tuesday', 'Quiet Sharp', 'Layered Walk', 'Soft Structure', 'Low Effort', 'Long Line', 'Warm Neutral', 'Off Duty'];

/*
 * Rank every valid combination and return the best few.
 * `wornCounts` maps item id -> times worn, so repeats drift down the list.
 */
export function recommendOutfits(items, profile, wornCounts = {}, limit = 8) {
  const slots = byRole(items);
  if (!slots.top.length || !slots.bottom.length || !slots.shoes.length) return [];

  const scored = combos(slots).map((pieces) => {
    const parts = [
      colourScore(pieces),
      proportionScore(pieces, profile),
      layerScore(pieces),
      freshnessScore(pieces, wornCounts),
    ];
    const score = parts.reduce((sum, p) => sum + p.score, 0);
    const notes = parts.map((p) => p.note).filter(Boolean);
    return {
      pieces,
      score,
      /* Lead with the strongest reason, then one supporting note. */
      why: capitalise(notes.slice(0, 2).join('; ')) + '.',
      match: `${Math.min(98, Math.round(52 + score * 0.45))}% you`,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  /* Avoid showing near-duplicates back to back. */
  const picked = [];
  for (const outfit of scored) {
    const key = outfit.pieces.map((p) => p.id).sort().join('-');
    const tooSimilar = picked.some(
      (p) => p.pieces.filter((x) => outfit.pieces.some((y) => y.id === x.id)).length >= 3
    );
    if (!tooSimilar && !picked.some((p) => p.key === key)) {
      picked.push({ ...outfit, key, name: NAMES[picked.length % NAMES.length] });
    }
    if (picked.length >= limit) break;
  }
  return picked;
}

const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/* How much of the closet the recommendations actually reach. */
export function wardrobeStats(items, outfits) {
  const used = new Set();
  outfits.forEach((o) => o.pieces.forEach((p) => used.add(p.id)));
  return {
    total: items.length,
    inRotation: used.size,
    combinations: outfits.length,
  };
}
