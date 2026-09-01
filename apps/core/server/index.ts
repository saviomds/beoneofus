import { createApp } from './app'
import { bootStorage, store } from './lib/db'
import { snapshot, pruneBackups } from './lib/store/backup'

const PORT = Number(process.env.PORT) || 3001

function main() {
  console.log('[bou] starting storage engine…')
  let report
  try {
    report = bootStorage()
  } catch (err) {
    console.error('\n[bou] STORAGE RECOVERY FAILED — refusing to start.\n')
    console.error((err as Error).message)
    console.error('\nNo data was overwritten. Restore a backup from', store.dataDir + '/backups or investigate.\n')
    process.exit(1)
  }

  console.log(`[bou] storage ${report.status}` +
    (report.notes.length ? `\n       ${report.notes.join('\n       ')}` : '') +
    (report.relationshipWarnings.length ? `\n       ${report.relationshipWarnings.length} relationship warning(s)` : ''))

  const app = createApp()
  const server = app.listen(PORT, () => {
    console.log(`[bou] API + app on http://localhost:${PORT}`)
  })

  // Daily backup + prune while the process is alive.
  const daily = setInterval(() => {
    try {
      snapshot(store, 'daily')
      pruneBackups(store, 30)
    } catch (e) {
      console.error('[bou] scheduled backup failed', e)
    }
  }, 24 * 60 * 60 * 1000)

  const shutdown = () => {
    clearInterval(daily)
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 3000)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main()
