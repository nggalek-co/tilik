import { createServerFn } from '@tanstack/react-start'

import { REGIONS, sourceForRegion } from './regions'
export type Room = { name: string; category: string; available: number; updated: string }
export type Hospital = { name: string; address: string; rooms: Room[]; code: string | null }
export type Snapshot = { hospitals: Hospital[]; fetchedAt: string; regionCode: string }
const cache = new Map<string, Snapshot>()

function clean(value: string) {
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
}

export const getAvailability = createServerFn({ method: 'GET' })
.validator((input: { regionCode: string }) => {
  if (!REGIONS.some(region => region.code === input.regionCode)) throw new Error('Wilayah Jawa Timur tidak valid.')
  return input
})
.handler(async ({ data: { regionCode } }): Promise<Snapshot> => {
  const previous = cache.get(regionCode)
  if (previous && Date.now() - Date.parse(previous.fetchedAt) < 60_000) return previous
  const response = await fetch(sourceForRegion(regionCode), { signal: AbortSignal.timeout(20_000), headers: { Accept: 'text/html' } })
  if (!response.ok) throw new Error(`SIRANAP merespons HTTP ${response.status}. Silakan coba lagi.`)
  const html = await response.text()
  const hospitals: Hospital[] = html.split(/<div\s+class="cardRS\b/).slice(1).map(block => {
    const name = clean(block.match(/<h5\b[^>]*>([\s\S]*?)<\/h5>/)?.[1] ?? '')
    const address = clean(block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '')
    const rooms = [...block.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].flatMap(match => {
      const cells = [...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(cell => clean(cell[1]))
      const beds = cells[2]?.match(/Tersedia\s+(\d+)\s+bed/i)
      return cells.length === 4 && beds ? [{ category: cells[0], name: cells[1], available: Number(beds[1]), updated: cells[3].replace(/^diupdate\s*/i, '') }] : []
    })
    const code = block.match(/tempat_tidur\?kode_rs=(\d+)/)?.[1] ?? null
    return { name, address, rooms, code }
  }).filter(hospital => hospital.name && hospital.rooms.length)
  if (!hospitals.length && !/ditemukan\s*0\s*Rumah Sakit/i.test(clean(html))) throw new Error('Data ruang belum dapat dibaca dari SIRANAP. Coba kembali beberapa saat lagi.')
  const snapshot = { hospitals, fetchedAt: new Date().toISOString(), regionCode }
  cache.set(regionCode, snapshot)
  return snapshot
})


export type BedCategory = { name: string; capacity: number; available: number; updated: string }
export type HospitalDetail = { code: string; categories: BedCategory[]; phone: string | null; source: string; fetchedAt: string }
const detailCache = new Map<string, HospitalDetail>()

export const getHospitalDetail = createServerFn({ method: 'GET' })
.validator((input: { regionCode: string; code: string }) => {
  if (!REGIONS.some(region => region.code === input.regionCode) || !/^\d{7}$/.test(input.code) || !input.code.startsWith(input.regionCode)) {
    throw new Error('Kode rumah sakit atau wilayah tidak valid.')
  }
  return input
})
.handler(async ({ data: { regionCode, code } }): Promise<HospitalDetail> => {
  const key = `${regionCode}:${code}`
  const previous = detailCache.get(key)
  if (previous && Date.now() - Date.parse(previous.fetchedAt) < 60_000) return previous
  const source = `https://keslan.kemkes.go.id/app/siranap/tempat_tidur?kode_rs=${code}&jenis=2&propinsi=35prop&kabkota=${regionCode}`
  const response = await fetch(source, { signal: AbortSignal.timeout(20_000), headers: { Accept: 'text/html' } })
  if (!response.ok) throw new Error(`Detail SIRANAP merespons HTTP ${response.status}.`)
  const html = await response.text()
  const categories = html.split(/<div\s+class="card"/).slice(1).flatMap(block => {
    const paragraph = block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/)?.[1]
    if (!paragraph) return []
    const name = clean(paragraph.split(/<br\s*\/?\s*>/i)[0])
    const updated = clean(paragraph.match(/<small\b[^>]*>([\s\S]*?)<\/small>/)?.[1] ?? '').replace(/^Update\s*/i, '')
    const text = clean(block)
    const capacity = text.match(/Tempat Tidur\s*(\d+)/i)
    const available = text.match(/Kosong\s*(\d+)/i)
    return name && updated && capacity && available ? [{ name, updated, capacity: Number(capacity[1]), available: Number(available[1]) }] : []
  })
  if (!categories.length) throw new Error('Detail kapasitas belum dapat dibaca dari SIRANAP.')
  const rawPhone = clean(html.match(/<i\b[^>]*class="[^"]*fa-phone[^"]*"[^>]*>([\s\S]*?)<\/i>/)?.[1] ?? '').replace(/&nbsp;?/g, '').trim()
  const phone = rawPhone.replace(/[^+\d]/g, '') || null
  const detail = { code, categories, phone, source, fetchedAt: new Date().toISOString() }
  detailCache.set(key, detail)
  return detail
})
