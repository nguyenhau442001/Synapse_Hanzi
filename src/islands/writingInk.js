// Pure helpers for the writing practice worksheet (src/islands/Writing.jsx):
// brush-ink outlines, stroke grading against Make Me a Hanzi medians, and the
// worksheet layout. No DOM access, so tools/test_writing_ink.mjs can run them in Node.
//
// Coordinates: every cell is drawn in a 1024 × 1024 SVG box. Stroke data uses
// the Make Me a Hanzi frame (y grows upwards, baseline at 900), so a data point
// (x, y) sits at SVG (x, 900 - y).

export const CELL_SIZE = 1024;
export const DATA_BASELINE = 900;

const INK_BASE_WIDTH = 64;

export function toDataPoint(svgPoint) {
  return [svgPoint[0], DATA_BASELINE - svgPoint[1]];
}

function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function pathLength(points) {
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += dist(points[i - 1], points[i]);
  return total;
}

// Evenly spaced points along a polyline.
export function resample(points, count) {
  if (!points.length) return [];
  if (points.length === 1) return Array.from({ length: count }, () => points[0].slice());
  const total = pathLength(points);
  if (total === 0) return Array.from({ length: count }, () => points[0].slice());
  const step = total / (count - 1);
  const out = [points[0].slice()];
  let carried = 0;
  for (let i = 1; i < points.length && out.length < count; i += 1) {
    let prev = points[i - 1];
    const cur = points[i];
    let seg = dist(prev, cur);
    while (carried + seg >= step && out.length < count) {
      const t = (step - carried) / seg;
      const p = [prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t];
      out.push(p);
      seg -= step - carried;
      prev = p;
      carried = 0;
    }
    carried += seg;
  }
  while (out.length < count) out.push(points[points.length - 1].slice());
  return out;
}

function pointToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (!len2) return dist(p, a);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return dist(p, [a[0] + t * dx, a[1] + t * dy]);
}

function distanceToPolyline(p, line) {
  let best = Infinity;
  for (let i = 1; i < line.length; i += 1) best = Math.min(best, pointToSegment(p, line[i - 1], line[i]));
  return line.length === 1 ? dist(p, line[0]) : best;
}

function strokeDistance(user, target) {
  let forward = 0;
  for (const p of user) forward += distanceToPolyline(p, target);
  let backward = 0;
  for (const p of target) backward += distanceToPolyline(p, user);
  return (forward + backward) / (user.length + target.length);
}

/**
 * Grade one drawn stroke against the expected median (both in data coordinates).
 * leniency > 1 relaxes every threshold (fingers are less precise than a pen).
 * others: medians of the strokes not written yet; if the drawing is clearly closer to
 * one of them, it is reported as the wrong stroke order.
 * Returns { ok, score, reason } where reason explains a failure in Vietnamese.
 */
export function matchStroke(userPoints, median, leniency = 1, others = []) {
  if (!userPoints || userPoints.length < 2 || !median || median.length < 2) {
    return { ok: false, score: Infinity, reason: 'Nét quá ngắn' };
  }
  const user = resample(userPoints, 24);
  const target = resample(median, 24);
  const targetLen = pathLength(target);
  const userLen = pathLength(user);
  const shortStroke = targetLen < 220; // dots and short ticks

  const avg = strokeDistance(user, target);
  const startGap = dist(user[0], target[0]);
  const endGap = dist(user[user.length - 1], target[target.length - 1]);
  const ud = [user[user.length - 1][0] - user[0][0], user[user.length - 1][1] - user[0][1]];
  const td = [target[target.length - 1][0] - target[0][0], target[target.length - 1][1] - target[0][1]];
  const cos = (ud[0] * td[0] + ud[1] * td[1]) / ((Math.hypot(ud[0], ud[1]) * Math.hypot(td[0], td[1])) || 1);
  const ratio = userLen / (targetLen || 1);

  // Tolerance scales with the stroke: small strokes inside a radical sit close together.
  const maxAvg = Math.min(150, Math.max(75, targetLen * 0.32)) * leniency;
  const maxGap = Math.min(280, Math.max(150, targetLen * 0.55)) * leniency;
  const ownScore = avg + 0.5 * (startGap + endGap) / 2;

  // Does the drawing fit one of the strokes not written yet better than the expected one?
  let fitsOther = false;
  for (const other of others || []) {
    if (!other || other.length < 2) continue;
    const alt = resample(other, 24);
    const altAvg = strokeDistance(user, alt);
    const altLimit = Math.min(150, Math.max(75, pathLength(alt) * 0.32)) * leniency;
    const otherScore = altAvg + 0.5 * (dist(user[0], alt[0]) + dist(user[user.length - 1], alt[alt.length - 1])) / 2;
    if (altAvg <= altLimit && otherScore < ownScore * 0.75) fitsOther = true;
  }
  const fail = (reason) => ({ ok: false, score: avg, reason: fitsOther ? 'Sai thứ tự nét' : reason });

  if (avg > maxAvg) return fail('Nét lệch khỏi vị trí');
  if (!shortStroke && cos < 0.2) return fail('Nét đi ngược chiều');
  if (startGap > maxGap || endGap > maxGap) return fail('Điểm đầu hoặc cuối nét chưa đúng');
  if (!shortStroke && (ratio < 0.4 / leniency || ratio > 2.4 * leniency)) {
    return fail(ratio < 1 ? 'Nét quá ngắn' : 'Nét quá dài');
  }
  if (fitsOther) return fail('');
  return { ok: true, score: avg, reason: '' };
}

/**
 * Pressure / speed for one input sample → relative brush width (≈0.35–1.25).
 * Pens report real pressure; mice and fingers usually do not, so speed thins the line.
 */
export function sampleWidth(pointerType, pressure, speed) {
  if (pointerType === 'pen' && pressure > 0) return 0.35 + 0.9 * Math.min(1, pressure);
  const fromSpeed = 1.15 - Math.min(speed, 3) * 0.22;
  return Math.max(0.55, Math.min(1.15, fromSpeed));
}

// Re-space samples evenly (positions and widths interpolated) so smoothing works the
// same whether the device sends events densely (pens, 120 Hz) or sparsely (mice, slow touch).
function respace(samples, spacing) {
  const out = [samples[0].slice()];
  let carried = 0;
  for (let i = 1; i < samples.length; i += 1) {
    let prev = samples[i - 1];
    const cur = samples[i];
    let seg = dist(prev, cur);
    while (carried + seg >= spacing) {
      const t = (spacing - carried) / seg;
      const p = [prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t, prev[2] + (cur[2] - prev[2]) * t];
      out.push(p);
      seg -= spacing - carried;
      prev = p;
      carried = 0;
    }
    carried += seg;
  }
  const last = samples[samples.length - 1];
  if (dist(out[out.length - 1], last) > spacing * 0.3) out.push(last.slice());
  return out;
}

function smoothSamples(samples, passes) {
  let pts = samples;
  for (let pass = 0; pass < passes && pts.length > 2; pass += 1) {
    pts = pts.map((p, i) => {
      if (i === 0 || i === pts.length - 1) return p;
      const a = pts[i - 1];
      const b = pts[i + 1];
      return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4, (a[2] + 2 * p[2] + b[2]) / 4];
    });
  }
  return pts;
}

// Half circle from `from` side to the opposite side around `c`, bulging along `dir` (unit vector).
function capPoints(c, n, dir, r, fromSign) {
  const out = [];
  for (let k = 1; k < 8; k += 1) {
    const a = (Math.PI * k) / 8;
    out.push([
      c[0] + fromSign * n[0] * r * Math.cos(a) + dir[0] * r * Math.sin(a),
      c[1] + fromSign * n[1] * r * Math.cos(a) + dir[1] * r * Math.sin(a),
    ]);
  }
  return out;
}

/**
 * Tapered brush outline for a stroke.
 * samples: [[x, y, w], …] in SVG cell coordinates, w = relative width from sampleWidth().
 * finished: when true the tail flicks off (lifted pen); while drawing it stays blunt.
 * Returns an SVG path string (filled polygon with rounded ends).
 */
export function brushPath(samples, finished = true, baseWidth = INK_BASE_WIDTH) {
  if (!samples.length) return '';
  const fmt = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  // Ease the width so speed jitter between events does not show as lumps.
  let w = samples[0][2];
  const eased = samples.map((s) => { w = w * 0.8 + s[2] * 0.2; return [s[0], s[1], w]; });
  const pts = eased.length > 1 ? smoothSamples(respace(eased, 10), 4) : eased;
  if (pts.length < 2 || pathLength(pts) < 4) {
    const [x, y] = pts[0];
    const r = (baseWidth * pts[0][2] * 0.8) / 2;
    return `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(2 * r).toFixed(1)} 0a${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-2 * r).toFixed(1)} 0Z`;
  }
  const total = pathLength(pts);
  const left = [];
  const right = [];
  const normals = [];
  const tangents = [];
  let travelled = 0;
  for (let i = 0; i < pts.length; i += 1) {
    if (i > 0) travelled += dist(pts[i - 1], pts[i]);
    const a = pts[Math.max(0, i - 2)];
    const b = pts[Math.min(pts.length - 1, i + 2)];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    const tan = [tx / len, ty / len];
    const n = [-tan[1], tan[0]];
    const t = travelled / total;
    const press = 0.6 + 0.4 * Math.min(1, travelled / 60); // the brush lands, then spreads
    const tailLen = Math.min(0.3, 140 / total);
    const tail = finished && t > 1 - tailLen ? Math.max(0.18, (1 - t) / tailLen) : 1;
    const half = (baseWidth * pts[i][2] * press * tail) / 2;
    left.push([pts[i][0] + n[0] * half, pts[i][1] + n[1] * half]);
    right.push([pts[i][0] - n[0] * half, pts[i][1] - n[1] * half]);
    normals.push(n);
    tangents.push(tan);
  }
  const last = pts.length - 1;
  const startR = dist(left[0], right[0]) / 2;
  const endR = dist(left[last], right[last]) / 2;
  let d = `M${fmt(left[0])}`;
  for (let i = 1; i <= last; i += 1) d += `L${fmt(left[i])}`;
  // End cap: from the left edge round the front of the stroke to the right edge.
  capPoints(pts[last], normals[last], tangents[last], endR, 1).forEach((p) => { d += `L${fmt(p)}`; });
  for (let i = last; i >= 0; i -= 1) d += `L${fmt(right[i])}`;
  // Start cap: from the right edge round the back of the stroke to the left edge.
  const back = [-tangents[0][0], -tangents[0][1]];
  capPoints(pts[0], normals[0], back, startR, -1).forEach((p) => { d += `L${fmt(p)}`; });
  return d + 'Z';
}

/**
 * Worksheet layout for one character, like a 字帖 page.
 *   - optional stroke-order cells (one per stroke, cumulative) at the top,
 *   - rows that start with a solid model glyph followed by faded glyphs to trace
 *     (fewer each row), then empty cells,
 *   - a last row of empty cells to write from memory.
 * Returns an array of rows; each cell is { kind: 'step'|'model'|'faint'|'empty', step? }.
 */
export function layoutWorksheet({ strokeCount, cols, rows, faded, strokeRow }) {
  const out = [];
  const safeCols = Math.max(3, cols);
  if (strokeRow && strokeCount > 0) {
    const steps = [];
    for (let i = 1; i <= strokeCount; i += 1) steps.push({ kind: 'step', step: i });
    while (steps.length % safeCols) steps.push({ kind: 'faint' });
    for (let i = 0; i < steps.length; i += safeCols) out.push(steps.slice(i, i + safeCols));
  }
  const practiceRows = Math.max(1, rows);
  for (let r = 0; r < practiceRows; r += 1) {
    const row = [];
    const last = r === practiceRows - 1 && practiceRows > 1;
    if (!last) row.push({ kind: 'model' });
    const faintCount = last ? 0 : Math.max(0, faded - r);
    for (let i = 0; i < faintCount && row.length < safeCols; i += 1) row.push({ kind: 'faint' });
    while (row.length < safeCols) row.push({ kind: 'empty' });
    out.push(row);
  }
  return out;
}

/** Unique Han characters of a list of words, in first-seen order. */
export function charactersOfWords(words) {
  const seen = [];
  (words || []).forEach((w) => {
    Array.from((w && w.hanzi) || '').forEach((ch) => {
      if (/\p{Script=Han}/u.test(ch) && !seen.includes(ch)) seen.push(ch);
    });
  });
  return seen;
}
