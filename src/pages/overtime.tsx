import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  Calendar, 
  Search, 
  User as UserIcon, 
  Plus, 
  CheckCircle2, 
  Clock, 
  X, 
  Loader2,
  ChevronRight
} from 'lucide-react';

interface Supervisor {
  group: string;
  badge_number: string;
}

const OvertimePage = ({ supervisor }: { supervisor: Supervisor }) => {
  // --- STATE UTAMA ---
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toLocaleDateString('en-CA') // Format YYYY-MM-DD
  );
  const [overtimeList, setOvertimeList] = useState<any[]>([]);

  // --- STATE MODAL PILIH KARYAWAN ---
  const [showKaryawanModal, setShowKaryawanModal] = useState<boolean>(false);
  const [isFetchingKaryawan, setIsFetchingKaryawan] = useState<boolean>(false);
  const [karyawanList, setKaryawanList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // --- STATE MODAL INPUT OT ---
  const [showInputModal, setShowInputModal] = useState<boolean>(false);
  const [activeKaryawan, setActiveKaryawan] = useState<any>(null);
  const [isDayOff, setIsDayOff] = useState<boolean>(false);
  const [selectedJam, setSelectedJam] = useState<number>(1);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  
  // REVISI: State untuk menyimpan shift aktual yang akan di-insert
  const [shiftAktual, setShiftAktual] = useState<string>("-");

  useEffect(() => {
    fetchOvertimeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchOvertimeData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('overtime')
        .select('*')
        .eq('tanggal_shift', selectedDate)
        .eq('is_ekstra', true)
        .eq('spv_badge', supervisor.badge_number)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOvertimeList(data || []);
    } catch (e: any) {
      alert("Gagal memuat data: " + (e.message || e));
    } finally {
      setIsLoading(false);
    }
  };

  const handleBukaPilihKaryawan = async () => {
    setIsFetchingKaryawan(true);
    setShowKaryawanModal(true);
    
    try {
      const { data, error } = await supabase
        .from('karyawan')
        .select('badge_number, nama, kode_shift')
        .in('role', ['EMP', 'SPV'])
        .order('nama');

      if (error) throw error;
      setKaryawanList(data || []);
    } catch (e: any) {
      alert("Gagal mengambil data karyawan: " + (e.message || e));
      setShowKaryawanModal(false);
    } finally {
      setIsFetchingKaryawan(false);
    }
  };

  const cekJadwalDanBukaInput = async (karyawan: any) => {
    setIsFetchingKaryawan(true);
    try {
      const grupId = (karyawan.kode_shift || '').toString().trim();

      const { data: res, error } = await supabase
        .from('kalender_shift')
        .select('shift_code')
        .eq('group_id', grupId)
        .eq('shift_date', selectedDate)
        .maybeSingle();

      if (error) throw error;

      let isOff = false;
      let currentShift = "-"; // Default

      if (res && res.shift_code) {
        currentShift = res.shift_code.toString().trim();
        if (currentShift.toUpperCase() === 'O') isOff = true;
      } else {
        currentShift = "OFF";
        isOff = true; // Anggap libur kalau tidak ada jadwal
      }

      setActiveKaryawan(karyawan);
      setIsDayOff(isOff);
      setShiftAktual(currentShift); // REVISI: Simpan kode shift untuk payload Insert
      setSelectedJam(isOff ? 8 : 4);
      
      setShowKaryawanModal(false);
      setShowInputModal(true);
    } catch (e: any) {
      alert("Gagal verifikasi jadwal shift: " + (e.message || e));
    } finally {
      setIsFetchingKaryawan(false);
    }
  };

  const simpanOvertime = async () => {
    if (!activeKaryawan) return;
    setIsSaving(true);
    
    try {
      const { error } = await supabase.from('overtime').insert({
        badge_number: activeKaryawan.badge_number,
        nama_karyawan: activeKaryawan.nama,
        tanggal_shift: selectedDate,
        shift_aktual: shiftAktual, // REVISI: Masukkan ke database agar tidak error Not Null
        jam_ot: selectedJam,
        is_ekstra: true,
        status_kehadiran: 'Hadir',
        spv_badge: supervisor.badge_number,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      alert("Overtime berhasil ditambahkan!");
      setShowInputModal(false);
      fetchOvertimeData();
    } catch (e: any) {
      alert("Gagal menyimpan: " + (e.message || e));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredKaryawan = karyawanList.filter(k => 
    k.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    k.badge_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans relative">
      {/* APP BAR */}
      <div className="bg-orange-600 p-4 text-white shadow-md flex items-center justify-center">
        <h1 className="text-lg font-bold">Input Overtime</h1>
      </div>

      {/* TANGGAL SELECTOR */}
      <div className="bg-white p-4 flex justify-between items-center shadow-sm">
        <div>
          <p className="text-xs font-bold text-gray-400">Tanggal Overtime</p>
          <p className="text-lg font-black text-gray-800 mt-1">{selectedDate}</p>
        </div>
        <div className="relative">
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <button className="flex items-center gap-2 px-4 py-2 border-2 border-orange-100 rounded-xl text-orange-600 font-bold text-xs hover:bg-orange-50 transition-colors pointer-events-none">
            <Calendar size={16} /> UBAH TANGGAL
          </button>
        </div>
      </div>

      {/* LIST OVERTIME */}
      <div className="p-4 max-w-4xl mx-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mb-2 text-orange-600" size={32} />
          </div>
        ) : overtimeList.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-medium">
            Belum ada data Overtime di tanggal ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {overtimeList.map((data, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{data.nama_karyawan || '-'}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {data.badge_number} • OT: <span className="font-bold text-orange-600">{data.jam_ot} Jam</span>
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="text-green-500" size={24} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FLOATING ACTION BUTTON */}
      <button 
        onClick={handleBukaPilihKaryawan}
        className="fixed bottom-6 right-6 bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-2xl shadow-xl font-bold flex items-center gap-2 transition-transform active:scale-95 z-30"
      >
        <Plus size={20} /> <span className="text-sm">INPUT OVERTIME</span>
      </button>

      {/* MODAL 1: PILIH KARYAWAN */}
      {showKaryawanModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl flex flex-col h-[80vh] md:h-[600px] overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
              <h2 className="font-bold text-lg text-gray-800">Pilih Karyawan</h2>
              <X className="cursor-pointer text-gray-400 hover:text-gray-600" onClick={() => setShowKaryawanModal(false)} />
            </div>
            
            <div className="p-4 bg-gray-50 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Cari nama atau badge..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white">
              {isFetchingKaryawan && karyawanList.length === 0 ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-600" size={30} /></div>
              ) : filteredKaryawan.length === 0 ? (
                <div className="text-center py-10 text-gray-500">Karyawan tidak ditemukan.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredKaryawan.map((k, i) => (
                    <div 
                      key={i} 
                      onClick={() => cekJadwalDanBukaInput(k)}
                      className="p-4 flex items-center justify-between hover:bg-orange-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-gray-800">{k.nama}</p>
                          <p className="text-xs text-gray-500">{k.badge_number}</p>
                        </div>
                      </div>
                      {isFetchingKaryawan ? (
                        <Loader2 className="animate-spin text-gray-300" size={18} />
                      ) : (
                        <ChevronRight size={18} className="text-gray-300" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: INPUT JAM OT */}
      {showInputModal && activeKaryawan && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="font-bold text-gray-800 text-lg mb-5">
                {isDayOff ? "Input OT (Day Off)" : "Input OT (Masuk Shift)"}
              </h3>
              
              <div className={`p-4 rounded-2xl mb-6 border ${isDayOff ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                <p className={`font-bold text-base ${isDayOff ? 'text-green-800' : 'text-blue-800'}`}>
                  {activeKaryawan.nama}
                </p>
                <p className={`text-xs font-bold mt-1 ${isDayOff ? 'text-green-700' : 'text-blue-700'}`}>
                  Shift: {shiftAktual} | {isDayOff ? 'Max 8 Jam' : 'Max 4 Jam'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Jumlah Jam OT</label>
                <select 
                  value={selectedJam} 
                  onChange={(e) => setSelectedJam(parseInt(e.target.value))}
                  className="w-full p-4 rounded-xl bg-orange-50 border-none ring-1 ring-orange-200 text-orange-900 font-bold outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {Array.from({ length: isDayOff ? 8 : 4 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>{num} Jam</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
              <button 
                onClick={() => setShowInputModal(false)}
                disabled={isSaving}
                className="flex-1 py-3 text-gray-500 font-bold text-sm hover:bg-gray-200 rounded-xl transition-colors"
              >
                BATAL
              </button>
              <button 
                onClick={simpanOvertime}
                disabled={isSaving}
                className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-orange-700 transition-colors flex justify-center items-center"
              >
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : "SIMPAN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimePage;