import { documentsRepo, usersRepo } from '../lib/db'
import { PERMISSIONS as P, assertPermission, assertTenant, scopeRows, auditService, loadOrgs, recent } from './_shared'
import { NotFoundError } from '../lib/errors'
import type { DocumentRecord, DocumentStatus, Id, SafeUser, User } from '@shared/types'

export const documentService = {
  async forOwner(actor: SafeUser, ownerId: Id): Promise<DocumentRecord[]> {
    assertPermission(actor, P.DOCUMENTS_VIEW)
    if (actor.role === 'student' && ownerId !== actor.id) return []
    return recent((await documentsRepo.list({ ownerId })) as DocumentRecord[])
  },

  async forOrganization(actor: SafeUser): Promise<DocumentRecord[]> {
    assertPermission(actor, P.DOCUMENTS_VIEW)
    return recent(scopeRows(actor, (await documentsRepo.list()) as DocumentRecord[], await loadOrgs()))
  },

  async register(
    actor: SafeUser,
    input: Pick<DocumentRecord, 'ownerId' | 'type' | 'title' | 'fileName' | 'size'> & Partial<Pick<DocumentRecord, 'note'>>,
  ): Promise<DocumentRecord> {
    assertPermission(actor, P.DOCUMENTS_VIEW)
    const doc = (await documentsRepo.create({
      ownerId: input.ownerId, organizationId: actor.organizationId, type: input.type, title: input.title,
      fileName: input.fileName, size: input.size, uploadedBy: actor.id, status: 'pending', note: input.note ?? '',
    }, actor.id)) as DocumentRecord
    await auditService.record({ actor, action: 'DOCUMENT_UPLOADED', targetId: doc.id, targetType: 'document', organizationId: actor.organizationId, metadata: { fileName: doc.fileName } })
    return doc
  },

  async setStatus(actor: SafeUser, id: Id, status: DocumentStatus): Promise<DocumentRecord> {
    assertPermission(actor, P.DOCUMENTS_MANAGE)
    const d = (await documentsRepo.get(id)) as DocumentRecord | null
    if (!d) throw new NotFoundError('Document')
    assertTenant(actor, d, await loadOrgs())
    const updated = (await documentsRepo.update(id, { status }, { actorId: actor.id })) as DocumentRecord
    await auditService.record({ actor, action: `DOCUMENT_${status.toUpperCase()}`, targetId: id, targetType: 'document', organizationId: d.organizationId })
    return updated
  },

  async remove(actor: SafeUser, id: Id): Promise<void> {
    assertPermission(actor, P.DOCUMENTS_MANAGE)
    await documentsRepo.remove(id, actor.id)
    await auditService.record({ actor, action: 'DOCUMENT_ARCHIVED', targetId: id, targetType: 'document', organizationId: actor.organizationId })
  },

  async uploaderName(id: Id): Promise<string> {
    const u = (await usersRepo.get(id)) as User | null
    return u?.name ?? String(id)
  },
}
