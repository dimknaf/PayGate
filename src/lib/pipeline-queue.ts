/**
 * Serialize pipeline runs against a single Cursor SDK agent singleton.
 * Concurrent agent.send() / stream() calls interleave outputs and corrupt
 * parses, timeouts, and risk assessments (especially with "Process All").
 */
const globalForQueue = globalThis as unknown as { __pipelineQueueTail?: Promise<unknown> };

export function enqueuePipeline<T>(runner: () => Promise<T>): Promise<T> {
  const prev = globalForQueue.__pipelineQueueTail ?? Promise.resolve();
  const next: Promise<T> = prev.catch(() => {}).then(() => runner());
  globalForQueue.__pipelineQueueTail = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}
