import { bboxCreditCost, type Bbox } from '@skytrace/shared';
import { planQueries } from './viewport';

function box(south: number, west: number, north: number, east: number): Bbox {
  return { south, west, north, east };
}

describe('planQueries', () => {
  it('issues nothing when nobody is watching', () => {
    expect(planQueries([], 3)).toEqual({ boxes: [], totalCost: 0 });
  });

  it('passes a single viewport straight through', () => {
    const viewport = box(45, 0, 50, 5);
    const plan = planQueries([viewport], 3);

    expect(plan.boxes).toEqual([viewport]);
    expect(plan.totalCost).toBe(1);
  });

  it('collapses identical viewports into one request', () => {
    const viewport = box(45, 0, 50, 5);
    const plan = planQueries([viewport, viewport, viewport], 3);

    expect(plan.boxes).toHaveLength(1);
    expect(plan.totalCost).toBe(1);
  });

  it('merges neighbours when the combined box costs no more than querying separately', () => {
    // Two 5x5 boxes side by side cost 1 each; the 5x10 union costs 2, so merging is a wash
    // on credits and saves a request.
    const plan = planQueries([box(45, 0, 50, 5), box(45, 5, 50, 10)], 3);

    expect(plan.boxes).toHaveLength(1);
    expect(plan.boxes[0]).toEqual(box(45, 0, 50, 10));
    expect(plan.totalCost).toBe(2);
  });

  it('keeps far-apart viewports separate when merging would cost more', () => {
    // Europe and Australia: the union spans most of the planet and would jump to 4 credits,
    // against 2 for querying each region on its own.
    const europe = box(45, 0, 50, 5);
    const australia = box(-38, 144, -33, 149);
    const plan = planQueries([europe, australia], 3);

    expect(plan.boxes).toHaveLength(2);
    expect(plan.totalCost).toBe(2);
  });

  it('forces merges once the request budget is exceeded', () => {
    const scattered = [
      box(45, 0, 50, 5),
      box(-38, 144, -33, 149),
      box(30, -120, 35, -115),
      box(-25, -50, -20, -45),
    ];

    const plan = planQueries(scattered, 2);

    expect(plan.boxes.length).toBeLessThanOrEqual(2);
  });

  it('unions everything rather than pairwise-merging a large subscriber set', () => {
    const many = Array.from({ length: 40 }, (_, i) => box(0 + i * 0.1, 0, 1 + i * 0.1, 1));
    const plan = planQueries(many, 3);

    expect(plan.boxes).toHaveLength(1);
    expect(plan.totalCost).toBe(bboxCreditCost(plan.boxes[0]));
  });

  it('reports a cost matching the boxes it returns', () => {
    const plan = planQueries([box(40, -10, 60, 20), box(-38, 144, -33, 149)], 3);
    const recomputed = plan.boxes.reduce((sum, b) => sum + bboxCreditCost(b), 0);

    expect(plan.totalCost).toBe(recomputed);
  });
});
