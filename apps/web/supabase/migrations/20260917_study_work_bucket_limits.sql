-- ============================================================================
-- Study/Work Abroad — enforce document type/size limits at the storage layer
-- ============================================================================
-- The "PDF/JPG/PNG, up to 10MB" restriction shown in the applicant upload UI
-- (_study-work/components/FileUpload.tsx) only ever checked the file's name
-- extension in the browser — trivially bypassed (rename the file, or call the
-- upload API directly) and not enforced anywhere server-side. Every
-- requirement in this app uses the same PDF/JPG/PNG, 10MB limit (see
-- _study-work/mock/requirementTemplates.ts), so this locks the bucket itself
-- to that — Supabase's storage engine rejects a non-matching upload before it
-- ever reaches the object store, regardless of what the client claims.
-- ============================================================================

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png'],
    file_size_limit = 10485760 -- 10MB
where id = 'study-work-documents';
