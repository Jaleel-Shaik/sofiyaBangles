export interface LoggedError {
  id: string;
  ts: number;
  type: string;
  statusCode?: number;
  title: string;
  message: string;
  technical?: string;
  url?: string;
  retriable: boolean;
  systemic: boolean;
}

const MAX_ENTRIES = 200;

let errors: LoggedError[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function logError(entry: Omit<LoggedError, "id" | "ts">): LoggedError {
  const record: LoggedError = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ts: Date.now(),
  };
  errors = [record, ...errors].slice(0, MAX_ENTRIES);
  emit();
  return record;
}

export function getErrors(): LoggedError[] {
  return errors;
}

export function clearErrors(): void {
  errors = [];
  emit();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
