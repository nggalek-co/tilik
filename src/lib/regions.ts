// Kabupaten/kota Jawa Timur dari endpoint Kabkota SIRANAP.
export const REGIONS = [
  {
    "code": "3501",
    "name": "Kabupaten Pacitan"
  },
  {
    "code": "3502",
    "name": "Kabupaten Ponorogo"
  },
  {
    "code": "3503",
    "name": "Kabupaten Trenggalek"
  },
  {
    "code": "3504",
    "name": "Kabupaten Tulungagung"
  },
  {
    "code": "3505",
    "name": "Kabupaten Blitar"
  },
  {
    "code": "3506",
    "name": "Kabupaten Kediri"
  },
  {
    "code": "3507",
    "name": "Kabupaten Malang"
  },
  {
    "code": "3508",
    "name": "Kabupaten Lumajang"
  },
  {
    "code": "3509",
    "name": "Kabupaten Jember"
  },
  {
    "code": "3510",
    "name": "Kabupaten Banyuwangi"
  },
  {
    "code": "3511",
    "name": "Kabupaten Bondowoso"
  },
  {
    "code": "3512",
    "name": "Kabupaten Situbondo"
  },
  {
    "code": "3513",
    "name": "Kabupaten Probolinggo"
  },
  {
    "code": "3514",
    "name": "Kabupaten Pasuruan"
  },
  {
    "code": "3515",
    "name": "Kabupaten Sidoarjo"
  },
  {
    "code": "3516",
    "name": "Kabupaten Mojokerto"
  },
  {
    "code": "3517",
    "name": "Kabupaten Jombang"
  },
  {
    "code": "3518",
    "name": "Kabupaten Nganjuk"
  },
  {
    "code": "3519",
    "name": "Kabupaten Madiun"
  },
  {
    "code": "3520",
    "name": "Kabupaten Magetan"
  },
  {
    "code": "3521",
    "name": "Kabupaten Ngawi"
  },
  {
    "code": "3522",
    "name": "Kabupaten Bojonegoro"
  },
  {
    "code": "3523",
    "name": "Kabupaten Tuban"
  },
  {
    "code": "3524",
    "name": "Kabupaten Lamongan"
  },
  {
    "code": "3525",
    "name": "Kabupaten Gresik"
  },
  {
    "code": "3526",
    "name": "Kabupaten Bangkalan"
  },
  {
    "code": "3527",
    "name": "Kabupaten Sampang"
  },
  {
    "code": "3528",
    "name": "Kabupaten Pamekasan"
  },
  {
    "code": "3529",
    "name": "Kabupaten Sumenep"
  },
  {
    "code": "3571",
    "name": "Kota Kediri"
  },
  {
    "code": "3572",
    "name": "Kota Blitar"
  },
  {
    "code": "3573",
    "name": "Kota Malang"
  },
  {
    "code": "3574",
    "name": "Kota Probolinggo"
  },
  {
    "code": "3575",
    "name": "Kota Pasuruan"
  },
  {
    "code": "3576",
    "name": "Kota Mojokerto"
  },
  {
    "code": "3577",
    "name": "Kota Madiun"
  },
  {
    "code": "3578",
    "name": "Kota Surabaya"
  },
  {
    "code": "3579",
    "name": "Kota Batu"
  }
] as const

export function sourceForRegion(code: string) {
  return `https://keslan.kemkes.go.id/app/siranap/rumah_sakit?jenis=2&propinsi=35prop&kabkota=${code}`
}
