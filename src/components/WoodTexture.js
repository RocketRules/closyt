import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect, Path, Ellipse, Defs, LinearGradient, RadialGradient, Stop } from 'react-native-svg';

/*
 * Hand-drawn wood grain.
 *
 * The source design used an SVG feTurbulence filter, which react-native-svg
 * does not implement. Instead we draw the grain directly: a warm vertical
 * base, a run of wavering vertical grain lines, and the occasional knot.
 * Everything is generated from a fixed seed so the plank never changes
 * between renders.
 */

/* Small deterministic PRNG — same seed, same plank, every time. */
function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* One grain line: a near-vertical bezier that wanders a few pixels. */
function grainPath(x, amp, phase, H) {
  const segments = 7;
  let d = `M${x.toFixed(1)} -10`;
  for (let s = 1; s <= segments; s++) {
    const y0 = (H / segments) * (s - 1);
    const y1 = (H / segments) * s;
    const c1 = x + Math.sin(phase + s * 1.15) * amp;
    const c2 = x + Math.sin(phase + s * 1.73) * amp;
    const ex = x + Math.sin(phase + (s + 1) * 1.31) * amp;
    d +=
      ` C${c1.toFixed(1)} ${(y0 + (y1 - y0) * 0.34).toFixed(1)},` +
      ` ${c2.toFixed(1)} ${(y0 + (y1 - y0) * 0.67).toFixed(1)},` +
      ` ${ex.toFixed(1)} ${y1.toFixed(1)}`;
  }
  return d;
}

function buildPlank(seed, density, W, H) {
  const rnd = mulberry32(seed);
  const lines = [];
  /* Grain spacing scales with the board so a small tile is not overcrowded. */
  const gap = (W / 420) * (12 / density);
  let x = -12;
  while (x < W + 12) {
    x += gap * (0.25 + rnd());
    lines.push({
      d: grainPath(x, (1 + rnd() * 3.6) * (W / 420), rnd() * Math.PI * 2, H),
      width: 0.5 + rnd() * 1.9,
      opacity: 0.04 + rnd() * 0.2,
      /* Most grain reads darker than the board; a little catches the light. */
      light: rnd() > 0.72,
    });
  }

  /* A couple of knots, each a set of tightening rings, sized to the board. */
  const knots = [];
  const scale = W / 420;
  const knotCount = 2 + Math.floor(rnd() * 2);
  for (let k = 0; k < knotCount; k++) {
    const cx = W * 0.1 + rnd() * W * 0.8;
    const cy = H * 0.09 + rnd() * H * 0.82;
    const rings = 3 + Math.floor(rnd() * 3);
    for (let r = rings; r >= 1; r--) {
      knots.push({
        cx,
        cy,
        rx: (5 + r * (3 + rnd() * 3)) * scale,
        ry: (12 + r * (7 + rnd() * 6)) * scale * (H / W / (900 / 420)),
        opacity: 0.05 + (rings - r) * 0.03,
      });
    }
  }

  return { lines, knots };
}

/*
 * `tone` picks the board colour, `density` how busy the grain is,
 * `opacity` how far the whole texture sits behind the content, and `box`
 * the aspect of the board — square for a small tile, tall for a full screen.
 */
export default function WoodTexture({
  seed = 11,
  density = 1,
  opacity = 1,
  tone = ['#2A1B10', '#1B120C'],
  box = { w: 420, h: 900 },
  style,
}) {
  const { w: W, h: H } = box;
  const { lines, knots } = useMemo(
    () => buildPlank(seed, density, W, H),
    [seed, density, W, H]
  );

  return (
    <View style={[StyleSheet.absoluteFill, { opacity }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="board" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={tone[0]} />
            <Stop offset="1" stopColor={tone[1]} />
          </LinearGradient>
          {/* Warm bloom, as if light falls across the middle of the board. */}
          <RadialGradient id="sheen" cx="50%" cy="38%" rx="70%" ry="55%">
            <Stop offset="0" stopColor="#7E5C3C" stopOpacity="0.22" />
            <Stop offset="1" stopColor="#7E5C3C" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width={W} height={H} fill="url(#board)" />

        {knots.map((k, i) => (
          <Ellipse
            key={`k${i}`}
            cx={k.cx}
            cy={k.cy}
            rx={k.rx}
            ry={k.ry}
            fill="none"
            stroke="#0E0805"
            strokeOpacity={k.opacity}
            strokeWidth={1.4}
          />
        ))}

        {lines.map((l, i) => (
          <Path
            key={`g${i}`}
            d={l.d}
            fill="none"
            stroke={l.light ? '#6B4E33' : '#100A06'}
            strokeOpacity={l.opacity}
            strokeWidth={l.width}
          />
        ))}

        <Rect x="0" y="0" width={W} height={H} fill="url(#sheen)" />
      </Svg>
    </View>
  );
}
