/**
 * Proves the agent pool:
 *   1. caps in-flight runners at the configured size
 *   2. waiters resume in FIFO order as slots free up
 *   3. a runner that throws still releases its slot
 *   4. withTimeout rejects with PipelineTimeoutError; the slot is still released
 *      (handled by the caller's finally block)
 *   5. lazy agent creation reuses the same agent inside a slot across leases
 *
 * Run: npx tsx scripts/verify-agent-pool.ts
 */
import { AgentPool, withTimeout, PipelineTimeoutError } from '../src/lib/agent-pool';
import type { SDKAgent } from '@cursor/sdk';

let nextAgentId = 0;
function makeFakeAgent(): SDKAgent {
  const id = ++nextAgentId;
  return { __fakeId: id, close: () => {} } as unknown as SDKAgent;
}

async function caseConcurrencyCap() {
  const pool = new AgentPool(3, async () => makeFakeAgent());
  let active = 0;
  let maxActive = 0;

  async function run(ms: number): Promise<void> {
    const lease = await pool.acquire();
    try {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, ms));
      active--;
    } finally {
      lease.release();
    }
  }

  await Promise.all([run(40), run(40), run(40), run(40), run(40), run(40), run(40)]);

  if (maxActive !== 3) {
    throw new Error(`Expected max concurrency 3, got ${maxActive}`);
  }
  if (pool.inFlight !== 0) {
    throw new Error(`Expected pool drained, inFlight=${pool.inFlight}`);
  }
  console.log('  [OK] case 1: concurrency capped at pool size (3)');
}

async function caseWaiterFifo() {
  const pool = new AgentPool(2, async () => makeFakeAgent());
  const order: number[] = [];

  // Acquire both slots and hold them.
  const a = await pool.acquire();
  const b = await pool.acquire();

  // Queue 3 waiters.
  const w1 = pool.acquire().then((l) => {
    order.push(1);
    setTimeout(() => l.release(), 5);
  });
  const w2 = pool.acquire().then((l) => {
    order.push(2);
    setTimeout(() => l.release(), 5);
  });
  const w3 = pool.acquire().then((l) => {
    order.push(3);
    setTimeout(() => l.release(), 5);
  });

  if (pool.waiting !== 3) throw new Error(`Expected 3 waiting, got ${pool.waiting}`);

  // Release in reverse to confirm waiters wake in FIFO regardless.
  a.release();
  b.release();

  await Promise.all([w1, w2, w3]);
  if (JSON.stringify(order) !== JSON.stringify([1, 2, 3])) {
    throw new Error(`Waiter order wrong: ${JSON.stringify(order)}`);
  }
  console.log('  [OK] case 2: waiters resume in FIFO order');
}

async function caseFailureReleases() {
  const pool = new AgentPool(1, async () => makeFakeAgent());
  let secondRan = false;

  const failing = (async () => {
    const lease = await pool.acquire();
    try {
      throw new Error('boom');
    } finally {
      lease.release();
    }
  })().catch(() => 'caught');

  const next = (async () => {
    const lease = await pool.acquire();
    try {
      secondRan = true;
    } finally {
      lease.release();
    }
  })();

  await Promise.all([failing, next]);
  if (!secondRan) throw new Error('Slot was not released after failure');
  if (pool.inFlight !== 0) throw new Error(`Pool not drained, inFlight=${pool.inFlight}`);
  console.log('  [OK] case 3: failed runner still releases its slot');
}

async function caseTimeoutReleases() {
  const pool = new AgentPool(1, async () => makeFakeAgent());
  let thirdRan = false;
  let timedOut = false;

  const hanging = (async () => {
    const lease = await pool.acquire();
    try {
      await withTimeout(() => new Promise<void>(() => {}), 30);
    } catch (err) {
      if (err instanceof PipelineTimeoutError) timedOut = true;
      else throw err;
    } finally {
      lease.release();
    }
  })();

  const after = (async () => {
    const lease = await pool.acquire();
    try {
      thirdRan = true;
    } finally {
      lease.release();
    }
  })();

  await Promise.all([hanging, after]);
  if (!timedOut) throw new Error('withTimeout did not reject with PipelineTimeoutError');
  if (!thirdRan) throw new Error('Slot was not released after timeout');
  if (pool.inFlight !== 0) throw new Error(`Pool not drained, inFlight=${pool.inFlight}`);
  console.log('  [OK] case 4: timeout rejects and slot is still released');
}

async function caseAgentReuseWithinSlot() {
  let createdCount = 0;
  const pool = new AgentPool(1, async () => {
    createdCount++;
    return makeFakeAgent();
  });

  const l1 = await pool.acquire();
  const id1 = (l1.agent as unknown as { __fakeId: number }).__fakeId;
  l1.release();

  const l2 = await pool.acquire();
  const id2 = (l2.agent as unknown as { __fakeId: number }).__fakeId;
  l2.release();

  if (createdCount !== 1) throw new Error(`Expected 1 agent creation, got ${createdCount}`);
  if (id1 !== id2) throw new Error(`Slot did not reuse agent: ${id1} vs ${id2}`);
  console.log('  [OK] case 5: slot reuses its agent across leases');
}

async function caseAgentFactoryFailureReleases() {
  let attempt = 0;
  const pool = new AgentPool(1, async () => {
    attempt++;
    if (attempt === 1) throw new Error('factory fail');
    return makeFakeAgent();
  });

  let firstError: unknown;
  try {
    await pool.acquire();
  } catch (err) {
    firstError = err;
  }
  if (!(firstError instanceof Error) || firstError.message !== 'factory fail') {
    throw new Error('Expected factory failure to propagate');
  }

  // Slot must be free again so a retry can succeed.
  const lease = await pool.acquire();
  if (!lease.agent) throw new Error('Retry did not get an agent');
  lease.release();

  if (pool.inFlight !== 0) throw new Error(`Pool not drained, inFlight=${pool.inFlight}`);
  console.log('  [OK] case 6: factory failure releases the slot for retry');
}

async function main() {
  console.log('verify-agent-pool: running 6 cases...');
  await caseConcurrencyCap();
  await caseWaiterFifo();
  await caseFailureReleases();
  await caseTimeoutReleases();
  await caseAgentReuseWithinSlot();
  await caseAgentFactoryFailureReleases();
  console.log('verify-agent-pool: ALL CASES PASSED.');
}

main().catch((e) => {
  console.error('verify-agent-pool: FAILED', e);
  process.exit(1);
});
