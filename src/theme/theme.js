/* Every value here is lifted straight from the Closyt design file. */

export const C = {
  mah: '#7E5C3C',
  mahHi: '#946E4A',
  ember: '#BC9670',
  tan: '#A98B66',

  bgTop: '#20150E',
  bgBottom: '#1B120C',
  bgDarkTop: '#150E08',
  bgDarkBottom: '#0D0805',
  bgFitTop: '#1B120C',
  bgFitBottom: '#281B10',

  card: '#271A12',
  cardAlt: '#271E14',
  cardDeep: '#120B07',
  track: '#3A2619',
  sunken: '#1E140D',

  text: '#F4E7D9',
  textSoft: '#F0E1D2',
  textWarm: '#F7EADD',
  muted: '#AC9683',
  dim: '#9A8370',
  faint: '#8E7965',
  inactive: '#7A6653',

  hairline: 'rgba(240,225,210,.09)',
  hairlineSoft: 'rgba(240,225,210,.12)',
  dashed: 'rgba(240,225,210,.22)',
  wash: 'rgba(240,225,210,.04)',
  outline: 'rgba(240,225,210,.18)',
};

export const F = {
  serif: 'InstrumentSerif_400Regular',
  sans: 'DMSans_400Regular',
  sansMed: 'DMSans_500Medium',
  mono: 'DMMono_400Regular',
};

/* Flat-lay swatch colours, used until a real photo exists for an item. */
export const SWATCH = {
  Oatmeal: '#C9B694',
  Indigo: '#5A6E8E',
  Rust: '#B06A42',
  Olive: '#7E805A',
  Cream: '#D9CDB6',
  Charcoal: '#5A534B',
  Denim: '#6E8CA8',
  Camel: '#BE9165',
  Black: '#4A443E',
  White: '#DED9CE',
};

export const TYPES = ['Shirt', 'Tee', 'Knitwear', 'Jacket', 'Trousers', 'Jeans', 'Shoes'];
export const COLORS = Object.keys(SWATCH);
export const FITS = ['Slim', 'Regular', 'Relaxed', 'Straight'];

export const swatchFor = (name) => SWATCH[name] || SWATCH.Oatmeal;
