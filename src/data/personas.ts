/** Demo logins shown on the launcher and the login screen. */
export interface ResidentPersona { key: string; name: string; unit: string; projectId: 'vh' | 'hp'; phone: string; ktp: string; role: 'owner' | 'renter'; scenarioKey: string }
export const RESIDENT_PERSONAS: ResidentPersona[] = [
  { key: '1102', name: 'Rina Wijaya', unit: 'B1/02', projectId: 'vh', phone: '0812-3456-0102', ktp: '3275014101900001', role: 'owner', scenarioKey: 'persona.rina' },
  { key: '1107', name: 'Andi Pratama', unit: 'A1/07 · A3/05', projectId: 'vh', phone: '0812-3456-0107', ktp: '3275011203850002', role: 'owner', scenarioKey: 'persona.andi' },
  { key: 'r-1', name: 'Sari Lestari', unit: 'B2/04', projectId: 'vh', phone: '0812-9876-0204', ktp: '3275016607950004', role: 'renter', scenarioKey: 'persona.sari' },
  { key: '2314', name: 'Joko Susilo', unit: 'C3/14', projectId: 'hp', phone: '0857-1234-0314', ktp: '3216031508880005', role: 'owner', scenarioKey: 'persona.joko' },
  { key: '2203', name: 'Siti Aminah', unit: 'A2/03', projectId: 'hp', phone: '0857-1234-0203', ktp: '3216034409900006', role: 'owner', scenarioKey: 'persona.siti' },
];
export const STAFF_PERSONAS = [
  { id: 'st-sec', name: 'Pak Dedi', roleKey: 'role.security', scenarioKey: 'persona.security' },
  { id: 'st-mandor', name: 'Mandor Hasan', roleKey: 'role.mandor', scenarioKey: 'persona.mandor' },
  { id: 'st-garden', name: 'Ujang', roleKey: 'role.gardener', scenarioKey: 'persona.gardener' },
] as const;
