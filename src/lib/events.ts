import { ActivityEvent } from './types';

type Listener = (event: ActivityEvent) => void;

class ActivityEventEmitter {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: ActivityEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        // don't let one bad listener break the others
      }
    });
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

// Persist across HMR in development
const globalForEmitter = globalThis as unknown as { __activityEmitter?: ActivityEventEmitter };
export const activityEmitter = globalForEmitter.__activityEmitter ?? new ActivityEventEmitter();
globalForEmitter.__activityEmitter = activityEmitter;

let eventCounter = 0;

export function emitActivity(
  invoiceId: string,
  type: ActivityEvent['type'],
  message: string,
  data?: Record<string, unknown>
): ActivityEvent {
  const event: ActivityEvent = {
    id: `evt-${Date.now()}-${++eventCounter}`,
    invoiceId,
    type,
    message,
    timestamp: new Date().toISOString(),
    data,
  };
  activityEmitter.emit(event);
  return event;
}
