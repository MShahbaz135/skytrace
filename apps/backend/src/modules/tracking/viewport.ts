import { bboxCreditCost, bboxUnion, normaliseBbox, type Bbox } from '@skytrace/shared';

export interface QueryPlan {
  boxes: Bbox[];
  /** OpenSky credits this plan will consume per poll cycle. */
  totalCost: number;
}

/** Beyond this many distinct viewports, merging pairwise is not worth the CPU. */
const UNION_EVERYTHING_THRESHOLD = 32;

/**
 * Turns the set of subscribed client viewports into the cheapest set of upstream queries.
 *
 * OpenSky prices `/states/all` by bounding-box area, so two adjacent viewports are often
 * cheaper to fetch as one larger box than as two small ones. Merging also cuts request
 * count, which matters because every request costs at least one credit regardless of size.
 */
export function planQueries(viewports: Bbox[], maxRequests: number): QueryPlan {
  if (viewports.length === 0) return { boxes: [], totalCost: 0 };

  const normalised = viewports.map(normaliseBbox);

  if (normalised.length > UNION_EVERYTHING_THRESHOLD) {
    const all = normalised.reduce(bboxUnion);
    return { boxes: [all], totalCost: bboxCreditCost(all) };
  }

  let boxes = dedupe(normalised);

  // Merge any pair where combining them costs no more than querying them separately.
  let merged = true;
  while (merged && boxes.length > 1) {
    merged = false;
    outer: for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const union = bboxUnion(boxes[i], boxes[j]);
        if (bboxCreditCost(union) <= bboxCreditCost(boxes[i]) + bboxCreditCost(boxes[j])) {
          boxes = boxes.filter((_, index) => index !== i && index !== j).concat(union);
          merged = true;
          break outer;
        }
      }
    }
  }

  // Still too many requests: force merges, cheapest cost increase first.
  while (boxes.length > Math.max(1, maxRequests)) {
    let best: { i: number; j: number; union: Bbox; delta: number } | null = null;
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const union = bboxUnion(boxes[i], boxes[j]);
        const delta =
          bboxCreditCost(union) - (bboxCreditCost(boxes[i]) + bboxCreditCost(boxes[j]));
        if (!best || delta < best.delta) best = { i, j, union, delta };
      }
    }
    if (!best) break;
    const { i, j, union } = best;
    boxes = boxes.filter((_, index) => index !== i && index !== j).concat(union);
  }

  return {
    boxes,
    totalCost: boxes.reduce((sum, box) => sum + bboxCreditCost(box), 0),
  };
}

function dedupe(boxes: Bbox[]): Bbox[] {
  const seen = new Map<string, Bbox>();
  for (const box of boxes) {
    const key = [box.south, box.west, box.north, box.east]
      .map((n) => n.toFixed(3))
      .join(':');
    if (!seen.has(key)) seen.set(key, box);
  }
  return [...seen.values()];
}
