# Migrating the storage engine

JSON files are the *current implementation*, not the architecture. Everything
goes through `Repository<T>` (`server/lib/store/Repository.ts`):

```ts
interface Repository<T extends { id: Id }> {
  list(filter?): Promise<T[]>
  get(id): Promise<T | null>
  query(predicate): Promise<T[]>
  create(dto, actorId?): Promise<T>
  update(id, patch, { actorId?, expectedVersion? }?): Promise<T>
  remove(id, actorId?): Promise<void>
  count(filter?): Promise<number>
}
```

`server/lib/db.ts` is the **only** file that names a concrete engine:

```ts
export const studentsRepo = new FileRepository(store, 'students', 'STD')
// …one per collection
```

## Step 1 — implement `SqlRepository`

```ts
// server/lib/store/SqlRepository.ts
import { pool } from './pg'
export class SqlRepository<T extends { id: string }> implements Repository<T> {
  constructor(private table: string, private prefix: string) {}
  async list(filter = {}) {
    const clauses = Object.keys(filter).map((k, i) => `"${k}" = $${i + 1}`)
    const { rows } = await pool.query(
      `select * from "${this.table}"` + (clauses.length ? ` where ${clauses.join(' and ')}` : ''),
      Object.values(filter),
    )
    return rows as T[]
  }
  async get(id) { const { rows } = await pool.query(`select * from "${this.table}" where id=$1`, [id]); return rows[0] ?? null }
  async create(dto, actorId = 'system') {
    const row = { id: dto.id ?? `${this.prefix}_${crypto.randomUUID()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1, ...dto }
    const cols = Object.keys(row); const vals = Object.values(row)
    await pool.query(`insert into "${this.table}" (${cols.map(c => `"${c}"`)}) values (${cols.map((_, i) => `$${i + 1}`)})`, vals)
    await audit(actorId, 'CREATE', this.table, row.id); return row as T
  }
  async update(id, patch, opts = {}) {
    // optimistic concurrency: WHERE version = $expected  → 0 rows ⇒ ConflictError
    const set = Object.keys(patch).map((k, i) => `"${k}" = $${i + 1}`)
    const args = [...Object.values(patch), new Date().toISOString(), id]
    let sql = `update "${this.table}" set ${set}, "updatedAt" = $${args.length - 1}, version = version + 1 where id = $${args.length}`
    if (opts.expectedVersion != null) { sql += ` and version = $${args.length + 1}`; args.push(opts.expectedVersion) }
    const { rowCount, rows } = await pool.query(sql + ' returning *', args)
    if (rowCount === 0) throw new ConflictError()
    return rows[0] as T
  }
  async remove(id, actorId = 'system') { await pool.query(`update "${this.table}" set status='archived', version=version+1 where id=$1`, [id]); await audit(actorId, 'REMOVE', this.table, id) }
  async query(pred) { return (await this.list()).filter(pred) }
  async count(filter) { return (await this.list(filter)).length }
}
```

Use Supabase's client instead of `pg` if you prefer — the shape is the same.

## Step 2 — flip `server/lib/db.ts`

```ts
export const studentsRepo = new SqlRepository('students', 'STD')
```

Nothing in `server/services/**`, `server/app.ts` or the client changes. Delete
`FileStore` / `FileRepository` / `recovery` / `backup` (or keep them for local
demos). `bootStorage()` becomes "run pending SQL migrations".

## Step 3 — schema

One table per collection (see [DATABASE.md](./DATABASE.md) for fields). Types:
`id text primary key`, timestamps `timestamptz`, `version int not null default 1`,
arrays as `text[]`, `timeline`/`metadata`/`values`/`goals` as `jsonb`.
Import the seed JSON as the initial data.

## Step 4 — tenant isolation → Row-Level Security

The `assertTenant()` calls stay as defence-in-depth, but the authoritative rule
moves to Postgres RLS, one policy per table, e.g.:

```sql
alter table students enable row level security;
create policy tenant_read on students for select
  using ( current_setting('app.org_id', true) = organization_id
          or current_setting('app.role', true) = 'admin' );
```

Set `app.org_id` / `app.role` per request from the session. The permission matrix
in [RBAC.md](./RBAC.md) maps directly to policies.

## Step 5 — auth, sessions, notifications

`authSessions` → a `sessions` table or Redis. `auditService` / `notificationService`
already centralise those writes — point them at tables (or Supabase Realtime).
Swap `scrypt` for the provider's password handling if you adopt Supabase Auth;
keep `AuthContext`'s shape so guards and pages are untouched.
