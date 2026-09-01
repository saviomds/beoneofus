// Server-side PDF rendering (pdfkit — pure JS, no native deps).
// Documents are generated on demand, streamed, and each generation is audited
// by the caller. Keep layouts simple and dependency-free.

import PDFDocument from 'pdfkit'
import type { Organization, ReportCard, Student } from '@shared/types'
import type { TranscriptResult } from '../services/academicService'

const INK = '#1f2937'
const MUTE = '#6b7280'
const LINE = '#d1d5db'

function header(doc: PDFKit.PDFDocument, org: Organization | null, title: string): void {
  doc.fillColor(INK).fontSize(16).font('Helvetica-Bold').text(org?.officialName ?? 'Institution', { continued: false })
  doc.fontSize(9).font('Helvetica').fillColor(MUTE)
  doc.text([org?.address, org?.district, org?.country].filter(Boolean).join(', '))
  if (org?.email || org?.phone) doc.text([org?.email, org?.phone].filter(Boolean).join('  ·  '))
  doc.moveDown(0.6)
  doc.fillColor(INK).fontSize(13).font('Helvetica-Bold').text(title)
  doc.moveTo(doc.x, doc.y + 4).lineTo(555, doc.y + 4).strokeColor(LINE).stroke()
  doc.moveDown(0.8)
}

function kv(doc: PDFKit.PDFDocument, pairs: [string, string][]): void {
  doc.fontSize(9.5).font('Helvetica')
  for (const [k, v] of pairs) {
    doc.fillColor(MUTE).text(k, { continued: true, width: 130 }).fillColor(INK).text(`  ${v}`)
  }
  doc.moveDown(0.5)
}

function tableRow(doc: PDFKit.PDFDocument, cols: string[], widths: number[], opts: { bold?: boolean } = {}): void {
  const y = doc.y
  let x = doc.x
  doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(INK)
  cols.forEach((c, i) => {
    doc.text(c, x, y, { width: widths[i] - 6 })
    x += widths[i]
  })
  doc.y = y + 15
}

function footer(doc: PDFKit.PDFDocument, note: string): void {
  doc.fontSize(7.5).font('Helvetica').fillColor(MUTE)
  doc.text(`${note}  ·  Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC  ·  BeOneOfUs`, 40, 800, { align: 'center', width: 515 })
}

export function reportCardPdf(card: ReportCard, org: Organization | null, student: Student | null): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  header(doc, org, `Report Card — ${card.term} ${card.academicYear}`)

  kv(doc, [
    ['Student', card.studentName],
    ['Student number', student?.institutionStudentNumber ?? '—'],
    ['Class', card.classId ?? '—'],
    ['Status', card.status.toUpperCase()],
  ])

  const widths = [200, 150, 60, 45, 60]
  tableRow(doc, ['Subject', 'Breakdown', 'Score', 'Grade', 'Position'], widths, { bold: true })
  doc.moveTo(40, doc.y - 2).lineTo(555, doc.y - 2).strokeColor(LINE).stroke()
  for (const l of card.lines) {
    const breakdown = l.components.map((c) => `${c.label.slice(0, 10)} ${c.percent ?? '–'}`).join(', ')
    tableRow(doc, [
      l.subjectName,
      breakdown,
      l.weightedScore === null ? '—' : `${l.weightedScore}%`,
      l.letter,
      l.position ? String(l.position) : '—',
    ], widths)
  }
  doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor(LINE).stroke()
  doc.moveDown(0.8)

  kv(doc, [
    ['Average', `${card.average}%`],
    ['GPA', card.gpa.toFixed(2)],
    ['Overall position', card.overallPosition ? `${card.overallPosition} of ${card.classSize}` : '—'],
    ['Attendance', `${card.attendanceRate}%`],
  ])
  if (card.conduct) { doc.font('Helvetica-Bold').fillColor(INK).text('Conduct: ', { continued: true }).font('Helvetica').text(card.conduct) }
  if (card.headTeacherRemark) { doc.font('Helvetica-Bold').text('Head teacher: ', { continued: true }).font('Helvetica').text(card.headTeacherRemark) }

  footer(doc, card.reference)
  doc.end()
  return doc
}

export function transcriptPdf(t: TranscriptResult, org: Organization | null): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  header(doc, org, 'Academic Transcript')
  kv(doc, [
    ['Student', t.student.name],
    ['Student number', t.student.number],
    ['Cumulative GPA', t.cumulativeGpa.toFixed(2)],
    ['Terms recorded', String(t.terms.length)],
  ])

  for (const term of t.terms) {
    doc.moveDown(0.3)
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK)
      .text(`${term.term} · ${term.academicYear}${term.gpa !== null ? `   (GPA ${term.gpa.toFixed(2)}, avg ${term.average}%${term.position ? `, position ${term.position}` : ''})` : ''}`)
    const widths = [320, 80, 60]
    tableRow(doc, ['Subject', 'Score', 'Grade'], widths, { bold: true })
    for (const s of term.subjects) {
      tableRow(doc, [s.subjectName, s.score === null ? '—' : `${s.score}%`, s.grade], widths)
    }
    doc.moveDown(0.2)
  }
  if (t.terms.length === 0) doc.font('Helvetica').fontSize(10).fillColor(MUTE).text('No academic history recorded.')

  footer(doc, `Transcript for ${t.student.number}`)
  doc.end()
  return doc
}
