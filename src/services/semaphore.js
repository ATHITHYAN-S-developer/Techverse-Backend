import { ENV } from "../config/env.js";

export class ArenaBusyError extends Error {
  constructor(retryAfter = 2) {
    super("The Coding Arena is busy. Please wait a moment and try again.");
    this.name = "ArenaBusyError";
    this.statusCode = 503;
    this.code = "ARENA_BUSY";
    this.retryAfter = retryAfter;
  }
}

export class Semaphore {
  constructor(max) {
    this.max = max;
    this.active = 0;
    this.waiters = [];
  }

  acquire(timeoutMs) {
    if (this.active < this.max) {
      this.active += 1;
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      const waiter = { resolve };
      waiter.timer = setTimeout(() => {
        const index = this.waiters.indexOf(waiter);
        if (index !== -1) this.waiters.splice(index, 1);
        resolve(false);
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.waiters.shift();
    if (next) {
      clearTimeout(next.timer);
      next.resolve(true);
    }
  }

  async run(task, timeoutMs) {
    const acquired = await this.acquire(timeoutMs);
    if (!acquired) throw new ArenaBusyError();
    try {
      return await task();
    } finally {
      this.release();
    }
  }
}

export const codeRunSemaphore = new Semaphore(ENV.CODE_RUN_MAX_CONCURRENCY);