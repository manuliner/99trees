import { eq } from 'drizzle-orm'
import { getDb } from '../../../../../utils/db'
import { editions, stations } from '../../../../../database/schema'
import { requireAdmin } from '../../../../../utils/admin-session'
import { joinPath, stationQrPath } from '#shared/edition-urls'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const editionId = Number(getRouterParam(event, 'id'))
  const db = getDb()
  const edition = (
    await db.select().from(editions).where(eq(editions.id, editionId)).limit(1)
  )[0]
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edition not found' })

  const stationRows = await db
    .select()
    .from(stations)
    .where(eq(stations.editionId, editionId))
    .orderBy(stations.fieldNumber)

  const host = getRequestURL(event).origin
  const items = stationRows.map((s) => {
    const url = `${host}${stationQrPath(editionId, s.slug, s.qrToken)}`
    const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
    return { field: s.fieldNumber, slug: s.slug, url, qrImg }
  })

  const joinUrl = `${host}${joinPath(edition.slug)}`
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>QR export — ${edition.name}</title>
<style>body{font-family:sans-serif;padding:1rem} .card{display:inline-block;margin:1rem;text-align:center;vertical-align:top}
img{border:4px solid #1A1C2C}</style></head><body>
<h1>${edition.name} — Station QR codes</h1>
<p><strong>Entry QR:</strong> <a href="${joinUrl}">${joinUrl}</a></p>
<img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}" alt="Join QR" width="220" height="220">
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
