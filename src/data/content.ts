import { addDays, weekday } from '../domain/clock';
import type { ISODate } from '../domain/types';

/** Estate-authored content shipped in both languages. */
export type L = { id: string; en: string };

export const RULES_VERSION = '1.0';

export const RULE_SECTIONS: { title: L; points: L[] }[] = [
  {
    title: { id: 'Renovasi & jam kerja tukang', en: 'Renovation and contractor hours' },
    points: [
      { id: 'Renovasi wajib diajukan lewat aplikasi dan disetujui estate sebelum dimulai.', en: 'Renovations must be requested in the app and approved by the estate before work starts.' },
      { id: 'Tukang bekerja Senin–Sabtu pukul 08.00–17.00, tidak di hari Minggu dan libur nasional.', en: 'Contractors work Monday to Saturday, 08.00–17.00, not on Sundays or public holidays.' },
      { id: 'Deposit renovasi dikembalikan setelah inspeksi estate dan BAST renovasi.', en: 'The renovation deposit is returned after the estate inspection and the renovation handover report.' },
    ],
  },
  {
    title: { id: 'Kendaraan & parkir', en: 'Vehicles and parking' },
    points: [
      { id: 'Kendaraan penghuni memakai stiker resmi dan kartu akses gerbang.', en: 'Residents’ vehicles use the official sticker and the gate access card.' },
      { id: 'Parkir di carport masing-masing; jalan cluster bukan area parkir.', en: 'Park in your own carport; cluster roads are not parking areas.' },
      { id: 'Batas kecepatan di dalam cluster 20 km/jam.', en: 'The speed limit inside the cluster is 20 km/h.' },
    ],
  },
  {
    title: { id: 'Kebersihan & sampah', en: 'Cleanliness and waste' },
    points: [
      { id: 'Sampah dipilah dan diletakkan di depan rumah sebelum pukul 07.00.', en: 'Sort your waste and put it out front before 07.00.' },
      { id: 'Sampah bangunan diangkut sendiri oleh tukang, bukan petugas sampah.', en: 'Construction waste is removed by your contractor, not the garbage crew.' },
      { id: 'Saluran air depan rumah dijaga tetap bersih.', en: 'Keep the drain in front of your house clear.' },
    ],
  },
  {
    title: { id: 'Hewan peliharaan & ketertiban', en: 'Pets and neighbourliness' },
    points: [
      { id: 'Hewan peliharaan diikat saat di luar rumah dan kotorannya dibersihkan.', en: 'Keep pets on a leash outside and clean up after them.' },
      { id: 'Jam tenang pukul 22.00–05.00.', en: 'Quiet hours are 22.00–05.00.' },
      { id: 'Acara yang memakai jalan cluster diberitahukan ke estate H-3.', en: 'Tell the estate 3 days ahead about events that use the cluster road.' },
    ],
  },
  {
    title: { id: 'IPL & tunggakan', en: 'IPL fees and arrears' },
    points: [
      { id: 'IPL dibayar paling lambat tanggal jatuh tempo setiap bulan lewat VA atau QRIS.', en: 'Pay IPL by the monthly due date via Virtual Account or QRIS.' },
      { id: 'Tidak ada denda keterlambatan. Tunggakan dicatat oleh estate.', en: 'There are no late fees. The estate records overdue months.' },
      { id: 'Untuk tunggakan berulang, estate dapat memberi konsekuensi seperti penonaktifan kartu akses setelah pemberitahuan.', en: 'For repeated arrears, the estate may apply consequences such as suspending the access card, after notice.' },
    ],
  },
];

export const EMERGENCY_NUMBERS: { label: L; sub: L; number: string; primary?: boolean }[] = [
  { label: { id: 'Pos security gerbang', en: 'Gate security post' }, sub: { id: '24 jam', en: '24 hours' }, number: '0812-1000-2001', primary: true },
  { label: { id: 'Komandan regu security', en: 'Security shift lead' }, sub: { id: 'Jika pos tidak menjawab', en: 'If the post does not answer' }, number: '0812-1000-2002', primary: true },
  { label: { id: 'Kantor estate', en: 'Estate office' }, sub: { id: 'Sen–Sab 08.00–17.00', en: 'Mon–Sat 08.00–17.00' }, number: '021-8890-1200', primary: true },
  { label: { id: 'Darurat umum', en: 'General emergency' }, sub: { id: 'Semua kejadian darurat', en: 'All emergencies' }, number: '112' },
  { label: { id: 'Polisi', en: 'Police' }, sub: { id: 'Nasional · bebas pulsa', en: 'National · toll free' }, number: '110' },
  { label: { id: 'Pemadam kebakaran', en: 'Fire brigade' }, sub: { id: 'Nasional · bebas pulsa', en: 'National · toll free' }, number: '113' },
  { label: { id: 'Ambulans', en: 'Ambulance' }, sub: { id: 'Nasional · bebas pulsa', en: 'National · toll free' }, number: '119' },
  { label: { id: 'Gangguan listrik PLN', en: 'PLN power outage' }, sub: { id: 'Nasional', en: 'National' }, number: '123' },
  { label: { id: 'RS Mitra Keluarga', en: 'Mitra Keluarga Hospital' }, sub: { id: 'Bekasi Timur · ± 4 km', en: 'East Bekasi · ± 4 km' }, number: '021-8899-0001' },
];

export const HANDBOOK_SECTIONS: { title: L; body: L }[] = [
  { title: { id: 'Selamat datang', en: 'Welcome' }, body: { id: 'Handbook ini berisi panduan tinggal di cluster: fasilitas, jadwal layanan, dan kontak penting.', en: 'This handbook covers living in the cluster: facilities, service schedules and key contacts.' } },
  { title: { id: 'Fasilitas', en: 'Facilities' }, body: { id: 'Clubhouse dan kolam renang buka 06.00–20.00 dengan kartu akses. Taman bermain terbuka untuk semua warga.', en: 'The clubhouse and pool open 06.00–20.00 with your access card. The playground is open to all residents.' } },
  { title: { id: 'Jadwal layanan', en: 'Service schedule' }, body: { id: 'Angkut sampah setiap Senin, Rabu, Jumat. Potong rumput area umum dua kali sebulan per zona.', en: 'Garbage pickup every Monday, Wednesday and Friday. Common-area grass is cut twice a month per zone.' } },
  { title: { id: 'Air & listrik', en: 'Water and power' }, body: { id: 'Meter listrik prabayar atas nama pemilik. Gangguan air dilaporkan ke kantor estate.', en: 'The prepaid electricity meter is registered to the owner. Report water problems to the estate office.' } },
];

export interface ShowcaseProject { name: string; area: 'Bekasi' | 'Bogor' | 'Serang'; location: string; photo: 1 | 2 | 3 | 4 | 5; promo: boolean; mapsQuery: string; blurb: L }
export const PROJECT_SHOWCASE: ShowcaseProject[] = [
  { name: 'Vista Harmoni Residence', area: 'Bekasi', location: 'Tambun, Bekasi', photo: 1, promo: false, mapsQuery: 'Tambun Bekasi', blurb: { id: 'Cluster komersil dengan clubhouse dan kolam renang.', en: 'Commercial cluster with a clubhouse and pool.' } },
  { name: 'Harmoni Park Bekasi', area: 'Bekasi', location: 'Babelan, Bekasi', photo: 2, promo: true, mapsQuery: 'Babelan Bekasi', blurb: { id: 'Rumah 1–2 lantai dekat akses tol.', en: 'One- and two-storey homes near the toll road.' } },
  { name: 'Harmoni Park Residence', area: 'Bogor', location: 'Cileungsi, Bogor', photo: 3, promo: true, mapsQuery: 'Cileungsi Bogor', blurb: { id: 'Hunian keluarga dengan taman di setiap blok.', en: 'Family homes with a park in every block.' } },
  { name: 'Harmoni Pasir Mukti', area: 'Bogor', location: 'Citeureup, Bogor', photo: 4, promo: true, mapsQuery: 'Citeureup Bogor', blurb: { id: 'Rumah modern dengan pemandangan bukit.', en: 'Modern homes with hill views.' } },
  { name: 'Bukit Mas Residence', area: 'Serang', location: 'Penancangan, Serang', photo: 5, promo: true, mapsQuery: 'Penancangan Serang', blurb: { id: 'Dekat pusat kota Serang dan sekolah.', en: 'Close to central Serang and schools.' } },
];

export const MOVE_SLOTS = ['08.00–12.00', '13.00–17.00'] as const;
export const WIFI_SLOTS = ['09.00–12.00', '13.00–16.00'] as const;

/** Handover appointment slots for the next working days after `today`. */
export function handoverSlots(today: ISODate): { date: ISODate; time: string; left: number }[] {
  const out: { date: ISODate; time: string; left: number }[] = [];
  const times = ['09.00–10.00', '13.00–14.00', '10.00–11.00'];
  let d = addDays(today, 1);
  while (out.length < 4) {
    if (weekday(d) !== 0) out.push({ date: d, time: times[out.length % times.length], left: [2, 1, 3, 2][out.length] });
    d = addDays(d, 1);
  }
  return out;
}
