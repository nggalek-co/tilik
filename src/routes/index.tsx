import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { BedDouble, Building2, MapPin, RefreshCw, ArrowUpRight, Clock3, Info } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { getAvailability, type Room } from '../lib/siranap'
import { REGIONS, sourceForRegion } from '../lib/regions'
import { NativeSelect, NativeSelectOption } from '../components/ui/native-select'

export const Route = createFileRoute('/')({
  loader: async () => {
    try { return { data: await getAvailability({ data: { regionCode: '3503' } }), error: '' } }
    catch (e) { return { data: null, error: e instanceof Error ? e.message : 'Sumber belum dapat diakses.' } }
  },
  component: Home,
})

function latestRoomUpdate(rooms: Room[]) {
  const units: Record<string, number> = { detik: 1, menit: 60, jam: 3600, hari: 86400, minggu: 604800, bulan: 2592000, tahun: 31536000 }
  const updates = rooms.flatMap(room => {
    const match = room.updated.match(/(\d+)\s*(detik|menit|jam|hari|minggu|bulan|tahun)/i)
    if (/baru saja/i.test(room.updated)) return [{ seconds: 0, label: room.updated }]
    return match ? [{ seconds: Number(match[1]) * units[match[2].toLowerCase()], label: room.updated }] : []
  })
  return updates.sort((a, b) => a.seconds - b.seconds)[0]?.label ?? 'Lihat waktu pembaruan tiap ruang'
}

function Home() {
  const initial = Route.useLoaderData()
  const [data, setData] = useState(initial.data)
  const [selectedHospital, setSelectedHospital] = useState('')
  const activeHospital = data?.hospitals.some(hospital => hospital.name === selectedHospital) ? selectedHospital : data?.hospitals[0]?.name
  const [error, setError] = useState(initial.error)
  const [regionCode, setRegionCode] = useState('3503')
  const regionName = REGIONS.find(region => region.code === regionCode)?.name ?? 'Jawa Timur'
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  useEffect(() => {
    setNow(new Date())
    const interval = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(interval)
  }, [])
  async function refresh(code = regionCode) {
    setBusy(true)
    try { setData(await getAvailability({ data: { regionCode: code } })); setError('') }
    catch (e) { setError(e instanceof Error ? e.message : 'Pembaruan gagal. Silakan coba lagi.') }
    finally { setBusy(false) }
  }
  const time = data ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date(data.fetchedAt)) : '—'

  return <main className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
    <h1 className="sr-only">Ketersediaan tempat tidur rumah sakit {regionName}</h1>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-2">
        <label htmlFor="region" className="block text-sm font-medium text-zinc-700">Kabupaten / kota di Jawa Timur</label>
        <NativeSelect id="region" value={regionCode} disabled={busy} className="h-11 w-full min-w-64 bg-white text-base sm:w-80" onChange={event => {
          const code = event.target.value
          setRegionCode(code)
          setData(null)
          setSelectedHospital('')
          setError('')
          void refresh(code)
        }}>{REGIONS.map(region => <NativeSelectOption key={region.code} value={region.code}>{region.name}</NativeSelectOption>)}</NativeSelect>
      </div>
      <Button variant="outline" onClick={() => refresh()} disabled={busy} className="h-11 gap-2 bg-white px-4 text-zinc-600"><RefreshCw className={busy ? 'animate-spin' : ''}/>{busy ? 'Memperbarui…' : 'Perbarui data'}</Button>
    </div>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
        <p className="flex items-center gap-2 text-zinc-500"><Clock3 className="size-4 shrink-0 text-zinc-400"/><span>Jam saat ini <span className="font-medium tabular-nums text-zinc-800">{now ? new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }).format(now) : '—'} WIB</span></span></p>
        <p aria-live="polite" className="text-zinc-400">Pembaruan data <span className="font-medium tabular-nums text-zinc-600">{data ? `${time} WIB` : 'Belum tersedia'}</span></p>
      </div>
    </div>
    {error && <div role="alert" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">{error}{data && ' Data terakhir tetap ditampilkan.'}</div>}
    {busy && !data && <div role="status" className="flex items-center justify-center gap-3 rounded-xl border bg-white px-6 py-16 text-sm text-zinc-500"><RefreshCw className="size-5 animate-spin"/>Mengambil data {regionName}…</div>}
    {!busy && data && !data.hospitals.length && <div role="status" className="rounded-xl border bg-white px-6 py-16 text-center text-zinc-500">Belum ada data rumah sakit yang dilaporkan SIRANAP untuk {regionName}.</div>}
    {!!data?.hospitals.length && <Tabs value={activeHospital} onValueChange={setSelectedHospital} className="gap-5" aria-busy={busy}>
      <div className="room-scroll overflow-x-auto border-b pb-1">
        <TabsList variant="line" aria-label={`Rumah sakit ${regionName}`} className="h-12! w-full min-w-max justify-start">
          {data.hospitals.map(hospital => <TabsTrigger key={hospital.name} value={hospital.name} className="shrink-0 flex-none gap-2 px-4 text-sm sm:text-base"><Building2 className="size-4 text-zinc-400"/>{hospital.name}</TabsTrigger>)}
        </TabsList>
      </div>
      {data.hospitals.map(hospital => {
        const beds = hospital.rooms.reduce((sum, room) => sum + room.available, 0)
        const classes = [...new Set(hospital.rooms.map(room => room.category))]
        return <TabsContent key={hospital.name} value={hospital.name}>
        <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-xs lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0">
          <CardHeader className="gap-5 p-6 pb-7 sm:p-8 sm:pb-7">
            <div className="flex items-center justify-between gap-4">
              <div className="flex size-12 items-center justify-center rounded-xl border bg-zinc-50 text-zinc-600"><Building2 className="size-6" strokeWidth={1.6}/></div>
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${beds ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}><span className={`size-1.5 rounded-full ${beds ? 'bg-emerald-500' : 'bg-zinc-400'}`}/>{beds ? 'Tersedia' : 'Penuh'}</span>
            </div>
            <div className="space-y-3">
              <CardTitle><h2 className="text-2xl font-semibold leading-snug tracking-tight text-zinc-950 sm:text-[28px]">{hospital.name}</h2></CardTitle>
              <CardDescription className="flex items-start gap-2 text-base leading-relaxed"><MapPin className="mt-1 size-4 shrink-0"/>{hospital.address}</CardDescription>
              <div className="flex items-start gap-2 text-sm leading-relaxed text-zinc-500"><Clock3 className="mt-0.5 size-4 shrink-0"/><div><p>Pembaruan ruang terbaru: <span className="font-medium text-zinc-700">{latestRoomUpdate(hospital.rooms)}</span></p><p className="mt-1 text-xs text-zinc-400">Menurut SIRANAP saat data diambil pukul {time} WIB.</p></div></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-7 px-6 pb-7 sm:px-8">
            <div className="flex items-center justify-between gap-5 rounded-xl border border-zinc-200/80 bg-zinc-50 p-5 sm:p-6">
              <div><p className="mb-2 text-sm font-medium text-zinc-500">Tempat tidur tersedia</p><p className="flex items-baseline gap-3"><strong className="text-6xl font-semibold tracking-tighter text-zinc-950 sm:text-7xl">{beds}</strong><span className="text-base text-zinc-400">tempat tidur</span></p></div>
              <BedDouble className="size-9 shrink-0 text-zinc-300 sm:size-11" strokeWidth={1.4}/>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {classes.map(category => <div key={category} className="rounded-lg border bg-white px-4 py-4"><p className="text-sm text-zinc-500">{category}</p><p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-zinc-900">{hospital.rooms.filter(room => room.category === category).reduce((sum, room) => sum + room.available, 0)}</p><p className="mt-1 text-xs text-zinc-400">tersedia</p></div>)}
            </div>
          </CardContent>
          </div>
          <section aria-label={`Detail ruang ${hospital.name}`} className="flex h-[520px] min-h-0 min-w-0 flex-col overflow-hidden border-t bg-zinc-50/40 lg:h-[640px] lg:border-t-0 lg:border-l">
            <div className="flex shrink-0 items-center justify-between gap-3 px-6 py-5 sm:px-8"><h3 className="text-base font-semibold text-zinc-800">Ruang perawatan</h3><span className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500">{hospital.rooms.length} ruang</span></div>
            <div role="region" aria-label={`Daftar ruang ${hospital.name}`} tabIndex={0} className="room-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-6 pb-6 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-400 sm:px-8">
              <div className="space-y-3">{hospital.rooms.map((room, index) => <div key={`${room.name}-${index}`} className="rounded-xl border bg-white p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-base font-medium leading-relaxed text-zinc-800">{room.name}</p><p className="mt-1 text-sm text-zinc-500">{room.category}</p></div><span className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium tabular-nums ${room.available ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{room.available} tersedia</span></div>
                <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-zinc-400"><Clock3 className="mt-0.5 size-3 shrink-0"/>Diperbarui {room.updated}</p>
              </div>)}</div>
            </div>
          </section>
        </Card>
        </TabsContent>
      })}
    </Tabs>}
    <div className="mt-8 flex flex-col gap-4 border-t pt-5 text-xs leading-relaxed text-zinc-400 sm:flex-row sm:items-start sm:justify-between">
      <p className="flex max-w-xl items-start gap-2"><Info className="mt-0.5 size-3.5 shrink-0"/>Ketersediaan dapat berubah. Konfirmasi ke rumah sakit sebelum berkunjung. Waktu pembaruan ruang mengikuti laporan SIRANAP.</p>
      <a className="inline-flex shrink-0 items-center gap-1 text-zinc-500 hover:text-zinc-900" href={sourceForRegion(regionCode)} target="_blank" rel="noreferrer">SIRANAP Kemenkes RI<ArrowUpRight className="size-3.5"/></a>
    </div>
  </main>
}
