import {
  feeStructuresRepo, scholarshipsRepo, invoicesRepo, paymentsRepo, studentsRepo, guardianLinksRepo,
} from '../lib/db'
import {
  PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, notificationService,
  loadOrgs, actingOrgId, recent,
} from './_shared'
import { NotFoundError, ValidationError } from '../lib/errors'
import { reference } from '../lib/codes'
import type {
  FeeItem, FeeStructure, GuardianLink, Id, Invoice, InvoiceStatus, Payment, PaymentMethod,
  SafeUser, Scholarship, Student,
} from '@shared/types'

const sum = (items: FeeItem[]) => items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

function statusFor(total: number, paid: number, dueDate: string, current: InvoiceStatus): InvoiceStatus {
  if (current === 'CANCELLED' || current === 'REFUNDED') return current
  if (paid >= total && total > 0) return 'PAID'
  if (paid > 0) return 'PARTIALLY_PAID'
  if (new Date(dueDate).getTime() < Date.now()) return 'OVERDUE'
  return 'PENDING'
}

async function requireStudent(id: Id): Promise<Student> {
  const s = (await studentsRepo.get(id)) as Student | null
  if (!s) throw new NotFoundError('Student')
  return s
}

/** Students / guardians may read only their own invoices. */
async function ownStudentIds(actor: SafeUser): Promise<Set<Id>> {
  if (actor.role === 'student') {
    const s = ((await studentsRepo.list({ userId: actor.id })) as Student[])[0]
    return new Set(s ? [s.id] : [])
  }
  if (actor.role === 'guardian') {
    const links = (await guardianLinksRepo.list({ guardianUserId: actor.id })) as GuardianLink[]
    return new Set(links.filter((l) => l.status === 'active').map((l) => l.studentId))
  }
  return new Set()
}

export const financeService = {
  // --- fee structures & scholarships ---------------------------------- ----

  async feeStructures(actor: SafeUser): Promise<FeeStructure[]> {
    assertPermission(actor, P.FINANCE_VIEW)
    return recent(scopeRows(actor, (await feeStructuresRepo.list()) as FeeStructure[], await loadOrgs()))
  },

  async createFeeStructure(
    actor: SafeUser,
    input: { name: string; level: FeeStructure['level']; academicYear: string; currency?: string; items: FeeItem[]; isDefault?: boolean },
  ): Promise<FeeStructure> {
    assertPermission(actor, P.FINANCE_MANAGE)
    const organizationId = actingOrgId(actor)
    if (!input.name?.trim()) throw new ValidationError('Name is required.')
    if (!input.items?.length) throw new ValidationError('Add at least one fee item.')
    const fs = (await feeStructuresRepo.create({
      organizationId, name: input.name.trim(), level: input.level, academicYear: input.academicYear,
      currency: input.currency ?? 'RWF', items: input.items, total: sum(input.items), isDefault: input.isDefault ?? false,
    }, actor.id)) as FeeStructure
    await auditService.record({ actor, action: 'FEE_STRUCTURE_CREATED', targetId: fs.id, targetType: 'feeStructure', organizationId })
    return fs
  },

  async scholarships(actor: SafeUser): Promise<Scholarship[]> {
    assertPermission(actor, P.FINANCE_VIEW)
    return recent(scopeRows(actor, (await scholarshipsRepo.list()) as Scholarship[], await loadOrgs()))
  },

  async createScholarship(
    actor: SafeUser,
    input: { name: string; kind: Scholarship['kind']; value: number; fundedBy?: string; studentIds?: Id[] },
  ): Promise<Scholarship> {
    assertPermission(actor, P.FINANCE_MANAGE)
    const organizationId = actingOrgId(actor)
    if (input.kind === 'percentage' && (input.value < 0 || input.value > 100)) throw new ValidationError('A percentage scholarship must be 0–100.')
    const sc = (await scholarshipsRepo.create({
      organizationId, name: input.name.trim(), kind: input.kind, value: input.value,
      fundedBy: input.fundedBy ?? '', studentIds: input.studentIds ?? [],
    }, actor.id)) as Scholarship
    await auditService.record({ actor, action: 'SCHOLARSHIP_CREATED', targetId: sc.id, targetType: 'scholarship', organizationId })
    return sc
  },

  // --- invoices ------------------------------------------------------ -----

  async invoices(actor: SafeUser, q: { studentId?: Id; status?: InvoiceStatus } = {}): Promise<Invoice[]> {
    let rows = (await invoicesRepo.list()) as Invoice[]
    if (actor.role === 'student' || actor.role === 'guardian') {
      assertPermission(actor, P.FINANCE_VIEW_OWN)
      const mine = await ownStudentIds(actor)
      rows = rows.filter((r) => mine.has(r.studentId))
    } else {
      assertPermission(actor, P.FINANCE_VIEW)
      rows = scopeRows(actor, rows, await loadOrgs())
    }
    if (q.studentId) rows = rows.filter((r) => r.studentId === q.studentId)
    if (q.status) rows = rows.filter((r) => r.status === q.status)
    return recent(rows)
  },

  async getInvoice(actor: SafeUser, id: Id): Promise<{ invoice: Invoice; payments: Payment[] }> {
    const invoice = (await invoicesRepo.get(id)) as Invoice | null
    if (!invoice) throw new NotFoundError('Invoice')
    if (actor.role === 'student' || actor.role === 'guardian') {
      assertPermission(actor, P.FINANCE_VIEW_OWN)
      const mine = await ownStudentIds(actor)
      if (!mine.has(invoice.studentId)) throw new NotFoundError('Invoice')
    } else {
      assertPermission(actor, P.FINANCE_VIEW)
      assertTenant(actor, invoice, await loadOrgs())
    }
    const payments = ((await paymentsRepo.list({ invoiceId: id })) as Payment[]).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    return { invoice, payments }
  },

  async createInvoice(
    actor: SafeUser,
    input: {
      studentId: Id; feeStructureId?: Id | null; academicYear: string; term: string
      lineItems?: FeeItem[]; discount?: number; scholarshipId?: Id | null; dueDate?: string
    },
  ): Promise<Invoice> {
    assertPermission(actor, P.FINANCE_MANAGE)
    const student = await requireStudent(input.studentId)
    assertTenant(actor, student, await loadOrgs())

    let lineItems = input.lineItems ?? []
    let currency = 'RWF'
    if (input.feeStructureId) {
      const fs = (await feeStructuresRepo.get(input.feeStructureId)) as FeeStructure | null
      if (!fs || fs.organizationId !== student.organizationId) throw new ValidationError('Unknown fee structure.')
      lineItems = fs.items
      currency = fs.currency
    }
    if (!lineItems.length) throw new ValidationError('Provide line items or a fee structure.')

    const gross = sum(lineItems)
    let discount = Math.max(0, input.discount ?? 0)
    let scholarshipId: Id | null = null
    if (input.scholarshipId) {
      const sc = (await scholarshipsRepo.get(input.scholarshipId)) as Scholarship | null
      if (!sc || sc.organizationId !== student.organizationId) throw new ValidationError('Unknown scholarship.')
      scholarshipId = sc.id
      discount += sc.kind === 'percentage' ? Math.round((gross * sc.value) / 100) : sc.value
    }
    discount = Math.min(discount, gross)
    const total = gross - discount
    const dueDate = input.dueDate || new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10)

    const ref = await reference(invoicesRepo as never, 'INVF')
    const invoice = (await invoicesRepo.create({
      id: ref, reference: ref, organizationId: student.organizationId, studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`, feeStructureId: input.feeStructureId ?? null,
      academicYear: input.academicYear, term: input.term, currency, lineItems, gross, discount, scholarshipId,
      total, paidAmount: 0, status: statusFor(total, 0, dueDate, 'PENDING'), dueDate, issuedBy: actor.id,
    }, actor.id)) as Invoice
    await auditService.record({ actor, action: 'INVOICE_CREATED', targetId: invoice.id, targetType: 'invoice', organizationId: student.organizationId, metadata: { studentId: student.id, total } })
    await notificationService.create({ recipientId: student.userId, type: 'system', title: 'New invoice', message: `${invoice.reference}: ${currency} ${total.toLocaleString()} due ${dueDate}.`, actionUrl: '/student/finance', organizationId: student.organizationId })
    return invoice
  },

  async setInvoiceStatus(actor: SafeUser, id: Id, status: 'CANCELLED' | 'REFUNDED'): Promise<Invoice> {
    assertPermission(actor, P.FINANCE_MANAGE)
    const invoice = (await invoicesRepo.get(id)) as Invoice | null
    if (!invoice) throw new NotFoundError('Invoice')
    assertTenant(actor, invoice, await loadOrgs())
    const updated = (await invoicesRepo.update(id, { status }, { actorId: actor.id })) as Invoice
    await auditService.record({ actor, action: `INVOICE_${status}`, targetId: id, targetType: 'invoice', organizationId: invoice.organizationId })
    return updated
  },

  // --- payments (manual recording — no gateway) --------------------- ------

  async recordPayment(
    actor: SafeUser,
    input: { invoiceId: Id; amount: number; method: PaymentMethod; reference?: string; note?: string },
  ): Promise<{ payment: Payment; invoice: Invoice }> {
    assertPermission(actor, P.FINANCE_MANAGE)
    const invoice = (await invoicesRepo.get(input.invoiceId)) as Invoice | null
    if (!invoice) throw new NotFoundError('Invoice')
    assertTenant(actor, invoice, await loadOrgs())
    if (invoice.status === 'CANCELLED' || invoice.status === 'REFUNDED') throw new ValidationError(`This invoice is ${invoice.status.toLowerCase()}.`)
    const amount = Number(input.amount)
    if (!(amount > 0)) throw new ValidationError('Payment amount must be positive.')
    if (invoice.paidAmount + amount > invoice.total + 0.001) throw new ValidationError('Payment exceeds the outstanding balance.')

    const receiptNumber = await reference(paymentsRepo as never, 'RCPT')
    const payment = (await paymentsRepo.create({
      receiptNumber, invoiceId: invoice.id, organizationId: invoice.organizationId, studentId: invoice.studentId,
      amount, currency: invoice.currency, method: input.method, reference: input.reference ?? '',
      note: input.note ?? '', recordedBy: actor.id,
    }, actor.id)) as Payment

    const paidAmount = invoice.paidAmount + amount
    const updated = (await invoicesRepo.update(invoice.id, {
      paidAmount, status: statusFor(invoice.total, paidAmount, invoice.dueDate, invoice.status),
    }, { actorId: actor.id })) as Invoice

    await auditService.record({ actor, action: 'PAYMENT_RECORDED', targetId: payment.receiptNumber, targetType: 'payment', organizationId: invoice.organizationId, metadata: { invoiceId: invoice.id, amount, method: input.method } })
    const student = await requireStudent(invoice.studentId)
    await notificationService.create({ recipientId: student.userId, type: 'system', title: 'Payment received', message: `${invoice.currency} ${amount.toLocaleString()} recorded against ${invoice.reference}. Balance: ${(updated.total - updated.paidAmount).toLocaleString()}.`, actionUrl: '/student/finance', organizationId: invoice.organizationId })
    return { payment, invoice: updated }
  },

  async summary(actor: SafeUser): Promise<{ billed: number; collected: number; outstanding: number; overdueInvoices: number; currency: string }> {
    assertPermission(actor, P.FINANCE_VIEW)
    const rows = scopeRows(actor, (await invoicesRepo.list()) as Invoice[], await loadOrgs())
      .filter((i) => i.status !== 'CANCELLED')
    const billed = rows.reduce((s, i) => s + i.total, 0)
    const collected = rows.reduce((s, i) => s + i.paidAmount, 0)
    return {
      billed, collected, outstanding: billed - collected,
      overdueInvoices: rows.filter((i) => i.status === 'OVERDUE').length,
      currency: rows[0]?.currency ?? 'RWF',
    }
  },
}
