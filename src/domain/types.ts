// Single source of truth for every entity in the VHome prototype.
export type ISODate = string;
export type ISODateTime = string;
export type MonthKey = string; // 'YYYY-MM'
export type Segment = 'komersil' | 'subsidi';
export type Lang = 'id' | 'en';
export type I18nText = { key: string; params?: Record<string, string | number> };

export type FeatureKey =
  | 'renterRegistration' | 'houseListings' | 'panic' | 'cctv' | 'legal' | 'projects' | 'handbook'
  | 'vouchers' | 'marketplace' | 'businesses' | 'feedback' | 'wifi' | 'prepay';
export type ResidentFeature = FeatureKey | 'handover' | 'rules' | 'moveIn' | 'bills' | 'cards' | 'renovation' | 'complaint';
export type RoomId =
  | 'teras' | 'carport' | 'ruangTamu' | 'ruangKeluarga' | 'dapur' | 'kamarUtama' | 'kamar2' | 'kamar3'
  | 'kamarMandi' | 'kamarMandi2' | 'taman';
export type ComplaintCategory = 'kebocoran' | 'retak' | 'cat' | 'keramik' | 'pintuJendela' | 'listrik' | 'pipa' | 'plafonAtap' | 'lainnya';
export type ExpenseCategory = 'satpam' | 'tukangTaman' | 'listrik' | 'kolamRenang' | 'angkutSampah' | 'landscape' | 'clubhouse' | 'lainnya';

export interface WifiPackage { id: string; name: string; mbps: number; price: number; popular?: boolean }
export interface PrepayPackage { id: string; months: number; discountType: 'none' | 'percent' | 'freeMonths'; value: number; active: boolean }
export interface ProjectSettings {
  ipl: { freeEnabled: boolean; freeMonths: number; dueDay: number };
  wifi: { promoEnabled: boolean; freeMonths: number; packages: WifiPackage[] };
  prepay: { ipl: PrepayPackage[]; wifi: PrepayPackage[]; validUntil: ISODate; noArrearsOnly: boolean };
  cards: { freeCards: number; freeStickers: number; extraStickerPrice: number; extraCardPrice: number; maxExtraCards: number };
  complaints: { windowDays: number; slaDays: Record<ComplaintCategory, number> };
  handover: { intervalDays: number; maxCalls: number; autoBast: boolean };
  renovation: { deposit: number; checklist: string[] };
  overdue: { flagMonths: number; offered: Consequence['type'][] };
  fuel: { litersPer1000m2: number; tolerancePct: number };
  budget: Record<ExpenseCategory, number>;
  features: Record<FeatureKey, boolean>;
}
export interface Project { id: string; vlesProjectId: number; name: string; location: string; segment: Segment; businessGroup: 'Vista' | 'Harmoni Park'; settings: ProjectSettings }
export interface UnitType { id: string; vlesTypeId: number; projectId: string; name: string; landSize: number; buildingSize: number; rooms: RoomId[]; iplRate: number }

export type Occupancy = 'notReady' | 'readyForHandover' | 'handedOver' | 'occupied';
export interface HandoverCall { n: 1 | 2 | 3; sentAt: ISODate; readAt?: ISODate; channels: ('app' | 'wa' | 'letter')[] }
export interface HandoverChecklist { frontKeys: number; backKeys: number; roomKeys: number; accessCards: number; stickers: number; handbook: number; meterElectric: string; meterWater: string; gift: boolean }
export interface Consequence { id: string; type: 'cardSuspended' | 'garbageStopped' | 'warningLetter'; startedAt: ISODate; endedAt?: ISODate; by: string; note?: string }
export interface LegalDoc { status: 'process' | 'atBank' | 'ready' | 'withCustomer'; number?: string; steps: { key: string; date?: ISODate }[] }
export interface LegalStatus { scheme: 'KPR' | 'cash'; bank?: string; certificate: LegalDoc; pbg: LegalDoc; pbb: LegalDoc & { pickup?: { date: ISODate } } }
export interface Unit {
  id: string; vlesUnitId: number; code: string; projectId: string; typeId: string; ownerCustomerId?: number; akadDate?: ISODate;
  handover: { readySince?: ISODate; calls: HandoverCall[]; slot?: { date: ISODate; time: string }; checklist?: HandoverChecklist; receiptSentAt?: ISODate; bastDate?: ISODate; bastSource?: 'signed' | 'auto' };
  appActivatedAt?: ISODate;
  rules?: { signedAt: ISODateTime; signaturePhotoId: string; version: string };
  moveIn?: { date: ISODate; source: 'security' | 'app' | 'estate' };
  selfReportedMoveIn?: ISODate;
  occupancy: Occupancy;
  renterId?: string;
  legal?: LegalStatus;
  consequences: Consequence[];
}

export interface Customer { customer_id: number; no_ktp: string; no_npwp: string | null; no_hp: string; name: string; email: string }
export interface VlesTransaction { id: number; customer_id: number; unit_id: number; status: 'active' | 'cancelled'; akad_date: ISODate; payment_scheme: 'KPR' | 'cash' }
export interface VlesUnit { id: number; project_id: number; code: string; unit_type_id: number; sales_category: Segment; business_group_label: 'Vista' | 'Harmoni Park'; active_transaction_id: number | null; deleted: boolean; updated_at: ISODateTime }
export interface VlesUnitType { id: number; project_id: number; name: string; land_size: number; building_size: number; sales_category: Segment; deleted: boolean; updated_at: ISODateTime }

export interface Vehicle { type: 'mobil' | 'motor'; plate: string }
export interface Renter { id: string; unitId: string; ownerCustomerId: number; name: string; no_ktp: string; no_hp: string; householdSize: number; lease: { start: ISODate; end: ISODate }; iplPayer: 'owner' | 'renter'; movedInAt?: ISODate; rulesSignedAt?: ISODateTime; status: 'active' | 'ended' }
export interface RenterRegistration {
  id: string; unitId: string; ownerCustomerId: number; type: 'renter' | 'newOwner';
  person: { name: string; no_ktp: string; no_hp: string; householdSize: number };
  lease?: { start: ISODate; end: ISODate }; leaseDocPhotoId?: string; ajbDate?: ISODate; vehicles: Vehicle[];
  moveIn: { date: ISODate; time: string }; iplPayer: 'owner' | 'renter'; cards?: number; fee: number; feePaid: boolean;
  status: 'submitted' | 'needsFix' | 'approved' | 'rejected'; reviewNote?: string; createdAt: ISODateTime; renterId?: string;
}
export type ResidentIdentity = { kind: 'owner'; customerId: number } | { kind: 'renter'; renterId: string };
export interface Staff { id: string; role: 'security' | 'mandor' | 'gardener'; name: string; projectIds: string[]; company?: string; phone: string }
export interface Session {
  resident?: { identity: ResidentIdentity; unitId: string };
  staff?: { staffId: string };
  dashboard: { projectId: string; roleView: 'all' | 'estate' | 'contractor' | 'mandor' };
}

export interface Bill { id: string; unitId: string; kind: 'ipl' | 'wifi'; month: MonthKey; amount: number; free: boolean; payer: 'owner' | 'renter'; paymentId?: string }
export type BillStatus = 'free' | 'upcoming' | 'due' | 'paid' | 'overdue';
export interface Payment { id: string; unitId: string; kind: 'ipl' | 'wifi' | 'cards' | 'deposit' | 'registration'; months?: MonthKey[]; amount: number; discount: number; method: 'va' | 'qris' | 'transfer' | 'cash'; paidAt: ISODateTime; recordedBy: 'resident' | 'admin'; packageId?: string }
export interface WifiSub { unitId: string; packageId: string; installSlot: { date: ISODate; time: string }; status: 'requested' | 'scheduled' | 'installed'; installedAt?: ISODate; freeUntil?: MonthKey }
export interface CardOrder { id: string; unitId: string; freeCards: number; freeStickers: number; extraCards: number; extraStickers: number; vehicles: Vehicle[]; total: number; status: 'awaitingPayment' | 'toMake' | 'ready' | 'pickedUp'; createdAt: ISODateTime }
export interface MoveInPermit { id: string; unitId: string; who: 'owner' | 'renter'; renterId?: string; date: ISODate; time: '08.00–12.00' | '13.00–17.00'; vehicle: 'pickup' | 'trukEngkel' | 'trukBesar'; plate?: string; withWifi: boolean; status: 'approved' | 'entered' | 'cancelled'; enteredAt?: ISODateTime; enteredBy?: string }

export type RenovationStep = 'submitted' | 'ownerApproval' | 'estateReview' | 'awaitingDeposit' | 'inProgress' | 'inspection' | 'bastIssued' | 'bastSigned' | 'depositReturned' | 'rejected';
export interface Renovation {
  id: string; unitId: string; requestedBy: 'owner' | 'renter'; renterId?: string; title: string; description: string; drawingPhotoId?: string;
  step: RenovationStep; history: { step: RenovationStep; at: ISODateTime }[]; deposit: number; va: string; refundAccount?: string;
  inspection?: { checklist: Record<string, boolean>; result: 'full' | 'deduct'; deduction: number; reason?: string; photoIds: string[] };
  objection?: string;
}

export type FindingStage = 'draft' | 'submitted' | 'verified' | 'assigned' | 'inProgress' | 'workDone' | 'awaitingResident' | 'done' | 'rejected';
export interface AiResult { verdict: 'valid' | 'invalid' | 'unclear'; category: ComplaintCategory; confidence: number; noteKey: string; area?: { x: number; y: number; w: number; h: number } }
export interface FixCheck { verdict: 'fixed' | 'notFixed' | 'wrongArea'; confidence: number; noteKey: string; at: ISODateTime; photoId: string }
export interface Finding {
  id: string; room: RoomId; photoIds: string[]; photoHash?: string; description: string; ai: AiResult; manualReview: boolean; category: ComplaintCategory;
  estateNote?: string; groupId?: string; mandorId?: string; checklist: { label: string; done: boolean }[]; fixChecks: FixCheck[];
  stage: FindingStage; history: { stage: FindingStage; at: ISODateTime; by: string }[];
}
export interface Complaint { id: string; unitId: string; createdAt: ISODateTime; submittedAt?: ISODateTime; findings: Finding[] }
export interface WorkGroup { id: string; projectId: string; category: ComplaintCategory; refs: { complaintId: string; findingId: string }[]; material: string; estimateDays: number; mandorId?: string; createdAt: ISODateTime }

export interface Feedback { id: string; unitId: string; from: ResidentIdentity; topic: 'saran' | 'kebersihan' | 'keamanan' | 'fasilitas' | 'lainnya'; text: string; photoId?: string; status: 'sent' | 'read' | 'replied'; reply?: string; createdAt: ISODateTime; repliedAt?: ISODateTime }
export interface Announcement { id: string; projectId: string; tag: 'jadwal' | 'info' | 'penting'; title: string; body: string; date: ISODate; createdAt: ISODateTime }
export interface Notification { id: string; to: string; text: I18nText; link?: string; createdAt: ISODateTime; read: boolean }
export interface PanicSignal { id: string; unitId: string; from: ResidentIdentity; type: 'medis' | 'kebakaran' | 'pencurian' | 'lainnya' | null; awayFromHome: boolean; createdAt: ISODateTime; acceptedAt?: ISODateTime; acceptedBy?: string; resolvedAt?: ISODateTime; outcome?: 'handled' | 'falseAlarm' | 'cancelled' }
export interface Business { id: string; projectId: string; name: string; category: 'kuliner' | 'jasa' | 'toko' | 'kesehatan' | 'pendidikan'; location: string; description: string; whatsapp: string; open: boolean; hasVoucher: boolean; ownerUnitId?: string; status: 'pending' | 'verified' }
export interface Listing { id: string; projectId: string; unitId: string; kind: 'dijual' | 'dicari' | 'jasa' | 'info' | 'rumahDisewakan' | 'rumahDijual'; title: string; price?: number; priceUnit?: 'once' | 'month' | 'year'; description: string; photoIds: string[]; createdAt: ISODateTime; replies: number; reported: boolean }
export interface Lead {
  id: string; projectId: string; name: string; whatsapp: string; interest: 'sewa' | 'beli';
  source: { kind: 'listing'; listingId: string } | { kind: 'project'; projectName: string };
  domicile: string; plan: 'bulanIni' | '1-3bulan' | '>3bulan'; status: 'baru' | 'dihubungi' | 'survei' | 'deal' | 'batal'; pic: string; consentAt: ISODateTime; createdAt: ISODateTime;
}
export interface Voucher { id: string; projectId: string; partner: string; category: string; title: string; description: string; valueLabel: string; code: string; validUntil: ISODate; stock: number; tone: 'orange' | 'blue' | 'yellow' | 'grey' }
export interface VoucherClaim { id: string; voucherId: string; holder: string; code: string; claimedAt: ISODateTime; usedAt?: ISODateTime }

export interface Zone { id: string; projectId: string; name: string; area: number; perMonth: number; lastCut?: ISODate }
export interface Machine { id: string; projectId: string; name: string; hours: number; status: 'baik' | 'servis' }
export interface MowingLog { id: string; zoneId: string; gardenerId: string; machineId: string; date: ISODate; start: string; end: string; area: number; beforePhotoId: string; afterPhotoId: string; fuelUsed: number; status: 'pending' | 'approved' | 'rephoto'; note?: string }
export interface FuelEntry { id: string; projectId: string; gardenerId: string; kind: 'buy' | 'refill' | 'check'; liters: number; amount?: number; machineId?: string; receiptPhotoId?: string; source?: 'kasKecil' | 'pribadi'; at: ISODateTime }
export interface Attendance { id: string; gardenerId: string; date: ISODate; at: ISODateTime; selfiePhotoId: string }
export interface Expense { id: string; projectId: string; category: ExpenseCategory; date: ISODate; amount: number; note: string; receiptPhotoId?: string; recurring: boolean; source?: 'fuel' | 'manual' }
export interface ActivityLog { id: string; projectId: string; at: ISODateTime; by: string; text: I18nText }

export interface AppData {
  version: number; today: ISODate; seq: Record<string, number>; session: Session;
  vles: { customers: Customer[]; transactions: VlesTransaction[]; units: VlesUnit[]; unitTypes: VlesUnitType[] };
  projects: Project[]; unitTypes: UnitType[]; units: Unit[]; renters: Renter[]; registrations: RenterRegistration[]; staff: Staff[];
  bills: Bill[]; payments: Payment[]; wifi: WifiSub[]; cardOrders: CardOrder[]; moveIns: MoveInPermit[];
  renovations: Renovation[]; complaints: Complaint[]; workGroups: WorkGroup[];
  feedback: Feedback[]; announcements: Announcement[]; notifications: Notification[]; panics: PanicSignal[];
  businesses: Business[]; listings: Listing[]; leads: Lead[]; vouchers: Voucher[]; voucherClaims: VoucherClaim[];
  zones: Zone[]; machines: Machine[]; mowingLogs: MowingLog[]; fuel: FuelEntry[]; attendance: Attendance[]; expenses: Expense[]; activity: ActivityLog[];
}
