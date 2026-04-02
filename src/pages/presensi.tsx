import { CheckCircle2, Edit, Edit3, Loader2, Lock, Save, User as UserIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom'; // IMPORT INI DITAMBAHKAN
import { supabase } from '../utils/supabase';

interface Supervisor {
  group: string;
  badge_number: string;
}

interface HariKalender {
  tanggal: string;
  hari: string;
  is_today: boolean;
  is_locked: boolean;
}

interface Karyawan {
  badge_number: string;
  nama: string;
  role: string;
  is_delegated?: boolean;
  is_absen?: boolean;
  data_absen?: any;
  data_delegasi?: any;
}

const PresensiPage = ({ supervisor }: { supervisor: Supervisor }) => {
  const location = useLocation(); // MENANGKAP STATE DARI HALAMAN SEBELUMNYA

  const [isLoadingInit, setIsLoadingInit] = useState<boolean>(true);
  const [isLoadingHarian, setIsLoadingHarian] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [kalenderMingguan, setKalenderMingguan] = useState<HariKalender[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isSelectedLocked, setIsSelectedLocked] = useState<boolean>(false);

  const [shiftCode, setShiftCode] = useState<string>("-");
  const [anggotaTim, setAnggotaTim] = useState<Karyawan[]>([]);
  const [pertanyaanFTW, setPertanyaanFTW] = useState<any[]>([]);

  const [unsavedData, setUnsavedData] = useState<Record<string, any>>({});
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  const [ftwModalOpen, setFtwModalOpen] = useState<boolean>(false);
  const [activeKaryawan, setActiveKaryawan] = useState<Karyawan | null>(null);
  const [ftwAnswers, setFtwAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (supervisor) {
      initData();
    }
  }, [supervisor]);

  useEffect(() => {
    if (selectedDate && !isLoadingInit) {
      fetchDataHarian();
    }
  }, [selectedDate]);

  const initData = async () => {
    setIsLoadingInit(true);
    try {
      const { data: ftwData } = await supabase.from('daily_fit_to_work').select('*').order('id_ftw', { ascending: true });
      setPertanyaanFTW(ftwData || []);

      const dNow = new Date();
      const tempKalender: HariKalender[] = [];
      const namaHariArr = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
      
      let defaultDateStr = "";

      // Di dalam fungsi initData
      for (let i = -3; i <= 3; i++) {
        const d = new Date(dNow);
        d.setDate(d.getDate() + i);
        
        // Standarisasi string tanggal (YYYY-MM-DD)
        const tzOffset = d.getTimezoneOffset() * 60000;
        const tglStr = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
        
        const isToday = i === 0;
        if (isToday) defaultDateStr = tglStr;

        tempKalender.push({
          tanggal: tglStr,
          hari: namaHariArr[d.getDay()],
          is_today: isToday,
          is_locked: i < -2 || i > 0 
        });
      }
      
      setKalenderMingguan(tempKalender);

      // PERBAIKAN: Gunakan tanggal dari location.state jika ada (lemparan dari oper presensi)
      const targetDate = location.state?.targetDate || defaultDateStr;
      setSelectedDate(targetDate);
      setIsSelectedLocked(tempKalender.find(k => k.tanggal === targetDate)?.is_locked || false);

    } catch (e: any) {
      alert("Gagal memuat data awal: " + (e.message || e));
    } finally {
      setIsLoadingInit(false);
    }
  };

  const fetchDataHarian = async () => {
    setIsLoadingHarian(true);
    setUnsavedData({});
    setIsEditMode(false);

    try {
      // PERBAIKAN: Tarik data presensi_delegasi sekaligus untuk dijadikan draft otomatis
      const [resJadwal, resKaryawan, resPresensi, resDelegasi] = await Promise.all([
        supabase.from('kalender_shift').select('shift_code').eq('group_id', supervisor.group).eq('shift_date', selectedDate).maybeSingle(),
        supabase.from('karyawan').select('*').eq('kode_shift', supervisor.group).in('role', ['EMP', 'SPV']),
        supabase.from('presensi').select('*').eq('tanggal_shift', selectedDate),
        supabase.from('presensi_delegasi').select('*').eq('tanggal_shift', selectedDate) // TARIK DRAFT FTW
      ]);

      const currentShift = resJadwal.data?.shift_code || "OFF";
      setShiftCode(currentShift);

      const presensiMap: Record<string, any> = {};
      resPresensi.data?.forEach((p: any) => { presensiMap[p.badge_number] = p; });

      const delegasiMap: Record<string, any> = {};
      resDelegasi.data?.forEach((d: any) => { delegasiMap[d.badge_number] = d; });

      const drafts: Record<string, any> = {};
      
      const members = (resKaryawan.data || []).map((k: any) => {
        const badge = k.badge_number;
        const pData = presensiMap[badge];
        const dData = delegasiMap[badge];
        const isAbsen = !!pData;
        const isDelegated = !!dData && !isAbsen;

        // PERBAIKAN: Jika ada di tabel delegasi tapi belum di presensi final, masukkan ke unsavedData otomatis
        if (isDelegated) {
          drafts[badge] = {
            badge_number: badge,
            nama_karyawan: k.nama,
            tanggal_shift: selectedDate,
            shift_aktual: currentShift,
            status_kehadiran: "Hadir",
            data_ftw: dData.data_ftw || {}, // Memasukkan jawaban FTW dari Man Power
          };
        }

        return {
          ...k,
          is_absen: isAbsen,
          is_delegated: isDelegated,
          data_absen: pData || null,
          data_delegasi: dData || null
        };
      });

      setUnsavedData(drafts);
      setAnggotaTim(members);

    } catch (e: any) {
      alert("Gagal memuat presensi: " + (e.message || e));
      setShiftCode("-");
      setAnggotaTim([]);
    } finally {
      setIsLoadingHarian(false);
    }
  };

  const bukaDialogFTW = (karyawan: Karyawan) => {
    setActiveKaryawan(karyawan);
    const badge = karyawan.badge_number;
    
    let savedFtw = null;
    if (unsavedData[badge]) {
      savedFtw = unsavedData[badge].data_ftw;
    } else if (karyawan.is_absen) {
      savedFtw = karyawan.data_absen?.data_ftw;
    }

    const initialAnswers: Record<string, boolean> = {};
    pertanyaanFTW.forEach((q: any) => {
      const key = `q${q.id_ftw}`;
      initialAnswers[key] = (savedFtw && savedFtw[key] !== undefined) ? savedFtw[key] : (q.id_ftw === 4); 
    });

    setFtwAnswers(initialAnswers);
    setFtwModalOpen(true);
  };

  const simpanDraftFTW = () => {
    if (!activeKaryawan) return;
    const badge = activeKaryawan.badge_number;
    
    setUnsavedData((prev: any) => ({
      ...prev,
      [badge]: {
        badge_number: badge,
        nama_karyawan: activeKaryawan.nama,
        tanggal_shift: selectedDate,
        shift_aktual: shiftCode,
        status_kehadiran: "Hadir",
        data_ftw: ftwAnswers,
      }
    }));
    
    setFtwModalOpen(false);
  };

  const konfirmasiPresensi = async () => {
    if (Object.keys(unsavedData).length === 0) return;

    setIsSubmitting(true);
    try {
      const batchData = Object.values(unsavedData);
      const isP1 = shiftCode.trim().toLowerCase() === 'p1';

      const presensiPayload = batchData.map((e: any) => ({
        badge_number: e.badge_number,
        tanggal_shift: e.tanggal_shift,
        shift_aktual: e.shift_aktual,
        status_kehadiran: e.status_kehadiran,
        data_ftw: e.data_ftw,
        waktu_submit: new Date().toISOString(),
      }));
      
      const { error: errPresensi } = await supabase.from('presensi').insert(presensiPayload);
      if (errPresensi) throw errPresensi;

      if (isP1) {
        const overtimePayload = batchData.map((e: any) => ({
          badge_number: e.badge_number,
          nama_karyawan: e.nama_karyawan,
          tanggal_shift: e.tanggal_shift,
          shift_aktual: e.shift_aktual,
          status_kehadiran: e.status_kehadiran,
          data_ftw: e.data_ftw,
          jam_ot: 8,
          is_ekstra: false,
          spv_badge: supervisor.badge_number,
          created_at: new Date().toISOString(),
        }));
        
        const { error: errOvertime } = await supabase.from('overtime').insert(overtimePayload);
        if (errOvertime) throw errOvertime;
      }

      // Opsional: Hapus draft dari presensi_delegasi setelah berhasil masuk presensi final agar tabel bersih
      const badgesToDelete = batchData.map((e:any) => e.badge_number);
      await supabase.from('presensi_delegasi').delete().in('badge_number', badgesToDelete).eq('tanggal_shift', selectedDate);

      alert(isP1 ? "Presensi Normal & Overtime P1 Berhasil Disimpan!" : "Seluruh Presensi Berhasil Disimpan!");
      
      // Clear location state agar tidak terus me-load ulang saat refresh
      window.history.replaceState({}, document.title)
      fetchDataHarian(); 
    } catch (e: any) {
      alert("Gagal menyimpan data: " + (e.message || e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasSavedData = anggotaTim.some((k: Karyawan) => k.is_absen === true);
  const isP1 = shiftCode.trim().toLowerCase() === 'p1';

  if (isLoadingInit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-600 mb-4" size={40} />
        <p className="text-gray-500 font-bold">Memuat kalender...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 font-sans bg-gray-50 relative">
      <div className="bg-white border-b border-gray-200 overflow-x-auto whitespace-nowrap p-3 flex gap-2">
        {kalenderMingguan.map((hari, idx) => {
          const isSelected = hari.tanggal === selectedDate;
          const tglAngka = hari.tanggal.split('-')[2];

          return (
            <button
              key={idx}
              disabled={hari.is_locked}
              onClick={() => {
                setSelectedDate(hari.tanggal);
                setIsSelectedLocked(hari.is_locked);
              }}
              className={`min-w-[70px] flex flex-col items-center p-3 rounded-2xl transition-all border ${
                isSelected ? 'bg-red-600 border-red-600 text-white shadow-md shadow-red-200' 
                : hari.is_locked ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' 
                : 'bg-white border-gray-200 text-gray-800 hover:border-red-300'
              }`}
            >
              <span className={`text-xs font-bold ${isSelected ? 'text-red-100' : 'text-gray-500'}`}>{hari.hari}</span>
              <span className="text-xl font-black mt-1">{tglAngka}</span>
              {hari.is_today && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-yellow-300' : 'bg-red-600'}`} />}
            </button>
          );
        })}
      </div>

      <div className={`p-4 transition-colors ${isP1 ? 'bg-yellow-400 text-red-900' : 'bg-red-50 text-red-900 border-b border-red-100'}`}>
        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <p className="text-sm md:text-base font-bold tracking-wide">
            TANGGAL: {selectedDate} &nbsp;|&nbsp; SHIFT: {shiftCode}
          </p>
          {isP1 && <p className="text-xs md:text-sm italic font-medium mt-1 opacity-80">SHIFT LEMBUR P1: Presensi juga akan masuk ke tabel Overtime (8 Jam)</p>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {isLoadingHarian ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="animate-spin mb-2 text-red-600" size={32} />
          </div>
        ) : shiftCode === "OFF" || shiftCode === "O" ? (
          <div className="text-center py-20 text-gray-500 font-bold">Grup Anda sedang Libur / OFF hari ini.</div>
        ) : anggotaTim.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-bold">Tidak ada data karyawan.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {anggotaTim.map((k: Karyawan) => {
              const badge = k.badge_number;
              const isAbsenServer = k.is_absen;
              const isDraftLocal = !!unsavedData[badge];

              let actionButton;
              if (isSelectedLocked) {
                actionButton = <Lock className="text-gray-300" size={24} />;
              } else if (isDraftLocal) {
                actionButton = (
                  <button onClick={() => bukaDialogFTW(k)} className="px-3 py-1.5 bg-yellow-50 text-yellow-700 font-bold text-xs rounded-lg flex items-center gap-1 border border-yellow-200">
                    <Edit3 size={14} /> SIAP KIRIM
                  </button>
                );
              } else if (isAbsenServer) {
                if (isEditMode) {
                  actionButton = (
                    <button onClick={() => bukaDialogFTW(k)} className="px-3 py-1.5 bg-orange-50 text-orange-700 font-bold text-xs rounded-lg flex items-center gap-1 border border-orange-200">
                      <Edit size={14} /> EDIT
                    </button>
                  );
                } else {
                  actionButton = <span className="text-xs font-bold text-green-600 flex items-center gap-1"><CheckCircle2 size={16} /> TERKIRIM</span>;
                }
              } else {
                actionButton = (
                  <button onClick={() => bukaDialogFTW(k)} className="px-3 py-1.5 bg-white text-red-600 font-bold text-xs rounded-lg flex items-center gap-1 border border-red-600 hover:bg-red-50 transition-colors">
                    ISI ABSEN
                  </button>
                );
              }

              return (
                <div key={badge} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isAbsenServer || isDraftLocal ? 'bg-green-100 text-green-600' : 'bg-red-50 text-red-300'}`}>
                      {isAbsenServer || isDraftLocal ? <CheckCircle2 size={24} /> : <UserIcon size={24} />}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm">{k.nama}</h3>
                      <p className="text-xs text-gray-500">{badge} • {k.role === 'EMP' ? 'Man Power' : k.role === 'SPV' ? 'Supervisor' : k.role}</p>
                    </div>
                  </div>
                  {actionButton}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {(!isLoadingInit && !isLoadingHarian && !isSelectedLocked && shiftCode !== "OFF" && shiftCode !== "O") && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-40">
          <div className="max-w-7xl mx-auto p-4 flex justify-end">
            {isSubmitting ? (
              <div className="w-full flex justify-center p-3"><Loader2 className="animate-spin text-red-600" size={30} /></div>
            ) : Object.keys(unsavedData).length > 0 ? (
              <button onClick={konfirmasiPresensi} className={`w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-colors ${isP1 ? 'bg-yellow-500 hover:bg-yellow-600 text-red-900' : 'bg-red-600 hover:bg-red-700'}`}>
                <Save size={20} /> KONFIRMASI {Object.keys(unsavedData).length} PRESENSI {isP1 ? '& P1' : ''}
              </button>
            ) : hasSavedData && !isEditMode ? (
              <button onClick={() => setIsEditMode(true)} className="w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-orange-600 bg-white border-2 border-orange-600 flex items-center justify-center gap-2 hover:bg-orange-50">
                <Lock className="rotate-12" size={20} /> EDIT PRESENSI
              </button>
            ) : isEditMode && Object.keys(unsavedData).length === 0 ? (
              <button onClick={() => setIsEditMode(false)} className="w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-gray-500 bg-white flex items-center justify-center gap-2 hover:bg-gray-50">
                <X size={20} /> BATAL EDIT
              </button>
            ) : null}
          </div>
        </div>
      )}

      {ftwModalOpen && activeKaryawan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-red-600 text-white font-bold flex justify-between items-center">
              <span>FTW: {activeKaryawan.nama}</span>
              <button onClick={() => setFtwModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
              {pertanyaanFTW.length === 0 ? (
                <p className="text-center text-gray-500 py-10">Memuat pertanyaan FTW...</p>
              ) : (
                <div className="space-y-2">
                  {pertanyaanFTW.map((q: any) => {
                    const k = `q${q.id_ftw}`;
                    const isChecked = ftwAnswers[k] || false;
                    return (
                      <label key={k} className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-red-300 transition-colors">
                        <span className="text-sm text-gray-700 font-medium pr-4">{q.pertanyaan}</span>
                        <input type="checkbox" checked={isChecked} onChange={(e) => setFtwAnswers({ ...ftwAnswers, [k]: e.target.checked })} className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500" />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-white">
              <button onClick={() => setFtwModalOpen(false)} className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg">BATAL</button>
              <button onClick={simpanDraftFTW} className="px-6 py-2 font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-md">SIMPAN DRAFT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresensiPage;