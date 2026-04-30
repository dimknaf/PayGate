/**
 * Serialize pipeline runs against a single Cursor SDK agent singleton.
 * Concurrent agent.send() / stream() calls interleave outputs and corrupt
 * parses, timeouts, and risk assessments (especially with "Process All").
 */
const globalForQueue = globalThis as unknown as { __pipelineQueueTail?: Promise<unknown> };

export class PipelineTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Pipeline timed out after ${timeoutMs}ms`);
    this.name = 'PipelineTimeoutError';
  }
}

export function enqueuePipeline<T>(runner: () => Promise<T>): Promise<T> {
  const prev = globalForQueue.__pipelineQueueTail ?? Promise.resolve();
  const next: Promise<T> = prev.catch(() => {}).then(() => runner());
  globalForQueue.__pipelineQueueTail = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/**
 * Like enqueuePipeline, but rejects with PipelineTimeoutError if the runner
 * has not settled within timeoutMs. The queue tail still advances on timeout
 * so subsequent invoices keep moving — a single hung run cannot stall the queue.
 */
export function enqueuePipelineWithTimeout<T>(
  runner: () => Promise<T>,
  timeoutMs: number
): Promise<T> {
  return enqueuePipeline(() => {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new PipelineTimeoutError(timeoutMs));
      }, timeoutMs);

      runner().then(
        (value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  });
}
