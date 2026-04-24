interface RequestTrace {
  traceId: string;
  method: string;
  url: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  error?: string;
}

class RequestTracker {
  private readonly traces = new Map<string, RequestTrace>();

  start(method: string, url: string): string {
    const traceId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.traces.set(traceId, { traceId, method, url, startTime: Date.now() });
    while (this.traces.size > 200) {
      const oldest = this.traces.keys().next().value;
      if (oldest === undefined) break;
      this.traces.delete(oldest);
    }
    return traceId;
  }

  end(traceId: string, status: number): void {
    const t = this.traces.get(traceId);
    if (!t) return;
    const endTime = Date.now();
    this.traces.set(traceId, {
      ...t,
      endTime,
      duration: endTime - t.startTime,
      status,
    });
  }

  fail(traceId: string, error: string): void {
    const t = this.traces.get(traceId);
    if (!t) return;
    const endTime = Date.now();
    this.traces.set(traceId, {
      ...t,
      endTime,
      duration: endTime - t.startTime,
      error,
    });
  }

  get(traceId: string): RequestTrace | undefined {
    return this.traces.get(traceId);
  }

  getAll(): RequestTrace[] {
    return [...this.traces.values()];
  }

  getRecent(n: number): RequestTrace[] {
    return this.getAll().slice(-n);
  }

  clear(): void {
    this.traces.clear();
  }
}

export const tracker = new RequestTracker();
