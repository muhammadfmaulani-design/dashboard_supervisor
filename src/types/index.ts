export interface Karyawan {
  id?: number;
  badge_number: string;
  nama: string;
  kode_shift: string;
  role: string;
  is_absen?: boolean;
  is_delegated?: boolean;
  data_delegasi?: any;
}

export interface Supervisor {
  badge_number: string;
  nama: string;
  group: string;
  role?: string;
}