import { createServerFn } from '@tanstack/react-start'

import { REGIONS, sourceForRegion } from './regions'
export type Room = { name: string; category: string; available: number; updated: string }
export type Hospital = { name: string; address: string; rooms: Room[] }
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
    return { name, address, rooms }
  }).filter(hospital => hospital.name && hospital.rooms.length)
  if (!hospitals.length && !/ditemukan\s*0\s*Rumah Sakit/i.test(clean(html))) throw new Error('Data ruang belum dapat dibaca dari SIRANAP. Coba kembali beberapa saat lagi.')
  const snapshot = { hospitals, fetchedAt: new Date().toISOString(), regionCode }
  cache.set(regionCode, snapshot)
  return snapshot
})
