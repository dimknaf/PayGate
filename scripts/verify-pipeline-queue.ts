/**
 * Proves enqueuePipeline serializes runners (no overlap).
 * Run: npx tsx scripts/verify-pipeline-queue.ts
 */
delete (globalThis as unknown as { __pipelineQueueTail?: unknown }).__pipelineQueueTail;

import { enqueuePipeline } from '../src/lib/pipeline-queue';

async function main() {
  let active = 0;
  let maxActive = 0;
  const order: number[] = [];

  function enqueue(id: number) {
    return enqueuePipeline(async () => {
      active++;
      maxActive = Math.max(maxActive, active);
      order.push(id);
      await new Promise((r) => setTimeout(r, 25));
      order.push(-id);
      active--;
      return id;
    });
  }

  await Promise.all([enqueue(1), enqueue(2), enqueue(3), enqueue(4), enqueue(5)]);

  if (maxActive !== 1) {
    throw new Error(`Expected max concurrency 1, got ${maxActive}`);
  }

  const expected = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
  const ok = JSON.stringify(order) === JSON.stringify(expected);
  if (!ok) {
    throw new Error(`Wrong order: ${JSON.stringify(order)}`);
  }

  console.log('verify-pipeline-queue: OK — strict serialization and FIFO order.');
}

main().catch((e) => {
  console.error('verify-pipeline-queue: FAILED', e);
  process.exit(1);
});
