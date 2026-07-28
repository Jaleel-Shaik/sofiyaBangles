import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReviewStats } from './product.model';

test('calculateReviewStats averages ratings and preserves review count', () => {
  const result = calculateReviewStats([
    { rating: 5 },
    { rating: 4 },
    { rating: 3 },
  ] as Array<{ rating: number }>);

  assert.deepEqual(result, { rating: 4, reviews: 3 });
});
