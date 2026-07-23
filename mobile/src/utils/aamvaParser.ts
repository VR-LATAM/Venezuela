// Diseñado por: Edward Labrador
// Para: ELITE GROUP - Integral Services LLC
// ═══════════════════════════════════════════════════════════════
// Parser AAMVA — extrae datos de licencias de conducir de EE.UU.
// El código de barras PDF417 en el dorso de la licencia sigue el
// estándar AAMVA (American Association of Motor Vehicle Administrators)
// ═══════════════════════════════════════════════════════════════

export interface AAMVAData {
  firstName?:     string;
  middleName?:    string;
  lastName?:      string;
  fullName?:      string;
  dateOfBirth?:   string; // MM/DD/YYYY
  licenseNumber?: string;
  expiryDate?:    string; // MM/YYYY
  address?:       string;
  city?:          string;
  state?:         string;
  zip?:           string;
}

// Convierte MMDDYYYY → MM/DD/YYYY
function formatDate(raw: string): string {
  if (!raw || raw.length < 8) return raw;
  return `${raw.slice(0, 2)}/${raw.slice(2, 4)}/${raw.slice(4, 8)}`;
}

// Convierte MMDDYYYY → MM/YYYY (para fecha de vencimiento)
function formatExpiry(raw: string): string {
  if (!raw || raw.length < 8) return raw;
  return `${raw.slice(0, 2)}/${raw.slice(4, 8)}`;
}

// Extrae el valor de un campo AAMVA de 3 letras
function getField(data: string, code: string): string {
  const lines = data.split(/[\n\r]/);
  for (const line of lines) {
    if (line.startsWith(code)) {
      return line.slice(code.length).trim();
    }
  }
  return '';
}

export function parseAAMVA(raw: string): AAMVAData | null {
  try {
    if (!raw || !raw.includes('ANSI') && !raw.includes('AAMVA')) return null;

    const firstName  = getField(raw, 'DAC') || getField(raw, 'DCT');
    const middleName = getField(raw, 'DAD');
    const lastName   = getField(raw, 'DCS') || getField(raw, 'DCU');
    const dob        = getField(raw, 'DBB') || getField(raw, 'DBN');
    const expiry     = getField(raw, 'DBA');
    const license    = getField(raw, 'DAQ');
    const address    = getField(raw, 'DAG');
    const city       = getField(raw, 'DAI');
    const state      = getField(raw, 'DAJ');
    const zip        = getField(raw, 'DAK');

    const parts = [firstName, middleName, lastName].filter(Boolean);
    const fullName = parts.join(' ');

    return {
      firstName:     firstName   || undefined,
      middleName:    middleName  || undefined,
      lastName:      lastName    || undefined,
      fullName:      fullName    || undefined,
      dateOfBirth:   dob    ? formatDate(dob)    : undefined,
      licenseNumber: license     || undefined,
      expiryDate:    expiry ? formatExpiry(expiry) : undefined,
      address:       address     || undefined,
      city:          city        || undefined,
      state:         state       || undefined,
      zip:           zip?.slice(0, 5) || undefined,
    };
  } catch {
    return null;
  }
}
