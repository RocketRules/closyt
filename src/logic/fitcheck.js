/*
 * Fit Check scoring.
 *
 * Right now this is a local heuristic seeded off the photo so a given shot
 * always scores the same. It is deliberately isolated behind one function:
 * when the Claude vision call goes in, `scoreFit` becomes async and everything
 * that consumes it keeps working unchanged.
 */

const VERDICTS = [
  [9, 'Undeniable.'],
  [8, 'Very put together.'],
  [7, 'Solid, easy fit.'],
  [0, 'Works — barely trying.'],
];

const TIPS = [
  'Cuff the trousers once — it lets the shoes read as part of the outfit, not an afterthought.',
  'Tuck the front of the top only. It marks your waist without looking fussy.',
  'Push the sleeves to the elbow — it breaks up the block of colour up top.',
  'Swap in your lighter shoes; the current pair anchors the look a shade too heavy.',
  'Add one warm accessory. The palette is clean but it could use a focal point.',
];

/* Stable pseudo-random seed from a photo URI, so re-scoring never flickers. */
function seedFrom(uri = '') {
  let h = 0;
  for (let i = 0; i < uri.length; i++) h = (h * 31 + uri.charCodeAt(i)) >>> 0;
  return h;
}

const band = (pct, labels) => (pct < 50 ? labels[0] : pct < 78 ? labels[1] : labels[2]);

export function scoreFit(photoUri, profile) {
  const seed = seedFrom(photoUri);
  const score = 6 + (seed % 4);

  const harmony = 62 + (seed % 30);
  const proportion = 55 + ((seed >> 3) % 35);
  const novelty = 30 + ((seed >> 6) % 45);

  return {
    score,
    verdict: (VERDICTS.find((v) => v[0] <= score) || VERDICTS[3])[1],
    bars: [
      { label: 'Colour harmony', val: band(harmony, ['Muddled', 'Fine', 'Strong']), pct: harmony, color: '#BC9670' },
      { label: 'Proportion', val: band(proportion, ['Off', 'Good', 'Spot on']), pct: proportion, color: '#A98B66' },
      { label: 'Newness vs. usual', val: band(novelty, ['Familiar', 'A shift', 'New for you']), pct: novelty, color: '#6A5741' },
    ],
    tip: TIPS[seed % TIPS.length],
  };
}
