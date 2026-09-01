import { useState } from 'react'
import { useCurrentUser } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { financeService } from '@/services/operationsService'
import {
  AsyncView, Card, CardHeader, DataTable, EmptyState, Modal, PageHeader, StatusBadge, formatDate,
} from '@/components/ui'
import type { Invoice } from '@shared/types'

const money = (n: number, c = 'RWF') => `${c} ${n.toLocaleString()}`

/** Student + guardian view — their own / their children's invoices, read-only. */
export function MyFinance() {
  const user = useCurrentUser()
  const data = useAsync(() => financeService.invoices(user), [user.id])
  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="section-stack">
      <PageHeader title="Fees & Invoices" description="Your invoices and the payments recorded against them." />
      <AsyncView data={data} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No invoices" description="You have no fee invoices on record." />} onRetry={data.reload}>
        {(rows) => (
          <Card>
            <div className="card-body">
              <DataTable
                rows={rows}
                getKey={(r) => r.id}
                emptyTitle="No invoices"
                columns={[
                  { key: 'ref', header: 'Invoice', render: (r: Invoice) => <strong>{r.reference}</strong> },
                  { key: 'term', header: 'Term', render: (r: Invoice) => `${r.term}` },
                  { key: 'total', header: 'Total', render: (r: Invoice) => money(r.total, r.currency) },
                  { key: 'paid', header: 'Paid', render: (r: Invoice) => money(r.paidAmount, r.currency) },
                  { key: 'bal', header: 'Balance', render: (r: Invoice) => money(r.total - r.paidAmount, r.currency) },
                  { key: 'due', header: 'Due', render: (r: Invoice) => formatDate(r.dueDate) },
                  { key: 'status', header: 'Status', render: (r: Invoice) => <StatusBadge status={r.status} /> },
                ]}
                rowActions={(r) => <button className="link-btn" onClick={() => setOpen(r.id)}>Details</button>}
              />
            </div>
          </Card>
        )}
      </AsyncView>
      {open && <InvoiceDetail id={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

function InvoiceDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const user = useCurrentUser()
  const data = useAsync(() => financeService.getInvoice(user, id), [id])
  return (
    <Modal open onClose={onClose} size="lg" title="Invoice">
      <AsyncView data={data}>
        {({ invoice, payments }) => (
          <>
            <p style={{ fontSize: '0.9rem' }}><strong>{invoice.reference}</strong> · {invoice.studentName} · {invoice.term} · <StatusBadge status={invoice.status} /></p>
            <table className="data" style={{ marginTop: 8 }}>
              <tbody>
                {invoice.lineItems.map((li, i) => <tr key={i}><td>{li.label}</td><td>{money(li.amount, invoice.currency)}</td></tr>)}
                {invoice.discount > 0 && <tr><td>Discount</td><td>−{money(invoice.discount, invoice.currency)}</td></tr>}
                <tr><td><strong>Total</strong></td><td><strong>{money(invoice.total, invoice.currency)}</strong></td></tr>
              </tbody>
            </table>
            <CardHeader title="Payments" />
            {payments.length === 0 ? <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)' }}>No payments recorded.</p> : (
              <table className="data">
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.receiptNumber}><td>{p.receiptNumber}</td><td>{formatDate(p.createdAt)}</td><td style={{ textTransform: 'capitalize' }}>{p.method.replace('_', ' ')}</td><td>{money(p.amount, p.currency)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <p style={{ marginTop: 10, fontSize: '0.9rem' }}>Balance: <strong>{money(invoice.total - invoice.paidAmount, invoice.currency)}</strong></p>
          </>
        )}
      </AsyncView>
    </Modal>
  )
}
