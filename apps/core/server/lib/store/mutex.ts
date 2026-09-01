/** Minimal FIFO async mutex — one instance per collection guards its writes. */
export class AsyncMutex {
  private queue: (() => void)[] = []
  private locked = false

  async acquire(): Promise<() => void> {
    if (this.locked) {
      await new Promise<void>((resolve) => this.queue.push(resolve))
    }
    this.locked = true
    let released = false
    return () => {
      if (released) return
      released = true
      const next = this.queue.shift()
      if (next) next()
      else this.locked = false
    }
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire()
    try {
      return await fn()
    } finally {
      release()
    }
  }
}

const mutexes = new Map<string, AsyncMutex>()

export function mutexFor(key: string): AsyncMutex {
  let m = mutexes.get(key)
  if (!m) {
    m = new AsyncMutex()
    mutexes.set(key, m)
  }
  return m
}
