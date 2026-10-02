/* ==========================================================================
   Media slot
   renderMedia("sidr-hero", { ratio: "16 / 9" }) returns a <figure class="media">.
   - If the registry entry has `src`, it renders the real photograph.
   - Otherwise it draws a DEMO scene (SVG) in the brand palette and labels it
     "صورة توضيحية". Same box, same ratio, same classes — swapping in real
     photography never changes the layout.
   ========================================================================== */

import { raw, esc } from "../core/dom.js";
import { L, t } from "../core/i18n.js";
import { asset } from "../core/paths.js";
import { getMedia } from "../data/media.js";

/* ---- Palettes per time of day ----------------------------------------- */
const TONES = {
  dawn: { sky: ["#D6BC9C", "#EFDDC3"], sun: "#F6E3C6", far: "#A69072", mid: "#8A775C", ground: "#BFA580", ground2: "#A48A66", ink: "#4B4C33", accent: "#C99C72", light: 0 },
  day: { sky: ["#D3CCB7", "#EDE6D6"], sun: "#F7EEDC", far: "#A69E80", mid: "#858062", ground: "#C9B38D", ground2: "#AE966F", ink: "#41472E", accent: "#B88456", light: 0 },
  dusk: { sky: ["#8C5A3E", "#E2B386"], sun: "#F4D8AE", far: "#7D5A43", mid: "#5F4331", ground: "#4B3426", ground2: "#3E2B1F", ink: "#2E2119", accent: "#E7B984", light: 1 },
  night: { sky: ["#221C19", "#46372B"], sun: "#EADFC8", far: "#3A2E25", mid: "#2D241D", ground: "#241C16", ground2: "#1D1712", ink: "#15110E", accent: "#E8B478", light: 2 },
};

/* ---- Seeded random ---------------------------------------------------- */
function rng(seed) {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t2 = Math.imul(a ^ (a >>> 15), 1 | a);
    t2 = (t2 + Math.imul(t2 ^ (t2 >>> 7), 61 | t2)) ^ t2;
    return ((t2 ^ (t2 >>> 14)) >>> 0) / 4294967296;
  };
}

let sceneCounter = 0;
const f = (n) => Math.round(n * 10) / 10;

/* ---- Shapes ----------------------------------------------------------- */

/** A palm: tapered trunk + feather-like fronds drawn as filled leaves. */
function palm(x, baseY, h, color, rand, lean = 0) {
  const topX = x + lean * h;
  const topY = baseY - h;
  const w = Math.max(1.4, h * 0.03);
  const cx0 = x + lean * h * 0.35;
  const cy0 = baseY - h * 0.55;
  // trunk as a tapered shape
  let s = `<path d="M${f(x - w)} ${f(baseY)} Q${f(cx0 - w * 0.8)} ${f(cy0)} ${f(topX - w * 0.45)} ${f(topY)} L${f(topX + w * 0.45)} ${f(topY)} Q${f(cx0 + w * 0.8)} ${f(cy0)} ${f(x + w)} ${f(baseY)} Z" fill="${color}"/>`;
  const fronds = 13;
  for (let i = 0; i < fronds; i++) {
    const ang = Math.PI * (0.02 + (i / (fronds - 1)) * 0.96) + (rand() - 0.5) * 0.16;
    const len = h * (0.26 + rand() * 0.12);
    const dirX = -Math.cos(ang);
    const up = Math.sin(ang);
    const endX = topX + dirX * len;
    const endY = topY - up * len * 0.35 + len * (0.55 - up * 0.25);
    const mx = topX + dirX * len * 0.5;
    const my = topY - up * len * 0.55 - len * 0.05;
    // perpendicular offset for leaf width
    const dx = endX - topX;
    const dy = endY - topY;
    const n = Math.hypot(dx, dy) || 1;
    const px = (-dy / n) * len * 0.07;
    const py = (dx / n) * len * 0.07;
    s += `<path d="M${f(topX)} ${f(topY)} Q${f(mx + px)} ${f(my + py)} ${f(endX)} ${f(endY)} Q${f(mx - px * 0.6)} ${f(my - py * 0.6)} ${f(topX)} ${f(topY)} Z" fill="${color}"/>`;
  }
  // crown
  s += `<circle cx="${f(topX)}" cy="${f(topY + w * 0.4)}" r="${f(w * 1.3)}" fill="${color}"/>`;
  return s;
}

/** A ghada / acacia: low rounded canopy. */
function shrub(x, baseY, r, color, rand) {
  let s = `<path d="M${f(x)} ${f(baseY)} L${f(x + r * 0.05)} ${f(baseY - r * 0.9)}" stroke="${color}" stroke-width="${f(r * 0.08)}"/>`;
  for (let i = 0; i < 5; i++) {
    const cx = x + (rand() - 0.5) * r * 1.6;
    const cy = baseY - r * (0.9 + rand() * 0.5);
    s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(r * (0.5 + rand() * 0.3))}" ry="${f(r * (0.3 + rand() * 0.15))}" fill="${color}"/>`;
  }
  return s;
}

/** A long horizon/dune line as a filled band. */
function band(y, amp, color, rand, waves = 3, W = 1600, H = 1000) {
  const pts = [];
  const steps = 16;
  const phase = rand() * Math.PI * 2;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * W;
    const yy = y + Math.sin((i / steps) * Math.PI * waves + phase) * amp + Math.sin((i / steps) * Math.PI * waves * 2.3 + phase) * amp * 0.35;
    pts.push([x, yy]);
  }
  let d = `M0 ${H} L0 ${f(pts[0][1])}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [x, yy] = pts[i];
    d += ` Q${f(px)} ${f(py)} ${f((px + x) / 2)} ${f((py + yy) / 2)}`;
  }
  d += ` L${W} ${f(pts[pts.length - 1][1])} L${W} ${H} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

function stars(rand, n, color, maxY = 520) {
  let s = "";
  for (let i = 0; i < n; i++) {
    s += `<circle cx="${f(rand() * 1600)}" cy="${f(rand() * maxY)}" r="${f(0.6 + rand() * 1.6)}" fill="${color}" opacity="${f(0.35 + rand() * 0.6)}"/>`;
  }
  return s;
}

function sky(id, c, sun = true, sunPos = [0.68, 0.55], sunR = 90) {
  return (
    `<defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sky[0]}"/><stop offset="1" stop-color="${c.sky[1]}"/></linearGradient>` +
    `<radialGradient id="${id}-glow"><stop offset="0" stop-color="${c.sun}" stop-opacity=".9"/><stop offset="1" stop-color="${c.sun}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect width="1600" height="1000" fill="url(#${id}-sky)"/>` +
    (sun ? `<circle cx="${1600 * sunPos[0]}" cy="${1000 * sunPos[1]}" r="${sunR * 3.2}" fill="url(#${id}-glow)"/><circle cx="${1600 * sunPos[0]}" cy="${1000 * sunPos[1]}" r="${sunR}" fill="${c.sun}" opacity=".92"/>` : "")
  );
}

/* ---- Scenes ----------------------------------------------------------- */
const SCENES = {
  dusk(id, c, r) {
    let s = sky(id, c, true, [0.3 + r() * 0.4, 0.62], 70);
    s += band(640, 14, c.far, r, 2);
    s += band(700, 10, c.mid, r, 3);
    for (let i = 0; i < 9; i++) {
      const x = 80 + i * 180 + (r() - 0.5) * 120;
      s += palm(x, 760 + r() * 30, 300 + r() * 220, c.ink, r, (r() - 0.5) * 0.25);
    }
    s += band(780, 8, c.ground, r, 2);
    return s;
  },

  grove(id, c, r) {
    let s = sky(id, c, c.light > 0, [0.5, 0.42], 60);
    s += band(560, 6, c.far, r, 2);
    // receding rows towards a central vanishing point
    const vx = 800 + (r() - 0.5) * 200;
    const vy = 560;
    for (let row = 6; row >= 0; row--) {
      const depth = row / 6; // 1 far → 0 near
      const scale = 1 - depth * 0.82;
      const y = vy + (1000 - vy) * Math.pow(1 - depth, 1.6) * 0.9 + 20;
      const h = 620 * scale;
      [-1, 1].forEach((side) => {
        const x = vx + side * (90 + 900 * Math.pow(1 - depth, 1.5));
        s += palm(x, y, h, row > 3 ? c.mid : c.ink, r, side * -0.06);
      });
    }
    s += `<path d="M${vx - 40} ${vy + 10} L${vx + 40} ${vy + 10} L${vx + 420} 1000 L${vx - 420} 1000 Z" fill="${c.ground2}" opacity=".55"/>`;
    return s;
  },

  field(id, c, r) {
    let s = sky(id, c, true, [0.22 + r() * 0.5, 0.36], 55);
    s += band(470, 8, c.far, r, 2);
    for (let i = 0; i < 7; i++) s += palm(100 + i * 230 + r() * 80, 485, 70 + r() * 60, c.mid, r, 0);
    s += `<rect y="480" width="1600" height="520" fill="${c.ground}"/>`;
    const vx = 800 + (r() - 0.5) * 300;
    for (let i = -14; i <= 14; i++) {
      s += `<path d="M${f(vx + i * 14)} 480 L${f(vx + i * 150)} 1000" stroke="${i % 2 ? c.ground2 : c.ink}" stroke-opacity="${i % 2 ? 0.7 : 0.35}" stroke-width="${i % 2 ? 9 : 3}"/>`;
    }
    return s;
  },

  dunes(id, c, r) {
    let s = sky(id, c, true, [0.25 + r() * 0.5, 0.5], 80);
    if (c.light === 2) s += stars(r, 160, c.sun);
    s += band(560, 40, c.far, r, 1.5);
    s += band(640, 55, c.mid, r, 1.2);
    for (let i = 0; i < 4; i++) s += shrub(150 + r() * 1300, 700 + r() * 60, 40 + r() * 40, c.ink, r);
    s += band(760, 45, c.ground, r, 1);
    s += band(880, 30, c.ground2, r, 1.4);
    return s;
  },

  mudbrick(id, c, r) {
    let s = sky(id, c, c.light > 0, [0.78, 0.4], 60);
    const wall = c.light === 0 ? "#C9A98A" : c.light === 1 ? "#8A5F43" : "#3B2E25";
    const shade = c.light === 0 ? "#B38F70" : c.light === 1 ? "#6B4733" : "#2C221B";
    const dark = c.light === 2 ? "#E8B478" : c.ink;
    s += `<rect y="760" width="1600" height="240" fill="${c.ground}"/>`;
    // two volumes
    const vols = [
      [180 + r() * 60, 380, 700, 400],
      [860, 470, 560, 310],
    ];
    vols.forEach(([x, y, w, h], vi) => {
      s += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${vi ? shade : wall}"/>`;
      // Najdi triangular crenellation
      const n = Math.floor(w / 46);
      for (let i = 0; i < n; i++) {
        const tx = x + i * (w / n);
        s += `<path d="M${f(tx + 6)} ${f(y)} L${f(tx + w / n / 2)} ${f(y - 30)} L${f(tx + w / n - 6)} ${f(y)} Z" fill="${vi ? shade : wall}"/>`;
      }
      // small triangular vents
      for (let i = 0; i < n - 1; i += 2) {
        const tx = x + 30 + i * (w / n);
        s += `<path d="M${f(tx)} ${f(y + 50)} l12 -18 l12 18 Z" fill="${dark}" opacity=".55"/>`;
      }
      // windows
      const wins = vi ? 3 : 4;
      for (let i = 0; i < wins; i++) {
        const wx = x + 70 + i * ((w - 140) / (wins - 1)) - 20;
        s += `<rect x="${f(wx)}" y="${f(y + 120)}" width="40" height="64" fill="${dark}" opacity="${c.light === 2 ? 0.9 : 0.6}"/>`;
      }
      if (!vi) s += `<rect x="${f(x + w / 2 - 55)}" y="${f(y + h - 190)}" width="110" height="190" fill="${dark}" opacity=".75"/>`;
    });
    // texture: horizontal mud courses
    for (let i = 0; i < 18; i++) s += `<path d="M180 ${400 + i * 21} H1420" stroke="${c.ink}" stroke-opacity=".05" stroke-width="2"/>`;
    s += palm(1480, 800, 520, c.ink, r, -0.08);
    s += palm(90, 800, 430, c.ink, r, 0.06);
    return s;
  },

  courtyard(id, c, r) {
    const wall = c.light === 2 ? "#3A2D24" : c.light === 1 ? "#7A5440" : "#D3B99A";
    const deep = c.light === 2 ? "#1E1813" : c.light === 1 ? "#4C3324" : "#A9876A";
    const glow = c.accent;
    let s = `<rect width="1600" height="1000" fill="${wall}"/>`;
    // arch opening showing the sky
    s += `<defs><clipPath id="${id}-arch"><path d="M500 1000 V420 Q500 180 800 160 Q1100 180 1100 420 V1000 Z"/></clipPath></defs>`;
    s += `<g clip-path="url(#${id}-arch)">${sky(id, c, true, [0.5, 0.5], 60)}${band(700, 10, c.mid, r, 2)}${palm(700, 760, 380, c.ink, r, 0.05)}${palm(930, 780, 300, c.ink, r, -0.05)}</g>`;
    s += `<path d="M470 1000 V420 Q470 150 800 128 Q1130 150 1130 420 V1000" fill="none" stroke="${deep}" stroke-width="30"/>`;
    // floor
    s += `<rect y="860" width="1600" height="140" fill="${deep}"/>`;
    for (let i = 0; i < 9; i++) s += `<path d="M${i * 200} 860 L${i * 200 - 140} 1000" stroke="${wall}" stroke-opacity=".25"/>`;
    // lanterns
    [260, 1340].forEach((x) => {
      s += `<circle cx="${x}" cy="520" r="140" fill="${glow}" opacity="${c.light >= 1 ? 0.18 : 0.08}"/>`;
      s += `<path d="M${x} 400 V450" stroke="${deep}" stroke-width="3"/><rect x="${x - 22}" y="450" width="44" height="70" rx="6" fill="${glow}" opacity=".9"/>`;
    });
    // majlis cushions
    s += `<rect x="0" y="800" width="400" height="60" fill="${deep}" opacity=".7"/><rect x="1200" y="800" width="400" height="60" fill="${deep}" opacity=".7"/>`;
    return s;
  },

  table(id, c, r) {
    const cloth = c.light === 2 ? "#2D241D" : c.light === 1 ? "#6A4936" : "#D9C6A8";
    const mat = c.light === 2 ? "#5B4636" : c.light === 1 ? "#A8774F" : "#C2A27A";
    let s = `<rect width="1600" height="1000" fill="${cloth}"/>`;
    // woven sufra
    s += `<circle cx="800" cy="500" r="430" fill="${mat}"/>`;
    for (let i = 1; i < 9; i++) s += `<circle cx="800" cy="500" r="${430 - i * 48}" fill="none" stroke="${c.ink}" stroke-opacity=".12" stroke-width="10"/>`;
    // plates with dates / kleija
    const items = [
      [800, 500, 150, "dates"],
      [520, 360, 95, "kleija"],
      [1080, 380, 90, "kleija"],
      [560, 690, 85, "cup"],
      [1050, 680, 100, "dates"],
    ];
    items.forEach(([x, y, rad, kind]) => {
      s += `<circle cx="${x}" cy="${y}" r="${rad}" fill="#F3EBDD"/><circle cx="${x}" cy="${y}" r="${rad * 0.82}" fill="none" stroke="${c.ink}" stroke-opacity=".12"/>`;
      if (kind === "dates") {
        for (let i = 0; i < 14; i++) {
          const a = r() * Math.PI * 2;
          const d = r() * rad * 0.6;
          s += `<ellipse cx="${f(x + Math.cos(a) * d)}" cy="${f(y + Math.sin(a) * d)}" rx="${f(rad * 0.13)}" ry="${f(rad * 0.08)}" transform="rotate(${f(r() * 180)} ${f(x + Math.cos(a) * d)} ${f(y + Math.sin(a) * d)})" fill="#7A4524"/>`;
        }
      } else if (kind === "kleija") {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const cx = x + Math.cos(a) * rad * 0.42;
          const cy = y + Math.sin(a) * rad * 0.42;
          s += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad * 0.26)}" fill="#C08A55"/><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(rad * 0.14)}" fill="none" stroke="#8E5A32" stroke-width="3" stroke-dasharray="4 5"/>`;
        }
      } else {
        s += `<circle cx="${x}" cy="${y}" r="${rad * 0.45}" fill="#E7C98F"/><circle cx="${x}" cy="${y}" r="${rad * 0.32}" fill="#B98A45"/>`;
      }
    });
    s += `<rect width="1600" height="1000" fill="${c.ink}" opacity="${c.light === 2 ? 0.25 : 0.04}"/>`;
    return s;
  },

  craft(id, c, r) {
    const a = c.light >= 1 ? "#B0835A" : "#D6BC92";
    const b = c.light >= 1 ? "#8A6240" : "#B79868";
    const g = c.light >= 1 ? "#6E6A4D" : "#8F9273";
    let s = `<rect width="1600" height="1000" fill="${b}"/>`;
    const w = 70;
    // diagonal weave of palm strips
    s += `<g transform="rotate(-30 800 500)">`;
    for (let i = -14; i < 30; i++) {
      for (let j = -14; j < 30; j++) {
        const x = i * w;
        const y = j * w;
        const over = (i + j) % 2 === 0;
        const col = (i * 7 + j * 3) % 11 === 0 ? g : over ? a : b;
        s += `<rect x="${x + 3}" y="${y + 3}" width="${w - 6}" height="${w - 6}" rx="3" fill="${col}"/>`;
        s += over
          ? `<path d="M${x + 8} ${y + w / 2} H${x + w - 8}" stroke="${c.ink}" stroke-opacity=".1" stroke-width="2"/>`
          : `<path d="M${x + w / 2} ${y + 8} V${y + w - 8}" stroke="${c.ink}" stroke-opacity=".1" stroke-width="2"/>`;
      }
    }
    s += `</g>`;
    // soft vignette
    s += `<defs><radialGradient id="${id}-v"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient></defs><rect width="1600" height="1000" fill="url(#${id}-v)"/>`;
    return s;
  },

  night(id, c, r) {
    let s = sky(id, c, false);
    s += stars(r, 220, "#F2E6D0", 640);
    s += `<circle cx="${1250 - r() * 300}" cy="180" r="38" fill="${c.sun}" opacity=".9"/>`;
    s += band(700, 10, c.far, r, 2);
    for (let i = 0; i < 6; i++) s += palm(140 + i * 270 + r() * 60, 780, 360 + r() * 200, c.ink, r, (r() - 0.5) * 0.2);
    s += band(770, 6, c.ground, r, 2);
    // string of warm lights
    let d = "M0 640";
    for (let i = 1; i <= 8; i++) d += ` Q${i * 200 - 100} ${700} ${i * 200} 640`;
    s += `<path d="${d}" fill="none" stroke="${c.ground2}" stroke-width="2"/>`;
    for (let i = 0; i < 40; i++) {
      const x = i * 40 + 20;
      const seg = (x % 200) / 200;
      const y = 640 + Math.sin(seg * Math.PI) * 30;
      s += `<circle cx="${x}" cy="${f(y + 6)}" r="16" fill="${c.accent}" opacity=".18"/><circle cx="${x}" cy="${f(y + 6)}" r="4" fill="${c.accent}"/>`;
    }
    // fire glow
    s += `<ellipse cx="800" cy="900" rx="260" ry="70" fill="${c.accent}" opacity=".22"/><ellipse cx="800" cy="900" rx="90" ry="22" fill="${c.accent}" opacity=".7"/>`;
    return s;
  },

  channel(id, c, r) {
    let s = sky(id, c, true, [0.5, 0.42], 50);
    s += band(520, 6, c.far, r, 2);
    s += `<rect y="520" width="1600" height="480" fill="${c.ground}"/>`;
    // water channel in perspective
    s += `<path d="M770 520 L830 520 L1060 1000 L540 1000 Z" fill="${c.ground2}"/>`;
    s += `<path d="M782 520 L818 520 L990 1000 L610 1000 Z" fill="${c.sky[1]}" opacity=".85"/>`;
    for (let i = 0; i < 12; i++) s += `<path d="M${f(700 + r() * 200)} ${f(560 + i * 36)} h${f(30 + r() * 60)}" stroke="${c.sky[0]}" stroke-width="3" opacity=".6"/>`;
    for (let row = 5; row >= 0; row--) {
      const depth = row / 5;
      const y = 520 + 480 * Math.pow(1 - depth, 1.5);
      const h = 640 * (1 - depth * 0.8);
      s += palm(800 - 140 - 640 * Math.pow(1 - depth, 1.4), y, h, row > 3 ? c.mid : c.ink, r, 0.04);
      s += palm(800 + 140 + 640 * Math.pow(1 - depth, 1.4), y, h, row > 3 ? c.mid : c.ink, r, -0.04);
    }
    return s;
  },

  harvest(id, c, r) {
    const wood = c.light >= 1 ? "#6B4733" : "#B38B62";
    const woodD = c.light >= 1 ? "#4A3122" : "#8F6A45";
    let s = `<rect width="1600" height="1000" fill="${c.light >= 1 ? "#3E2B1F" : "#D8C7A8"}"/>`;
    const crates = [
      [140, 160, 620, 380],
      [840, 120, 620, 380],
      [480, 560, 640, 380],
    ];
    crates.forEach(([x, y, w, h]) => {
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${woodD}"/>`;
      s += `<rect x="${x + 22}" y="${y + 22}" width="${w - 44}" height="${h - 44}" fill="#5A2E17"/>`;
      for (let i = 0; i < 120; i++) {
        const cx = x + 40 + r() * (w - 80);
        const cy = y + 40 + r() * (h - 80);
        const tone = r() > 0.5 ? "#8A4B26" : r() > 0.5 ? "#A8683A" : "#6E361A";
        s += `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="22" ry="14" transform="rotate(${f(r() * 180)} ${f(cx)} ${f(cy)})" fill="${tone}"/>`;
        if (r() > 0.7) s += `<ellipse cx="${f(cx - 6)}" cy="${f(cy - 4)}" rx="6" ry="3" fill="#E9C89B" opacity=".45"/>`;
      }
      s += `<rect x="${x}" y="${y}" width="${w}" height="22" fill="${wood}"/><rect x="${x}" y="${y + h - 22}" width="${w}" height="22" fill="${wood}"/>`;
    });
    return s;
  },
};

/** SVG markup for a demo scene. */
export function sceneSVG({ scene = "grove", tone = "day", seed = 1 } = {}) {
  const id = `sc${++sceneCounter}`;
  const c = TONES[tone] || TONES.day;
  const r = rng(seed * 97 + scene.length);
  const body = (SCENES[scene] || SCENES.grove)(id, c, r);
  return `<svg class="media__scene" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${body}</svg>`;
}

/**
 * Render an image slot.
 * @param {string} key  media registry key
 * @param {{ ratio?: string, cls?: string, eager?: boolean, label?: boolean,
 *           fill?: boolean, alt?: string, children?: SafeHTML }} opts
 * `children` is extra markup placed inside the figure (veils, overlays).
 */
export function renderMedia(key, opts = {}) {
  const entry = getMedia(key);
  const { ratio, cls = "", eager = false, label = true, fill = false } = opts;
  const alt = opts.alt ?? L(entry.alt);
  const style = [ratio ? `--ratio:${ratio}` : "", entry.focal ? `--focal:${entry.focal}` : ""].filter(Boolean).join(";");
  const classes = ["media", fill ? "media--fill" : "", cls].filter(Boolean).join(" ");

  if (entry.src) {
    const src = /^(https?:)?\/\//.test(entry.src) ? entry.src : asset(entry.src);
    return raw(
      `<figure class="${classes}" style="${style}" data-media="${esc(key)}">` +
        `<img src="${esc(src)}" alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" ` +
        `onload="this.classList.add('is-loaded')" onerror="this.remove()">` +
        String(opts.children ?? "") +
        `</figure>`
    );
  }

  return raw(
    `<figure class="${classes}" style="${style}" data-media="${esc(key)}" role="img" aria-label="${esc(alt)}">` +
      sceneSVG(entry) +
      (label ? `<figcaption class="media__label">${esc(t("common.demoImage"))}</figcaption>` : "") +
      String(opts.children ?? "") +
      `</figure>`
  );
}
