import { appendFileSync, readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export type JournalOp = 'CREATE' | 'UPDATE' | 'REMOVE' | 'BULK'

export interface JournalEntry {
  txId: string
  seq: number
  ts: string
  actorId: string
  op: JournalOp
  collection: string
  recordId: string | null
  before: unknown | null
  after: unknown | null
  /** 'pending' written before the atomic rename, 'committed' after, 'rolledback' by recovery. */
  status: 'pending' | 'committed' | 'rolledback'
}

/**
 * Append-only transaction journal (NDJSON). Written synchronously so a crash
 * cannot lose a record of an in-flight write. Recovery reads this to roll
 * incomplete transactions forward or back.
 */
export class Journal {
  private seq = 0
  constructor(private readonly path: string) {
    mkdirSync(dirname(path), { recursive: true })
    if (!existsSync(path)) writeFileSync(path, '')
    // Continue the sequence from whatever is already on disk.
    for (const e of this.readAll()) this.seq = Math.max(this.seq, e.seq)
  }

  private append(entry: JournalEntry): void {
    appendFileSync(this.path, JSON.stringify(entry) + '\n')
  }

  writePending(
    txId: string,
    actorId: string,
    op: JournalOp,
    collection: string,
    recordId: string | null,
    before: unknown,
    after: unknown,
  ): JournalEntry {
    this.seq += 1
    const entry: JournalEntry = {
      txId, seq: this.seq, ts: new Date().toISOString(),
      actorId, op, collection, recordId, before: before ?? null, after: after ?? null,
      status: 'pending',
    }
    this.append(entry)
    return entry
  }

  writeStatus(txId: string, status: 'committed' | 'rolledback'): void {
    this.seq += 1
    this.append({
      txId, seq: this.seq, ts: new Date().toISOString(), actorId: 'system',
      op: 'BULK', collection: '*', recordId: null, before: null, after: null, status,
    })
  }

  readAll(): JournalEntry[] {
    if (!existsSync(this.path)) return []
    return readFileSync(this.path, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as JournalEntry
        } catch {
          return null
        }
      })
      .filter((e): e is JournalEntry => e !== null)
  }

  /** Transactions whose most recent marker is not 'committed'/'rolledback'. */
  incompleteTransactions(): Map<string, JournalEntry[]> {
    const byTx = new Map<string, JournalEntry[]>()
    const finalised = new Set<string>()
    for (const e of this.readAll()) {
      if (!byTx.has(e.txId)) byTx.set(e.txId, [])
      byTx.get(e.txId)!.push(e)
      if (e.status === 'committed' || e.status === 'rolledback') finalised.add(e.txId)
    }
    for (const txId of finalised) byTx.delete(txId)
    // Only keep the actual data-carrying pending entries
    for (const [txId, entries] of byTx) {
      byTx.set(txId, entries.filter((e) => e.status === 'pending' && e.collection !== '*'))
      if (byTx.get(txId)!.length === 0) byTx.delete(txId)
    }
    return byTx
  }

  /** Compact: keep only entries for the last `keep` finalised transactions. */
  compact(keep = 500): void {
    const all = this.readAll()
    const finalisedOrder: string[] = []
    for (const e of all) {
      if ((e.status === 'committed' || e.status === 'rolledback') && !finalisedOrder.includes(e.txId)) {
        finalisedOrder.push(e.txId)
      }
    }
    const keepTx = new Set(finalisedOrder.slice(-keep))
    // also keep anything not yet finalised
    const finalised = new Set(finalisedOrder)
    const kept = all.filter((e) => keepTx.has(e.txId) || !finalised.has(e.txId))
    writeFileSync(this.path, kept.map((e) => JSON.stringify(e)).join('\n') + (kept.length ? '\n' : ''))
  }
}
