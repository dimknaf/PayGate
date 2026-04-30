/**
 * Proves the pipeline queue:
 *   1. serializes runners (no overlap, FIFO order)
 *   2. isolates failures (a throwing runner does not stall the queue)
 *   3. times out hung runners and lets the queue advance
 *
 * Run: npx tsx scripts/verify-pipeline-queue.ts
 */
delete (globalThis as unknown as { __pipelineQueueTail?: unknown }).__pipelineQueueTail;

import {
  enqueuePipeline,
  enqueuePipelineWithTimeout,
  PipelineTimeoutError,
} from '../src/lib/pipeline-queue';

function resetQueue() {
  delete (globalThis as unknown as { __pipelineQueueTail?: unknown }).__pipelineQueueTail;
}

async function caseSerialization() {
  resetQueue();
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

  if (maxActive !== 1) throw new Error(`Expected max concurrency 1, got ${maxActive}`);
  const expected = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5];
  if (JSON.stringify(order) !== JSON.stringify(expected)) {
    throw new Error(`Wrong order: ${JSON.stringify(order)}`);
  }
  console.log('  [OK] case 1: strict serialization and FIFO order');
}

async function caseFailureIsolation() {
  resetQueue();
  const order: string[] = [];

  const failing = enqueuePipeline(async () => {
    order.push('failing:start');
    await new Promise((r) => setTimeout(r, 10));
    order.push('failing:throw');
    throw new Error('boom');
  }).catch(() => {
    order.push('failing:caught');
  });

  const next = enqueuePipeline(async () => {
    order.push('next:start');
    await new Promise((r) => setTimeout(r, 10));
    order.push('next:done');
    return 'ok';
  });

  await Promise.all([failing, next]);

  const expected = [
    'failing:start',
    'failing:throw',
    'failing:caught',
    'next:start',
    'next:done',
  ];
  if (JSON.stringify(order) !== JSON.stringify(expected)) {
    throw new Error(`Failure did not isolate: ${JSON.stringify(order)}`);
  }
  console.log('  [OK] case 2: failure isolation (next runner still executes)');
}

async function caseTimeoutUnblocks() {
  resetQueue();
  const order: string[] = [];

  const hanging = enqueuePipelineWithTimeout(async () => {
    order.push('hang:start');
    await new Promise(() => {}); // never resolves
    order.push('hang:done'); // unreachable
  }, 50).catch((err: unknown) => {
    if (err instanceof PipelineTimeoutError) {
      order.push('hang:timeout');
    } else {
      order.push(`hang:wrong-error:${(err as Error).message}`);
    }
  });

  const after = enqueuePipeline(async () => {
    order.push('after:start');
    await new Promise((r) => setTimeout(r, 10));
    order.push('after:done');
    return 'ok';
  });

  await Promise.all([hanging, after]);

  const expected = ['hang:start', 'hang:timeout', 'after:start', 'after:done'];
  if (JSON.stringify(order) !== JSON.stringify(expected)) {
    throw new Error(`Timeout did not unblock queue: ${JSON.stringify(order)}`);
  }
  console.log('  [OK] case 3: timeout rejects with PipelineTimeoutError and queue advances');
}

async function main() {
  console.log('verify-pipeline-queue: running 3 cases...');
  await caseSerialization();
  await caseFailureIsolation();
  await caseTimeoutUnblocks();
  console.log('verify-pipeline-queue: ALL CASES PASSED.');
}

main().catch((e) => {
  console.error('verify-pipeline-queue: FAILED', e);
  process.exit(1);
});
