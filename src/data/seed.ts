import { addDays, addMonths, monthOf } from '../domain/clock';
import { syncAllBills } from '../domain/ipl';
import type {
  AppData, Complaint, ComplaintCategory, Customer, Expense, ExpenseCategory, Finding, FindingStage, LegalStatus,
  Payment, Project, ProjectSettings, RoomId, Segment, Unit, UnitType,
} from '../domain/types';
import { roomsOf } from './floorplans';
import { digits, int, mulberry32, personName, pick, type Rng } from './generate';
import { seedGarden } from './seedGarden';

export const SEED_TODAY = '2026-11-10';
const ts = (d: string, hm = '09:00') => `${d}T${hm}:00`;
const fmtId = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, '0')}`;

function defaultSettings(segment: Segment): ProjectSettings {
  const vh = segment === 'komersil';
  return {
    ipl: { freeEnabled: true, freeMonths: vh ? 6 : 3, dueDay: 10 },
    wifi: {
      promoEnabled: true,
      freeMonths: 3,
      packages: [
        { id: 'wifi-basic', name: 'Basic', mbps: 30, price: 199000 },
        { id: 'wifi-plus', name: 'Plus', mbps: 50, price: 279000, popular: true },
        { id: 'wifi-max', name: 'Max', mbps: 100, price: 379000 },
      ],
    },
    prepay: {
      ipl: [
        { id: 'ipl-3', months: 3, discountType: 'none', value: 0, active: true },
        { id: 'ipl-6', months: 6, discountType: 'percent', value: 5, active: true },
        { id: 'ipl-12', months: 12, discountType: 'percent', value: 10, active: true },
        { id: 'ipl-24', months: 24, discountType: 'freeMonths', value: 3, active: false },
      ],
      wifi: [
        { id: 'wifi-6', months: 6, discountType: 'none', value: 0, active: true },
        { id: 'wifi-12', months: 12, discountType: 'freeMonths', value: 1, active: true },
      ],
      validUntil: '2026-12-31',
      noArrearsOnly: true,
    },
    cards: { freeCards: 1, freeStickers: 1, extraStickerPrice: 25000, extraCardPrice: 50000, maxExtraCards: 2 },
    complaints: {
      windowDays: 100,
      slaDays: { kebocoran: 7, retak: 14, cat: 7, keramik: 7, pintuJendela: 7, listrik: 7, pipa: 7, plafonAtap: 14, lainnya: 7 },
    },
    handover: { intervalDays: 7, maxCalls: 3, autoBast: true },
    renovation: {
      deposit: vh ? 5000000 : 2000000,
      checklist: ['inspect.drain', 'inspect.road', 'inspect.neighbour', 'inspect.debris', 'inspect.drawing'],
    },
    overdue: { flagMonths: 2 },
    fuel: { litersPer1000m2: 1.8, tolerancePct: 10 },
    budget: vh
      ? { satpam: 9000000, tukangTaman: 3000000, listrik: 2200000, kolamRenang: 1500000, angkutSampah: 1200000, landscape: 1200000, clubhouse: 1000000, lainnya: 500000 }
      : { satpam: 12000000, tukangTaman: 3500000, listrik: 2500000, kolamRenang: 0, angkutSampah: 2000000, landscape: 1000000, clubhouse: 0, lainnya: 500000 },
    features: {
      renterRegistration: vh, houseListings: vh, panic: vh, cctv: vh, legal: vh, projects: vh, handbook: vh,
      vouchers: true, marketplace: true, businesses: true, feedback: true, wifi: true, prepay: true,
    },
  };
}

interface Persona {
  unitId: string; typeId: string; customer?: Customer; akad?: string; scheme?: 'KPR' | 'cash';
  apply: (u: Unit) => void;
}

const PERSONA_CUSTOMERS: Customer[] = [
  { customer_id: 1102, name: 'Rina Wijaya', no_hp: '081234560102', no_ktp: '3275014101900001', no_npwp: null, email: 'rina.wijaya@mail.id' },
  { customer_id: 1107, name: 'Andi Pratama', no_hp: '081234560107', no_ktp: '3275011203850002', no_npwp: '12.345.678.9-012.000', email: 'andi.pratama@mail.id' },
  { customer_id: 1204, name: 'Budi Santoso', no_hp: '081234560204', no_ktp: '3275012505800003', no_npwp: null, email: 'budi.santoso@mail.id' },
  { customer_id: 2314, name: 'Joko Susilo', no_hp: '085712340314', no_ktp: '3216031508880005', no_npwp: null, email: 'joko.susilo@mail.id' },
  { customer_id: 2203, name: 'Siti Aminah', no_hp: '085712340203', no_ktp: '3216034409900006', no_npwp: null, email: 'siti.aminah@mail.id' },
];
const cust = (id: number) => PERSONA_CUSTOMERS.find((c) => c.customer_id === id)!;

const occupied = (u: Unit, bast: string, moveIn: string, source: 'security' | 'app' = 'security') => {
  u.handover.bastDate = bast;
  u.handover.bastSource = 'signed';
  u.handover.readySince = addDays(bast, -14);
  u.handover.calls = [{ n: 1, sentAt: addDays(bast, -14), readAt: addDays(bast, -13), channels: ['app', 'wa'] }];
  u.appActivatedAt = addDays(bast, 1);
  u.rules = { signedAt: ts(addDays(bast, 3), '19:20'), signaturePhotoId: 'sample:SIGNATURE', version: '1.0' };
  u.moveIn = { date: moveIn, source };
  u.occupancy = 'occupied';
};

const PERSONAS: Persona[] = [
  {
    unitId: 'vh-B1-02', typeId: 'vh-45', customer: cust(1102), akad: '2026-03-14', scheme: 'KPR',
    apply: (u) => {
      u.handover = {
        readySince: '2026-10-12',
        calls: [{ n: 1, sentAt: '2026-10-12', readAt: '2026-10-12', channels: ['app', 'wa'] }],
        slot: { date: '2026-10-26', time: '09.00–10.00' },
        checklist: { frontKeys: 3, backKeys: 2, roomKeys: 3, accessCards: 1, stickers: 1, handbook: 1, meterElectric: '21,4 kWh', meterWater: '0021', gift: false },
        receiptSentAt: '2026-10-26', bastDate: '2026-10-26', bastSource: 'signed',
      };
      u.occupancy = 'handedOver';
    },
  },
  { unitId: 'vh-A1-07', typeId: 'vh-45', customer: cust(1107), akad: '2025-11-02', scheme: 'KPR', apply: (u) => occupied(u, '2026-03-05', '2026-03-20') },
  {
    unitId: 'vh-A3-05', typeId: 'vh-36', customer: cust(1107), akad: '2026-04-10', scheme: 'cash',
    apply: (u) => {
      u.handover = { readySince: '2026-08-01', calls: [{ n: 1, sentAt: '2026-08-01', readAt: '2026-08-01', channels: ['app', 'wa'] }], slot: { date: '2026-08-14', time: '10.00–11.00' }, receiptSentAt: '2026-08-14', bastDate: '2026-08-14', bastSource: 'signed' };
      u.appActivatedAt = '2026-08-15';
      u.occupancy = 'handedOver';
    },
  },
  { unitId: 'vh-B2-04', typeId: 'vh-60', customer: cust(1204), akad: '2025-09-15', scheme: 'cash', apply: (u) => occupied(u, '2026-01-20', '2026-06-02') },
  { unitId: 'hp-C3-14', typeId: 'hp-36', customer: cust(2314), akad: '2026-05-08', scheme: 'KPR', apply: (u) => occupied(u, '2026-09-12', '2026-09-20') },
  { unitId: 'hp-A2-03', typeId: 'hp-30', customer: cust(2203), akad: '2026-01-22', scheme: 'KPR', apply: (u) => occupied(u, '2026-06-03', '2026-06-15', 'app') },
];

// Units whose handover state mirrors the wireframe call table (dates relative to 10 Nov 2026).
const HANDOVER_DEMO: Record<string, (u: Unit) => void> = {
  'vh-C3-04': (u) => { u.handover = { readySince: '2026-11-09', calls: [{ n: 1, sentAt: '2026-11-09', readAt: '2026-11-09', channels: ['app', 'wa'] }] }; u.occupancy = 'readyForHandover'; },
  'vh-C3-06': (u) => { u.handover = { readySince: '2026-11-02', calls: [{ n: 1, sentAt: '2026-11-02', readAt: '2026-11-02', channels: ['app', 'wa'] }], slot: { date: '2026-11-12', time: '10.00–11.00' } }; u.occupancy = 'readyForHandover'; },
  'vh-C2-10': (u) => { u.handover = { readySince: '2026-10-26', calls: [{ n: 1, sentAt: '2026-10-26', channels: ['app', 'wa'] }, { n: 2, sentAt: '2026-11-02', readAt: '2026-11-03', channels: ['app', 'wa'] }, { n: 3, sentAt: '2026-11-09', channels: ['app', 'wa', 'letter'] }] }; u.occupancy = 'readyForHandover'; },
  'vh-C1-03': (u) => { u.handover = { readySince: '2026-10-20', calls: [{ n: 1, sentAt: '2026-10-20', channels: ['app', 'wa'] }, { n: 2, sentAt: '2026-10-27', channels: ['app', 'wa'] }, { n: 3, sentAt: '2026-11-03', channels: ['app', 'wa', 'letter'] }] }; u.occupancy = 'readyForHandover'; },
  'vh-B3-07': (u) => { u.handover = { readySince: '2026-09-29', calls: [{ n: 1, sentAt: '2026-09-29', channels: ['app', 'wa'] }, { n: 2, sentAt: '2026-10-06', channels: ['app', 'wa'] }, { n: 3, sentAt: '2026-10-13', channels: ['app', 'wa', 'letter'] }], bastDate: '2026-10-20', bastSource: 'auto' }; u.occupancy = 'handedOver'; },
  'vh-C2-04': (u) => { u.handover = { readySince: '2026-10-05', calls: [{ n: 1, sentAt: '2026-10-05', readAt: '2026-10-05', channels: ['app', 'wa'] }], slot: { date: '2026-10-16', time: '09.00–10.00' }, receiptSentAt: '2026-10-16', bastDate: '2026-10-16', bastSource: 'signed' }; u.appActivatedAt = '2026-10-17'; u.rules = { signedAt: ts('2026-10-18', '20:10'), signaturePhotoId: 'sample:SIGNATURE', version: '1.0' }; u.occupancy = 'handedOver'; },
  'hp-B4-11': (u) => { u.handover = { readySince: '2026-10-01', calls: [{ n: 1, sentAt: '2026-10-01', readAt: '2026-10-01', channels: ['app', 'wa'] }], slot: { date: '2026-10-12', time: '13.00–14.00' }, receiptSentAt: '2026-10-12', bastDate: '2026-10-12', bastSource: 'signed' }; u.appActivatedAt = '2026-10-13'; u.rules = { signedAt: ts('2026-10-14', '19:00'), signaturePhotoId: 'sample:SIGNATURE', version: '1.0' }; u.occupancy = 'handedOver'; },
};

const COMPLAINT_UNITS: Record<string, string> = { 'vh-B2-09': '2026-08-20', 'vh-C1-12': '2026-09-01', 'hp-B2-15': '2026-09-25', 'hp-A4-02': '2026-08-30' };

function randomDate(r: Rng, from: string, to: string) {
  const span = Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
  return addDays(from, int(r, 0, span));
}

export function buildSeed(): AppData {
  const r = mulberry32(42);
  const seq: Record<string, number> = {};
  const next = (p: string) => fmtId(p, (seq[p] = (seq[p] ?? 0) + 1));

  const d: AppData = {
    version: 1, today: SEED_TODAY, seq, session: { dashboard: { projectId: 'vh', roleView: 'all' } },
    vles: { customers: [], transactions: [], units: [], unitTypes: [] },
    projects: [], unitTypes: [], units: [], renters: [], registrations: [], staff: [],
    bills: [], payments: [], wifi: [], cardOrders: [], moveIns: [], renovations: [], complaints: [], workGroups: [],
    feedback: [], announcements: [], notifications: [], panics: [], businesses: [], listings: [], leads: [], vouchers: [], voucherClaims: [],
    zones: [], machines: [], mowingLogs: [], fuel: [], attendance: [], expenses: [], activity: [],
  };

  // Projects and unit types --------------------------------------------------
  const projects: Project[] = [
    { id: 'vh', vlesProjectId: 101, name: 'Vista Harmoni Residence', location: 'Tambun, Bekasi', segment: 'komersil', businessGroup: 'Vista', settings: defaultSettings('komersil') },
    { id: 'hp', vlesProjectId: 202, name: 'Harmoni Park Cibitung', location: 'Cibitung, Bekasi', segment: 'subsidi', businessGroup: 'Harmoni Park', settings: defaultSettings('subsidi') },
  ];
  d.projects = projects;
  const types: UnitType[] = [
    { id: 'vh-36', vlesTypeId: 1011, projectId: 'vh', name: 'Tipe 36/72', landSize: 72, buildingSize: 36, rooms: roomsOf('vh-36'), iplRate: 250000 },
    { id: 'vh-45', vlesTypeId: 1012, projectId: 'vh', name: 'Tipe 45/90', landSize: 90, buildingSize: 45, rooms: roomsOf('vh-45'), iplRate: 350000 },
    { id: 'vh-60', vlesTypeId: 1013, projectId: 'vh', name: 'Tipe 60/105', landSize: 105, buildingSize: 60, rooms: roomsOf('vh-60'), iplRate: 450000 },
    { id: 'vh-75', vlesTypeId: 1014, projectId: 'vh', name: 'Tipe 75/120', landSize: 120, buildingSize: 75, rooms: roomsOf('vh-75'), iplRate: 550000 },
    { id: 'hp-30', vlesTypeId: 2021, projectId: 'hp', name: 'Tipe 30/60', landSize: 60, buildingSize: 30, rooms: roomsOf('hp-30'), iplRate: 120000 },
    { id: 'hp-36', vlesTypeId: 2022, projectId: 'hp', name: 'Tipe 36/72', landSize: 72, buildingSize: 36, rooms: roomsOf('hp-36'), iplRate: 150000 },
  ];
  d.unitTypes = types;
  for (const t of types) {
    const p = projects.find((x) => x.id === t.projectId)!;
    d.vles.unitTypes.push({ id: t.vlesTypeId, project_id: p.vlesProjectId, name: t.name, land_size: t.landSize, building_size: t.buildingSize, sales_category: p.segment, deleted: false, updated_at: ts('2025-06-01') });
  }

  // Units -------------------------------------------------------------------
  d.vles.customers.push(...PERSONA_CUSTOMERS);
  let nextCustomer = 3001;
  let nextTx = 50001;
  const personaById = new Map(PERSONAS.map((p) => [p.unitId, p]));
  const layout: [Project, string[], number][] = [
    [projects[0], ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3'], 18],
    [projects[1], ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'B5', 'C1', 'C2', 'C3', 'C4', 'C5'], 20],
  ];
  for (const [p, blocks, perBlock] of layout) {
    let idx = 0;
    for (const block of blocks) {
      for (let n = 1; n <= perBlock; n++) {
        idx++;
        const code = `${block}/${String(n).padStart(2, '0')}`;
        const id = `${p.id}-${block}-${String(n).padStart(2, '0')}`;
        const persona = personaById.get(id);
        const typeId = persona?.typeId ?? (p.id === 'vh'
          ? ({ A: n % 2 ? 'vh-45' : 'vh-36', B: n % 3 ? 'vh-45' : 'vh-60', C: n % 4 ? 'vh-60' : 'vh-75' } as Record<string, string>)[block[0]]
          : block[0] === 'A' ? 'hp-30' : 'hp-36');
        const u: Unit = { id, vlesUnitId: p.vlesProjectId * 10000 + idx, code, projectId: p.id, typeId, handover: { calls: [] }, occupancy: 'notReady', consequences: [] };

        // Ownership
        const roll = r();
        const sold = Boolean(persona) || roll < 0.93 || id in HANDOVER_DEMO || id in COMPLAINT_UNITS;
        let scheme: 'KPR' | 'cash' = r() < 0.7 ? 'KPR' : 'cash';
        if (sold) {
          let customer = persona?.customer;
          if (!customer) {
            customer = { customer_id: nextCustomer++, name: personName(r), no_hp: `0813${digits(r, 8)}`, no_ktp: `${p.id === 'vh' ? '3275' : '3216'}${digits(r, 12)}`, no_npwp: r() < 0.4 ? `${digits(r, 2)}.${digits(r, 3)}.${digits(r, 3)}.${digits(r, 1)}-${digits(r, 3)}.000` : null, email: '' };
            customer.email = `${customer.name.toLowerCase().replace(/\s+/g, '.')}${customer.customer_id}@mail.id`;
            d.vles.customers.push(customer);
          }
          scheme = persona?.scheme ?? scheme;
          u.ownerCustomerId = customer.customer_id;
          u.akadDate = persona?.akad ?? randomDate(r, '2025-03-01', '2026-06-30');
          d.vles.transactions.push({ id: nextTx, customer_id: customer.customer_id, unit_id: u.vlesUnitId, status: 'active', akad_date: u.akadDate, payment_scheme: scheme });
        }

        // Handover / occupancy
        if (persona) persona.apply(u);
        else if (HANDOVER_DEMO[id]) HANDOVER_DEMO[id](u);
        else if (COMPLAINT_UNITS[id]) occupied(u, COMPLAINT_UNITS[id], addDays(COMPLAINT_UNITS[id], 10));
        else if (sold) {
          const s = r();
          if (s < 0.72) {
            const bast = randomDate(r, '2025-09-01', '2026-09-30');
            occupied(u, bast, addDays(bast, int(r, 4, 30)), r() < 0.75 ? 'security' : 'app');
          } else if (s < 0.82) {
            const bast = randomDate(r, '2026-08-01', '2026-10-31');
            u.handover = { readySince: addDays(bast, -10), calls: [{ n: 1, sentAt: addDays(bast, -10), readAt: addDays(bast, -9), channels: ['app', 'wa'] }], bastDate: bast, bastSource: 'signed', receiptSentAt: bast };
            if (r() < 0.6) u.appActivatedAt = addDays(bast, 2);
            u.occupancy = 'handedOver';
          } else if (s < 0.9) {
            const ready = randomDate(r, '2026-10-28', '2026-11-08');
            u.handover = { readySince: ready, calls: [{ n: 1, sentAt: ready, readAt: r() < 0.7 ? ready : undefined, channels: ['app', 'wa'] }] };
            u.occupancy = 'readyForHandover';
          }
        }
        d.vles.units.push({ id: u.vlesUnitId, project_id: p.vlesProjectId, code, unit_type_id: types.find((t) => t.id === typeId)!.vlesTypeId, sales_category: p.segment, business_group_label: p.businessGroup, active_transaction_id: sold ? nextTx : null, deleted: false, updated_at: ts('2026-10-31') });
        if (sold) nextTx++;
        if (p.segment === 'komersil' && sold && u.handover.bastDate) u.legal = legalFor(r, u, scheme);
        d.units.push(u);
      }
    }
  }
  const unit = (id: string) => d.units.find((u) => u.id === id)!;

  // Renters -----------------------------------------------------------------
  d.renters.push(
    { id: 'r-1', unitId: 'vh-B2-04', ownerCustomerId: 1204, name: 'Sari Lestari', no_ktp: '3275016607950004', no_hp: '081298760204', householdSize: 3, lease: { start: '2026-06-01', end: '2026-11-30' }, iplPayer: 'renter', movedInAt: '2026-06-02', rulesSignedAt: ts('2026-05-30', '20:00'), status: 'active' },
  );
  unit('vh-B2-04').renterId = 'r-1';
  const a109 = unit('vh-A1-09');
  d.renters.push({ id: 'r-2', unitId: a109.id, ownerCustomerId: a109.ownerCustomerId!, name: 'Bagus Prakoso', no_ktp: '3275010303920007', no_hp: '081277001109', householdSize: 4, lease: { start: '2026-03-01', end: '2027-02-28' }, iplPayer: 'owner', movedInAt: '2026-03-02', rulesSignedAt: ts('2026-02-27', '19:00'), status: 'active' });
  a109.renterId = 'r-2';
  d.registrations.push(
    { id: next('REG'), unitId: 'vh-B2-04', ownerCustomerId: 1204, type: 'renter', person: { name: 'Sari Lestari', no_ktp: '3275016607950004', no_hp: '081298760204', householdSize: 3 }, lease: { start: '2026-06-01', end: '2026-11-30' }, leaseDocPhotoId: 'sample:LEASE', vehicles: [{ type: 'mobil', plate: 'B 2211 SRL' }], moveIn: { date: '2026-06-02', time: '08.00–12.00' }, iplPayer: 'renter', fee: 50000, feePaid: true, status: 'approved', createdAt: ts('2026-05-20', '10:15'), renterId: 'r-1' },
    { id: next('REG'), unitId: 'vh-C1-09', ownerCustomerId: unit('vh-C1-09').ownerCustomerId!, type: 'newOwner', person: { name: 'Hendra Kusuma', no_ktp: '3275011807870008', no_hp: '085700001903', householdSize: 4 }, ajbDate: '2026-10-20', leaseDocPhotoId: 'sample:LEASE', vehicles: [{ type: 'mobil', plate: 'B 1903 HK' }], moveIn: { date: '2026-11-21', time: '08.00–12.00' }, iplPayer: 'owner', fee: 75000, feePaid: true, status: 'submitted', createdAt: ts('2026-11-06', '14:20') },
    { id: next('REG'), unitId: 'vh-A2-05', ownerCustomerId: unit('vh-A2-05').ownerCustomerId!, type: 'renter', person: { name: 'Lukas Wibowo', no_ktp: '3275012209910009', no_hp: '081200001117', householdSize: 2 }, lease: { start: '2026-12-01', end: '2027-11-30' }, leaseDocPhotoId: 'sample:LEASE', vehicles: [{ type: 'motor', plate: 'B 3117 LW' }], moveIn: { date: '2026-12-01', time: '13.00–17.00' }, iplPayer: 'renter', fee: 0, feePaid: false, status: 'submitted', createdAt: ts('2026-11-08', '09:40') },
  );

  // Staff -------------------------------------------------------------------
  d.staff.push(
    { id: 'st-sec', role: 'security', name: 'Pak Dedi', projectIds: ['vh', 'hp'], phone: '081300000001' },
    { id: 'st-mandor', role: 'mandor', name: 'Mandor Hasan', projectIds: ['vh', 'hp'], company: 'PT Bangun Karya', phone: '081300000002' },
    { id: 'st-garden', role: 'gardener', name: 'Ujang', projectIds: ['vh'], phone: '081300000003' },
  );

  // IPL and WiFi payments (bills themselves are generated by syncAllBills) ----
  const iplPayments = (u: Unit, months: string[], method: Payment['method'] = 'va') => {
    for (const m of months) {
      const rate = types.find((t) => t.id === u.typeId)!.iplRate;
      d.payments.push({ id: next('PAY'), unitId: u.id, kind: 'ipl', months: [m], amount: rate, discount: 0, method, paidAt: ts(`${m}-${String(int(r, 3, 9)).padStart(2, '0')}`, '10:30'), recordedBy: 'resident' });
    }
  };
  const monthsFrom = (from: string, to: string) => {
    const out: string[] = [];
    for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
    return out;
  };
  const prepayBuyers: string[] = [];
  for (const u of d.units) {
    if (!u.handover.bastDate || u.id in Object.fromEntries(PERSONAS.map((p) => [p.unitId, 1]))) continue;
    const p = projects.find((x) => x.id === u.projectId)!;
    const first = addMonths(monthOf(u.handover.bastDate), p.settings.ipl.freeMonths);
    if (first > '2026-11') continue;
    const roll = r();
    if (roll < 0.8) {
      if (u.occupancy === 'occupied' && prepayBuyers.length < 6 && first <= '2026-09' && r() < 0.2) {
        iplPayments(u, monthsFrom(first, '2026-10'));
        prepayBuyers.push(u.id);
        continue;
      }
      iplPayments(u, monthsFrom(first, r() < 0.6 ? '2026-11' : '2026-10'), r() < 0.6 ? 'va' : 'qris');
    } else if (roll < 0.92) {
      iplPayments(u, monthsFrom(first, '2026-09'));
    } else {
      iplPayments(u, monthsFrom(first, int(r, 0, 1) ? '2026-07' : '2026-08'));
    }
  }
  // Pay-ahead buyers: 12 months from Nov 2026 (one 6-month buyer).
  prepayBuyers.forEach((id, i) => {
    const u = unit(id);
    const rate = types.find((t) => t.id === u.typeId)!.iplRate;
    const n = i === 1 ? 6 : 12;
    const pct = n === 12 ? 10 : 5;
    const gross = rate * n;
    d.payments.push({ id: next('PAY'), unitId: id, kind: 'ipl', months: monthsFrom('2026-11', addMonths('2026-11', n - 1)), amount: gross - Math.round((gross * pct) / 100), discount: Math.round((gross * pct) / 100), method: 'va', paidAt: ts(`2026-11-0${2 + i}`, '11:00'), recordedBy: 'resident', packageId: `ipl-${n}` });
  });
  // Persona payments: Budi's unit is paid by renter Sari Jul–Oct; Siti paid Sep–Oct.
  iplPayments(unit('vh-B2-04'), ['2026-07', '2026-08', '2026-09', '2026-10']);
  iplPayments(unit('hp-A2-03'), ['2026-09', '2026-10'], 'qris');

  // WiFi subscriptions for ~40% of occupied units, plus Andi.
  for (const u of d.units) {
    if (u.occupancy !== 'occupied' || !u.moveIn) continue;
    const isAndi = u.id === 'vh-A1-07';
    if (!isAndi && (r() > 0.4 || u.id in Object.fromEntries(PERSONAS.map((p) => [p.unitId, 1])))) continue;
    const installedAt = isAndi ? '2026-03-25' : addDays(u.moveIn.date, 5);
    if (installedAt > SEED_TODAY) continue;
    const pkg = isAndi ? 'wifi-plus' : pick(r, ['wifi-basic', 'wifi-plus', 'wifi-plus', 'wifi-max']);
    const freeUntil = addMonths(monthOf(installedAt), 2);
    d.wifi.push({ unitId: u.id, packageId: pkg, installSlot: { date: installedAt, time: '09.00–12.00' }, status: 'installed', installedAt, freeUntil });
    const price = projects[0].settings.wifi.packages.find((x) => x.id === pkg)!.price;
    for (const m of monthsFrom(addMonths(freeUntil, 1), '2026-10')) {
      d.payments.push({ id: next('PAY'), unitId: u.id, kind: 'wifi', months: [m], amount: price, discount: 0, method: 'va', paidAt: ts(`${m}-05`, '08:00'), recordedBy: 'resident' });
    }
  }

  // Card orders ----------------------------------------------------------------
  d.cardOrders.push(
    { id: next('ORD'), unitId: 'vh-C1-09', freeCards: 0, freeStickers: 0, extraCards: 1, extraStickers: 1, vehicles: [{ type: 'motor', plate: 'B 5678 ABC' }], total: 75000, status: 'toMake', createdAt: ts('2026-11-07', '15:00') },
    { id: next('ORD'), unitId: 'vh-C1-01', freeCards: 0, freeStickers: 0, extraCards: 0, extraStickers: 1, vehicles: [{ type: 'mobil', plate: 'B 2468 DEF' }], total: 25000, status: 'ready', createdAt: ts('2026-11-03', '10:00') },
    { id: next('ORD'), unitId: 'vh-A1-03', freeCards: 0, freeStickers: 0, extraCards: 1, extraStickers: 0, vehicles: [], total: 50000, status: 'awaitingPayment', createdAt: ts('2026-11-09', '18:30') },
    { id: next('ORD'), unitId: 'vh-A2-11', freeCards: 0, freeStickers: 0, extraCards: 2, extraStickers: 0, vehicles: [], total: 100000, status: 'pickedUp', createdAt: ts('2026-10-18', '09:00') },
  );

  // Move-ins scheduled for today ---------------------------------------------
  d.moveIns.push(
    { id: next('MOV'), unitId: 'vh-C2-04', who: 'owner', date: SEED_TODAY, time: '13.00–17.00', vehicle: 'pickup', plate: 'B 9876 KLM', withWifi: false, status: 'approved' },
    { id: next('MOV'), unitId: 'hp-B4-11', who: 'owner', date: SEED_TODAY, time: '08.00–12.00', vehicle: 'trukEngkel', plate: 'B 1234 XYZ', withWifi: true, status: 'approved' },
  );

  // Renovations ----------------------------------------------------------------
  const reno = (id: string, unitId: string, title: string, step: Unit['occupancy'] | string, hist: [string, string][], extra: Partial<AppData['renovations'][number]> = {}) => {
    const p = projects.find((x) => x.id === unit(unitId).projectId)!;
    d.renovations.push({
      id, unitId, requestedBy: 'owner', title, description: title, step: step as AppData['renovations'][number]['step'],
      history: hist.map(([s, at]) => ({ step: s as AppData['renovations'][number]['step'], at: ts(at, '10:00') })),
      deposit: p.settings.renovation.deposit, va: `8808${unitId.replace(/\D/g, '')}31`, ...extra,
    });
  };
  reno('REN-0024', 'vh-C1-01', 'Pagar depan', 'depositReturned', [['submitted', '2026-08-01'], ['estateReview', '2026-08-01'], ['awaitingDeposit', '2026-08-03'], ['inProgress', '2026-08-05'], ['inspection', '2026-10-10'], ['bastIssued', '2026-10-12'], ['bastSigned', '2026-10-15'], ['depositReturned', '2026-10-18']], { inspection: { checklist: { 'inspect.drain': true, 'inspect.road': true, 'inspect.neighbour': true, 'inspect.debris': true, 'inspect.drawing': true }, result: 'full', deduction: 0, photoIds: [] }, refundAccount: 'BCA · 1234567890 · a.n. pemilik' });
  reno('REN-0027', 'vh-A1-03', 'Dapur belakang', 'inspection', [['submitted', '2026-08-25'], ['estateReview', '2026-08-25'], ['awaitingDeposit', '2026-08-28'], ['inProgress', '2026-09-02'], ['inspection', '2026-11-10']]);
  reno('REN-0031', 'vh-A1-07', 'Kanopi depan', 'awaitingDeposit', [['submitted', '2026-10-20'], ['estateReview', '2026-10-20'], ['awaitingDeposit', '2026-10-22']], { description: 'Pasang kanopi baja ringan 3 × 5 m di carport.' });
  reno('REN-0033', 'vh-B2-09', 'Pagar samping', 'estateReview', [['submitted', '2026-11-04'], ['estateReview', '2026-11-04']], { description: 'Tinggikan pagar samping 50 cm. Gambar kerja menyusul.' });
  reno('REN-0040', 'vh-B2-04', 'Pasang teralis jendela', 'ownerApproval', [['submitted', '2026-10-26'], ['ownerApproval', '2026-10-26']], { requestedBy: 'renter', renterId: 'r-1', description: 'Teralis besi untuk 2 jendela depan.' });
  reno('REN-0035', 'hp-B1-08', 'Kanopi carport', 'awaitingDeposit', [['submitted', '2026-10-28'], ['estateReview', '2026-10-28'], ['awaitingDeposit', '2026-10-30']]);
  seq.REN = 40;

  // Complaints -----------------------------------------------------------------
  const finding = (fid: string, room: RoomId, photo: string, description: string, category: ComplaintCategory, confidence: number, stage: FindingStage, at: string, extra: Partial<Finding> = {}): Finding => ({
    id: fid, room, photoIds: [`sample:${photo}`], description,
    ai: { verdict: 'valid', category, confidence, noteKey: `ai.note.${category}`, area: { x: 0.3, y: 0.25, w: 0.35, h: 0.3 } },
    manualReview: false, category, checklist: [], fixChecks: [], stage,
    history: [{ stage: 'submitted', at: ts(at, '19:00'), by: 'resident' }, ...(stage !== 'submitted' ? [{ stage, at: ts(addDays(at, 3), '10:00'), by: 'estate' }] : [])],
    ...extra,
  });
  const complaint = (id: string, unitId: string, submitted: string, findings: Finding[]): Complaint => ({ id, unitId, createdAt: ts(addDays(submitted, -2), '18:00'), submittedAt: ts(submitted, '19:00'), findings });
  d.complaints.push(
    complaint('KMP-0141', 'hp-A4-02', '2026-09-10', [
      finding('f-141-1', 'kamarMandi', 'TAP', 'Kran wastafel menetes', 'pipa', 90, 'done', '2026-09-10', { fixChecks: [{ verdict: 'fixed', confidence: 93, noteKey: 'ai.fix.fixed', at: ts('2026-09-20', '15:00'), photoId: 'sample:TAP_FIXED' }], mandorId: 'st-mandor' }),
    ]),
    complaint('KMP-0142', 'vh-B2-09', '2026-10-12', [
      finding('f-142-1', 'kamar2', 'DAMP', 'Rembes di dinding dekat plafon', 'kebocoran', 92, 'submitted', '2026-10-12'),
      finding('f-142-2', 'dapur', 'TILE', 'Keramik retak dekat kompor', 'keramik', 89, 'verified', '2026-10-12'),
      finding('f-142-3', 'teras', 'PAINT', 'Cat dinding teras mengelupas', 'cat', 94, 'assigned', '2026-10-12', { groupId: 'GRP-0004', mandorId: 'st-mandor', checklist: [{ label: 'checklist.cat.1', done: false }, { label: 'checklist.cat.2', done: false }, { label: 'checklist.cat.3', done: false }] }),
    ]),
    complaint('KMP-0145', 'vh-A1-07', '2026-05-20', [
      finding('f-145-1', 'kamarMandi', 'TAP', 'Air kran debit kecil', 'pipa', 90, 'inProgress', '2026-05-20', { groupId: 'GRP-0003', mandorId: 'st-mandor', checklist: [{ label: 'checklist.pipa.1', done: true }, { label: 'checklist.pipa.2', done: false }, { label: 'checklist.pipa.3', done: false }] }),
      finding('f-145-2', 'teras', 'PAINT', 'Cat mengelupas di teras', 'cat', 94, 'done', '2026-05-20', { mandorId: 'st-mandor', fixChecks: [{ verdict: 'fixed', confidence: 95, noteKey: 'ai.fix.fixed', at: ts('2026-06-08', '14:00'), photoId: 'sample:PAINT_FIXED' }] }),
    ]),
    complaint('KMP-0146', 'vh-C1-12', '2026-10-05', [
      finding('f-146-1', 'kamarMandi', 'TILE', 'Nat keramik kamar mandi tidak rata', 'keramik', 87, 'inProgress', '2026-10-05', { groupId: 'GRP-0003', mandorId: 'st-mandor', fixChecks: [{ verdict: 'notFixed', confidence: 86, noteKey: 'ai.fix.stillVisible', at: ts('2026-11-06', '16:00'), photoId: 'sample:TILE_NOTFIXED' }] }),
      finding('f-146-2', 'dapur', 'CRACK', 'Retak rambut dinding dapur', 'retak', 87, 'workDone', '2026-10-05', { mandorId: 'st-mandor', fixChecks: [{ verdict: 'fixed', confidence: 91, noteKey: 'ai.fix.fixed', at: ts('2026-11-08', '15:30'), photoId: 'sample:CRACK_FIXED' }] }),
    ]),
    complaint('KMP-0147', 'hp-B2-15', '2026-10-30', [
      finding('f-147-1', 'kamar2', 'CRACK', 'Retak dinding kamar', 'retak', 87, 'submitted', '2026-10-30'),
      finding('f-147-2', 'ruangKeluarga', 'DAMP', 'Plafon bernoda air', 'kebocoran', 92, 'awaitingResident', '2026-10-30', { mandorId: 'st-mandor', fixChecks: [{ verdict: 'fixed', confidence: 92, noteKey: 'ai.fix.fixed', at: ts('2026-11-07', '11:00'), photoId: 'sample:DAMP_FIXED' }] }),
    ]),
  );
  d.workGroups.push(
    { id: 'GRP-0003', projectId: 'vh', category: 'pipa', refs: [{ complaintId: 'KMP-0145', findingId: 'f-145-1' }, { complaintId: 'KMP-0146', findingId: 'f-146-1' }], material: 'Kran, seal tape, nat keramik', estimateDays: 2, mandorId: 'st-mandor', createdAt: ts('2026-10-20') },
    { id: 'GRP-0004', projectId: 'vh', category: 'cat', refs: [{ complaintId: 'KMP-0142', findingId: 'f-142-3' }], material: 'Cat eksterior 5 kg, plamir', estimateDays: 1, mandorId: 'st-mandor', createdAt: ts('2026-10-16') },
  );
  seq.KMP = 147;
  seq.GRP = 4;

  // Community, security and announcements -------------------------------------
  d.feedback.push(
    { id: next('FB'), unitId: 'vh-A1-07', from: { kind: 'owner', customerId: 1107 }, topic: 'kebersihan', text: 'Tambah tempat sampah di taman bermain', status: 'replied', reply: 'Terima kasih, 2 tempat sampah dipasang minggu depan.', createdAt: ts('2026-10-21', '19:10'), repliedAt: ts('2026-10-22', '09:30') },
    { id: next('FB'), unitId: 'vh-A1-07', from: { kind: 'owner', customerId: 1107 }, topic: 'saran', text: 'Jadwal senam pagi di clubhouse setiap Minggu', status: 'read', createdAt: ts('2026-11-02', '07:45') },
    { id: next('FB'), unitId: 'vh-C1-01', from: { kind: 'owner', customerId: unit('vh-C1-01').ownerCustomerId! }, topic: 'keamanan', text: 'Lampu jalan depan Blok C1 mati sejak kemarin', status: 'sent', createdAt: ts('2026-11-09', '21:05') },
    { id: next('FB'), unitId: 'hp-C3-14', from: { kind: 'owner', customerId: 2314 }, topic: 'fasilitas', text: 'Mohon tambahan lampu di lapangan', status: 'sent', createdAt: ts('2026-11-08', '18:30') },
  );
  d.announcements.push(
    { id: 'ANN-1', projectId: 'vh', tag: 'jadwal', title: 'Fogging nyamuk seluruh cluster', body: 'Sabtu pagi, mohon tutup jendela dan simpan makanan.', date: '2026-11-14', createdAt: ts('2026-11-07') },
    { id: 'ANN-2', projectId: 'vh', tag: 'info', title: 'Kolam renang buka kembali setelah perawatan', body: 'Kolam renang buka mulai Senin 16 Nov pukul 06.00.', date: '2026-11-16', createdAt: ts('2026-11-06') },
    { id: 'ANN-3', projectId: 'vh', tag: 'penting', title: 'Pemadaman listrik PLN terencana Blok C', body: 'Rabu 18 Nov pukul 09.00–12.00 untuk pemeliharaan gardu.', date: '2026-11-18', createdAt: ts('2026-11-05') },
    { id: 'ANN-4', projectId: 'hp', tag: 'jadwal', title: 'Kerja bakti bersih saluran', body: 'Minggu 15 Nov pukul 07.00, kumpul di lapangan.', date: '2026-11-15', createdAt: ts('2026-11-06') },
    { id: 'ANN-5', projectId: 'hp', tag: 'info', title: 'Jadwal angkut sampah berubah', body: 'Mulai minggu depan sampah diangkut Senin, Rabu, Jumat.', date: '2026-11-16', createdAt: ts('2026-11-04') },
    { id: 'ANN-6', projectId: 'hp', tag: 'penting', title: 'Perbaikan pompa air Blok A', body: 'Air mati sementara Kamis 19 Nov pukul 10.00–14.00.', date: '2026-11-19', createdAt: ts('2026-11-03') },
  );
  d.panics.push(
    { id: next('PNC'), unitId: 'vh-C2-07', from: { kind: 'owner', customerId: unit('vh-C2-07').ownerCustomerId! }, type: 'pencurian', awayFromHome: false, createdAt: '2026-10-24T01:12:00', acceptedAt: '2026-10-24T01:13:30', acceptedBy: 'st-sec', resolvedAt: '2026-10-24T01:40:00', outcome: 'handled' },
    { id: next('PNC'), unitId: 'vh-A1-09', from: { kind: 'renter', renterId: 'r-2' }, type: 'medis', awayFromHome: false, createdAt: '2026-10-19T20:40:00', acceptedAt: '2026-10-19T20:44:00', acceptedBy: 'st-sec', resolvedAt: '2026-10-19T21:30:00', outcome: 'handled' },
    { id: next('PNC'), unitId: 'vh-B2-04', from: { kind: 'renter', renterId: 'r-1' }, type: 'lainnya', awayFromHome: false, createdAt: '2026-10-12T10:05:00', outcome: 'cancelled', resolvedAt: '2026-10-12T10:05:04' },
  );

  const biz = (projectId: string, name: string, category: AppData['businesses'][number]['category'], location: string, description: string, open: boolean, hasVoucher: boolean) =>
    d.businesses.push({ id: `BIZ-${projectId}-${d.businesses.length + 1}`, projectId, name, category, location, description, whatsapp: `62812${digits(r, 8)}`, open, hasVoucher, status: 'verified' });
  biz('vh', 'Dapur Bu Rini', 'kuliner', 'Rumah · C2/07', 'Katering harian & nasi kotak, pesan H-1', true, true);
  biz('vh', 'Kopi Teras', 'kuliner', 'Ruko R-03', 'Kopi susu, roti bakar, wifi untuk kerja', true, true);
  biz('vh', 'Bersih Kilat Laundry', 'jasa', 'Ruko R-05', 'Kiloan & satuan, antar-jemput dalam cluster', true, true);
  biz('vh', 'Servis AC Pak Dodi', 'jasa', 'Rumah · A3/02', 'Cuci & isi freon, panggilan ke rumah', false, false);
  biz('vh', 'Minimarket Harmoni', 'toko', 'Ruko R-01', 'Kebutuhan harian, buka 06.00–23.00', true, false);
  biz('vh', 'Apotek Sehat', 'kesehatan', 'Ruko R-02', 'Obat & alat kesehatan, apoteker jaga', true, false);
  biz('vh', 'Les Calistung Kak Nia', 'pendidikan', 'Rumah · B2/11', 'Les baca-tulis-hitung TK–SD, sore hari', false, false);
  biz('vh', 'Toko Bangunan Jaya', 'toko', 'Ruko R-08', 'Material renovasi & cat, antar ke unit', true, true);
  biz('hp', 'Warung Bu Sri', 'kuliner', 'Rumah · A1/04', 'Nasi uduk & gorengan pagi', true, true);
  biz('hp', 'Laundry Wangi', 'jasa', 'Rumah · B3/10', 'Cuci kiloan 2 hari selesai', true, false);
  biz('hp', 'Toko Kelontong Berkah', 'toko', 'Ruko 2', 'Sembako, gas, galon', true, true);
  biz('hp', 'Bidan Ratna', 'kesehatan', 'Rumah · C1/01', 'Praktik bidan & imunisasi', true, false);
  biz('hp', 'Bengkel Motor Jaya', 'jasa', 'Ruko 4', 'Servis & ganti oli motor', false, false);

  const listing = (projectId: string, unitId: string, kind: AppData['listings'][number]['kind'], title: string, price: number | undefined, priceUnit: AppData['listings'][number]['priceUnit'], description: string, daysAgo: number, replies: number, photo?: string) =>
    d.listings.push({ id: next('LST'), projectId, unitId, kind, title, price, priceUnit, description, photoIds: photo ? [photo] : [], createdAt: ts(addDays(SEED_TODAY, -daysAgo), '15:00'), replies, reported: false });
  listing('vh', 'vh-B2-06', 'rumahDisewakan', 'Rumah B2/06 disewakan · tipe 45, semi furnished', 45000000, 'year', 'Sewa minimal 1 tahun. Cluster dengan security 24 jam, CCTV, clubhouse. Survei bisa akhir pekan.', 0, 1, 'house:2');
  listing('vh', 'vh-C1-09', 'rumahDijual', 'Rumah C1/09 dijual · over kredit atau cash', 1150000000, 'once', 'Tipe 60, hadap timur, dekat taman bermain.', 1, 0, 'house:3');
  listing('vh', 'vh-A1-05', 'dijual', 'Kulkas 2 pintu, 1 tahun pakai', 2500000, 'once', 'Pindah ke unit lebih kecil. Kondisi mulus.', 0, 2);
  listing('vh', 'vh-C1-09', 'dicari', 'Cari tukang pasang kanopi yang biasa kerja di cluster', undefined, undefined, 'Untuk carport 3 × 5 m.', 0, 1);
  listing('vh', 'vh-B1-08', 'jasa', 'Titip jemput anak sekolah — rute SD Harmoni, 2 kursi kosong', 300000, 'month', 'Mobil 7 kursi, berangkat 06.30.', 1, 0);
  listing('vh', 'vh-A2-04', 'dijual', 'Sepeda anak 16 inch + roda bantu', 450000, 'once', 'Warna biru, ban baru.', 1, 1);
  listing('vh', 'vh-C2-07', 'info', 'Kumpulan beli galon isi ulang bareng — dapat harga grosir', undefined, undefined, 'Minimal 10 rumah, antar setiap Selasa.', 2, 2);
  listing('vh', 'vh-B2-11', 'dijual', 'Gorden blackout ukuran jendela tipe 45', 350000, 'once', '2 set, abu-abu.', 3, 0);
  listing('hp', 'hp-A1-05', 'dijual', 'Kipas angin berdiri, masih garansi', 250000, 'once', 'Merek lokal, jarang dipakai.', 0, 1);
  listing('hp', 'hp-B3-02', 'dicari', 'Cari tukang las pagar', undefined, undefined, 'Pagar depan 3 meter.', 1, 2);
  listing('hp', 'hp-C2-07', 'jasa', 'Les mengaji anak, Senin–Kamis sore', 150000, 'month', 'Di rumah, maksimal 6 anak.', 2, 0);
  listing('hp', 'hp-A3-11', 'info', 'Arisan ibu-ibu Blok A mulai bulan depan', undefined, undefined, 'Kumpul di rumah A3/11.', 3, 4);

  const lead = (daysAgo: number, name: string, whatsapp: string, interest: 'sewa' | 'beli', source: AppData['leads'][number]['source'], domicile: string, status: AppData['leads'][number]['status'], pic: string) =>
    d.leads.push({ id: next('LEAD'), projectId: 'vh', name, whatsapp, interest, source, domicile, plan: pick(r, ['bulanIni', '1-3bulan', '>3bulan'] as const), status, pic, consentAt: ts(addDays(SEED_TODAY, -daysAgo), '20:00'), createdAt: ts(addDays(SEED_TODAY, -daysAgo), '20:00') });
  const l1 = d.listings[0].id;
  const l2 = d.listings[1].id;
  lead(13, 'Yoga Permana', '081200000401', 'sewa', { kind: 'listing', listingId: l1 }, 'Cikarang', 'baru', 'Pemilik B2/06');
  lead(14, 'Melati Sukma', '085700000118', 'beli', { kind: 'listing', listingId: l2 }, 'Bekasi Timur', 'dihubungi', 'Mkt. Rani');
  lead(14, 'Andre Siahaan', '081300000772', 'sewa', { kind: 'listing', listingId: l1 }, 'Cibitung', 'survei', 'Pemilik B2/06');
  lead(16, 'Nadia Putri', '082100000230', 'beli', { kind: 'project', projectName: 'Harmoni Park Bekasi' }, 'Tambun', 'dihubungi', 'Mkt. Rani');
  lead(19, 'Fikri Ramadhan', '087800000905', 'sewa', { kind: 'listing', listingId: l1 }, 'Karawang', 'deal', 'Pemilik B2/06');
  lead(21, 'Larasati Dewi', '081900000644', 'beli', { kind: 'listing', listingId: l2 }, 'Jakarta Timur', 'survei', 'Mkt. Rani');
  lead(23, 'Gilang Saputra', '089600000312', 'beli', { kind: 'project', projectName: 'Harmoni Park Residence' }, 'Cikarang', 'batal', 'Mkt. Rani');

  for (const projectId of ['vh', 'hp']) {
    const pfx = projectId === 'vh' ? 'VH' : 'HP';
    d.vouchers.push(
      { id: `VC-${projectId}-1`, projectId, partner: projectId === 'vh' ? 'Kopi Teras' : 'Warung Bu Sri', category: 'kuliner', title: projectId === 'vh' ? 'Diskon 10% semua menu minuman' : 'Diskon 10% sarapan', description: 'Min. belanja Rp50.000', valueLabel: '10%', code: `${pfx}-KOPI10`, validUntil: '2026-12-31', stock: 38, tone: 'orange' },
      { id: `VC-${projectId}-2`, projectId, partner: projectId === 'vh' ? 'Harmoni Swim Club' : 'Lapangan Futsal Harmoni', category: 'fasilitas', title: projectId === 'vh' ? '2 tiket tamu kolam renang' : '1 jam sewa lapangan', description: 'Akhir pekan, bawa kartu akses', valueLabel: 'GRATIS', code: `${pfx}-SWIM2`, validUntil: '2026-11-30', stock: 70, tone: 'blue' },
      { id: `VC-${projectId}-3`, projectId, partner: projectId === 'vh' ? 'Dapur Bu Rini' : 'Toko Kelontong Berkah', category: 'kuliner', title: projectId === 'vh' ? 'Potongan katering mingguan' : 'Potongan belanja sembako', description: 'Langganan min. 5 hari', valueLabel: 'Rp15rb', code: `${pfx}-RINI15`, validUntil: '2026-12-15', stock: 12, tone: 'yellow' },
      { id: `VC-${projectId}-4`, projectId, partner: 'Toko Bangunan Jaya', category: 'renovasi', title: 'Diskon material renovasi', description: 'Berlaku dengan izin renovasi aktif', valueLabel: '5%', code: `${pfx}-JAYA5`, validUntil: '2027-01-31', stock: 50, tone: 'grey' },
    );
  }
  d.voucherClaims.push({ id: next('CLM'), voucherId: 'VC-vh-1', holder: 'owner:1107', code: 'VH-KOPI10-4821', claimedAt: ts('2026-11-01', '08:00') });

  // Gardening, finance -----------------------------------------------------------
  const zones: [string, number, string][] = [
    ['Taman gerbang', 1500, '2026-11-06'], ['Jalur hijau Blok A', 2000, '2026-11-02'], ['Jalur hijau Blok B', 2500, '2026-10-26'],
    ['Jalur hijau Blok C', 2000, '2026-11-03'], ['Sekitar kolam & clubhouse', 1800, '2026-10-06'], ['Taman bermain', 1200, '2026-11-07'],
  ];
  zones.forEach(([name, area, lastCut], i) => d.zones.push({ id: `zone-${i + 1}`, projectId: 'vh', name, area, perMonth: 2, lastCut }));
  d.machines.push({ id: 'mesin-1', projectId: 'vh', name: 'Mesin potong #1', hours: 412, status: 'baik' }, { id: 'mesin-2', projectId: 'vh', name: 'Mesin potong #2', hours: 388, status: 'servis' });

  const monthTotals: Record<string, number> = { '2026-05': 16500000, '2026-06': 17200000, '2026-07': 17800000, '2026-08': 18400000, '2026-09': 18600000 };
  const octVh: [ExpenseCategory, number, string, string, boolean][] = [
    ['satpam', 9000000, '2026-10-01', 'Kontrak PT Garda Prima · 6 personel', true],
    ['tukangTaman', 2600000, '2026-10-01', 'Gaji tukang taman', true],
    ['listrik', 1800000, '2026-10-02', 'Tagihan PLN area umum', true],
    ['listrik', 400000, '2026-10-12', 'Token lampu jalan', false],
    ['listrik', 200000, '2026-10-23', 'Token pompa kolam', false],
    ['kolamRenang', 1250000, '2026-10-01', 'Kontrak perawatan kolam', true],
    ['kolamRenang', 250000, '2026-10-20', 'Kaporit & pH', false],
    ['angkutSampah', 1200000, '2026-10-01', 'Kontrak angkut sampah', true],
    ['landscape', 650000, '2026-10-05', 'Tanaman pengganti', false],
    ['landscape', 350000, '2026-10-21', 'Pupuk & bibit', false],
    ['clubhouse', 650000, '2026-10-08', 'Kebersihan clubhouse', false],
    ['clubhouse', 150000, '2026-10-22', 'Ganti lampu gerbang utama', false],
  ];
  const expense = (projectId: string, category: ExpenseCategory, date: string, amount: number, note: string, recurring: boolean): Expense =>
    ({ id: next('EXP'), projectId, category, date, amount, note, recurring, source: 'manual' });
  for (const [m, total] of Object.entries(monthTotals)) {
    const scale = (total - 9000000) / 9900000;
    for (const [cat, amount, date, note, recurring] of octVh) {
      const amt = cat === 'satpam' ? amount : Math.round((amount * scale) / 1000) * 1000;
      const extra = cat === 'tukangTaman' ? Math.round((400000 * scale) / 1000) * 1000 : 0;
      d.expenses.push(expense('vh', cat, `${m}${date.slice(7)}`, amt + extra, note, recurring));
    }
  }
  for (const [cat, amount, date, note, recurring] of octVh) d.expenses.push(expense('vh', cat, date, amount, note, recurring));
  d.expenses.push(expense('vh', 'satpam', '2026-11-01', 9000000, 'Kontrak PT Garda Prima · 6 personel', true));
  d.expenses.push(expense('vh', 'tukangTaman', '2026-11-01', 2600000, 'Gaji tukang taman', true));
  for (const m of ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']) {
    d.expenses.push(expense('hp', 'satpam', `${m}-01`, 12000000, 'Kontrak satpam · 8 personel', true));
    d.expenses.push(expense('hp', 'tukangTaman', `${m}-01`, 3500000, 'Gaji 2 tukang taman', true));
    if (m !== '2026-11') {
      d.expenses.push(expense('hp', 'listrik', `${m}-03`, 2400000 + int(r, 0, 3) * 50000, 'Tagihan PLN area umum', true));
      d.expenses.push(expense('hp', 'angkutSampah', `${m}-01`, 2000000, 'Kontrak angkut sampah', true));
      d.expenses.push(expense('hp', 'landscape', `${m}-15`, 600000 + int(r, 0, 6) * 50000, 'Tanaman & pupuk', false));
    }
  }

  // Seeded notifications so bells are not empty.
  d.notifications.push(
    { id: next('N'), to: 'owner:1107', text: { key: 'notif.iplOverdue', params: { unit: 'A1/07', n: 2 } }, link: '/app/bills', createdAt: ts('2026-11-01', '08:00'), read: false },
    { id: next('N'), to: 'owner:1107', text: { key: 'notif.feedbackReplied' }, link: '/app/feedback', createdAt: ts('2026-10-22', '09:30'), read: true },
    { id: next('N'), to: 'owner:1102', text: { key: 'notif.bastSigned', params: { unit: 'B1/02' } }, link: '/app/handover', createdAt: ts('2026-10-26', '10:30'), read: false },
    { id: next('N'), to: 'renter:r-1', text: { key: 'notif.leaseEnding', params: { date: '30 Nov 2026' } }, link: '/app/account', createdAt: ts('2026-11-01', '08:00'), read: false },
  );

  seedGarden(d, next);
  syncAllBills(d);
  return d;
}

function legalFor(r: Rng, u: Unit, scheme: 'KPR' | 'cash'): LegalStatus {
  const bast = u.handover.bastDate!;
  const kpr = scheme === 'KPR';
  if (u.id === 'vh-B1-02') {
    return {
      scheme: 'KPR', bank: 'Bank BTN',
      certificate: { status: 'atBank', number: 'SHGB 04.21.10.02.1.0412', steps: [{ key: 'submitted', date: '2026-09-02' }, { key: 'titleTransferred', date: '2026-10-20' }, { key: 'atBank', date: '2026-10-24' }] },
      pbg: { status: 'atBank', number: 'PBG-3216-0412-2026', steps: [{ key: 'issued', date: '2026-10-02' }, { key: 'atBank', date: '2026-10-22' }] },
      pbb: { status: 'ready', number: 'NOP 32.16.090.004.012-0412.0', steps: [{ key: 'issued', date: '2026-10-15' }, { key: 'readyForPickup' }] },
    };
  }
  const late = bast > '2026-09-01';
  return {
    scheme, bank: kpr ? pick(r, ['Bank BTN', 'Bank Mandiri', 'BRI', 'BCA']) : undefined,
    certificate: kpr
      ? { status: late ? 'process' : 'atBank', steps: [{ key: 'submitted', date: addDays(bast, -40) }, ...(late ? [] : [{ key: 'titleTransferred', date: addDays(bast, 20) }, { key: 'atBank', date: addDays(bast, 25) }])] }
      : { status: late ? 'process' : 'withCustomer', steps: [{ key: 'submitted', date: addDays(bast, -40) }, ...(late ? [] : [{ key: 'titleTransferred', date: addDays(bast, 20) }, { key: 'pickedUp', date: addDays(bast, 30) }])] },
    pbg: { status: kpr ? 'atBank' : 'withCustomer', steps: [{ key: 'issued', date: addDays(bast, -20) }, { key: kpr ? 'atBank' : 'pickedUp', date: addDays(bast, 10) }] },
    pbb: { status: late ? 'ready' : 'withCustomer', steps: [{ key: 'issued', date: addDays(bast, 5) }, { key: late ? 'readyForPickup' : 'pickedUp', date: late ? undefined : addDays(bast, 15) }] },
  };
}
