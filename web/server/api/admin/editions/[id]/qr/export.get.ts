import { eq } from 'drizzle-orm'
import QRCode from 'qrcode'
import { getDb } from '../../../../../utils/db'
import { editions, tasks } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import { editionLandingPath, taskQrPath } from '#shared/edition-urls'
import { escapeHtml } from '../../../../../utils/html-escape'

async function qrDataUrl(data: string, size: number): Promise<string> {
  return QRCode.toDataURL(data, { width: size, margin: 1, errorCorrectionLevel: 'M' })
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const db = getDb()
  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const taskRows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.editionId, editionId))
    .orderBy(tasks.fieldNumber)

  const host = getRequestURL(event).origin
  const editionName = escapeHtml(edition.name)
  const editionSlug = escapeHtml(edition.slug)

  const items = await Promise.all(
    taskRows.map(async (s) => {
      const url = `${host}${taskQrPath(editionId, s.slug, s.qrToken)}`
      const qrImg = await qrDataUrl(url, 200)
      return {
        field: s.fieldNumber,
        slug: escapeHtml(s.slug),
        url: escapeHtml(url),
        qrImg,
      }
    }),
  )

  const shareUrl = `${host}${editionLandingPath(edition.slug)}`
  const shareUrlEscaped = escapeHtml(shareUrl)
  const entryQr = await qrDataUrl(shareUrl, 220)

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>QR export — ${editionName}</title>
<style>body{font-family:sans-serif;padding:1rem} .card{display:inline-block;margin:1rem;text-align:center;vertical-align:top}
img{border:4px solid #1A1C2C}</style></head><body>
<h1>${editionName} — Task QR codes</h1>
<p><strong>Edition slug:</strong> ${editionSlug}</p>
<p><strong>Entry QR:</strong> <a href="${shareUrlEscaped}">${shareUrlEscaped}</a></p>
<img src="${entryQr}" alt="Entry QR" width="220" height="220">
<hr>
${items
  .map(
    (i) => `<div class="card"><p>Field ${i.field} — ${i.slug}</p>
<img src="${i.qrImg}" width="200" height="200" alt="QR"><br><small>${i.url}</small></div>`,
  )
  .join('\n')}
</body></html>`

  setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="qr-edition-${editionId}.html"`)
  return html
})
