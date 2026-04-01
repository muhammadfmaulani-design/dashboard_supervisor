import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { 
  ShieldAlert, 
  RefreshCw, 
  Copy, 
  CalendarOff, 
  CheckCircle2, 
  FileClock, 
  Hourglass, 
  CloudDownload, 
  FileCheck2,
  Loader2
} from 'lucide-react';

interface Supervisor {
  group: string;
  badge_number: string;
}

interface HariKalender {
  tanggal: string;
  hari: string;
  is_today: boolean;
}

const OperPresensiPage = ({ supervisor }: { supervisor: Supervisor }) => {
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [kalenderDelegasi, setKalenderDelegasi] = useState<HariKalender[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [shiftCode, setShiftCode] = useState<string>("-");
  const [totalEmp, setTotalEmp] = useState<number>(0);
  const [delegatedCount, setDelegatedCount] = useState<number>(0);
  const [confirmedCount, setConfirmedCount] = useState<number>(0);
  const [anggotaTim, setAnggotaTim] = useState<any[]>([]);

  // 1. GENERATE KALENDER (HARI INI + 6 HARI KE DEPAN)
  useEffect(() => {
    const tempKalender: HariKalender[] = [];
    const namaHariArr = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const dNow = new Date();

    for (let i = 0; i < 7; i++) {
      const d = new Date(dNow);
      d.setDate(d.getDate() + i);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const tglStr = new Date(d.getTime() - tzOffset).toISOString().split('T')[0];

      tempKalender.push({
        tanggal: tglStr,
        hari: namaHariArr[d.getDay()],
        is_today: i === 0,
      });
    }
    setKalenderDelegasi(tempKalender);
    setSelectedDate(tempKalender[0].tanggal); // Set default ke hari ini
  }, []);

  // 2. FETCH DATA KETIKA TANGGAL BERUBAH
  useEffect(() => {
    if (selectedDate) {
      fetchStatusDelegasi();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const fetchStatusDelegasi = async () => {
    setIsLoading(true);
    try {
      // Cek Shift untuk tanggal yang dipilih
      const { data: jadwal } = await supabase
        .from('kalender_shift')
        .select('shift_code')
        .eq('group_id', supervisor.group)
        .eq('shift_date', selectedDate)
        .maybeSingle();

      const currentShift = jadwal?.shift_code || "OFF";
      setShiftCode(currentShift);

      // Tarik data Karyawan, Presensi Final, DAN Presensi Delegasi
      const [resKaryawan, resPresensi, resDelegasi] = await Promise.all([
        supabase.from('karyawan').select('*').eq('kode_shift', supervisor.group).in('role', ['EMP', 'SPV']),
        supabase.from('presensi').select('badge_number').eq('tanggal_shift', selectedDate),
        supabase.from('presensi_delegasi').select('badge_number').eq('tanggal_shift', selectedDate)
      ]);

      if (resKaryawan.error) throw resKaryawan.error;

      const finalBadges = new Set(resPresensi.data?.map(p => p.badge_number) || []);
      const draftBadges = new Set(resDelegasi.data?.map(p => p.badge_number) || []);

      let countDelegated = 0;
      let countConfirmed = 0;

      const members = (resKaryawan.data || []).map((k: any) => {
        const isAbsen = finalBadges.has(k.badge_number);
        const isDelegated = draftBadges.has(k.badge_number) && !isAbsen;

        if (isAbsen) countConfirmed++;
        else if (isDelegated) countDelegated++;

        return { ...k, is_absen: isAbsen, is_delegated: isDelegated };
      });

      setAnggotaTim(members);
      setTotalEmp(members.length);
      setDelegatedCount(countDelegated);
      setConfirmedCount(countConfirmed);

    } catch (e: any) {
      alert("Gagal memuat status: " + (e.message || e));
      setShiftCode("-");
      setAnggotaTim([]);
    } finally {
      setIsLoading(false);
    }
  };

  const salinLink = () => {
    const domainWeb = "https://oper-presensi.ptmmp.com";
    const link = `${domainWeb}/?tgl=${selectedDate}&grp=${supervisor.group}&shift=${shiftCode}`;

    navigator.clipboard.writeText(link).then(() => {
      alert(`Link presensi untuk tanggal ${selectedDate} berhasil disalin! Silakan paste di WhatsApp Man Power Anda.`);
    }).catch((err) => {
      alert("Gagal menyalin link: " + err);
    });
  };

  const delegatedList = anggotaTim.filter(k => k.is_delegated);
  const isAllConfirmed = confirmedCount === totalEmp && totalEmp > 0;
  const isSomeDelegated = delegatedCount > 0;

  let cardColor = isAllConfirmed ? "bg-blue-50" : (isSomeDelegated ? "bg-orange-50" : "bg-gray-100");
  let borderColor = isAllConfirmed ? "border-blue-200" : (isSomeDelegated ? "border-orange-200" : "border-gray-200");
  let iconColor = isAllConfirmed ? "text-blue-600" : (isSomeDelegated ? "text-orange-600" : "text-gray-500");
  let statusTitle = isAllConfirmed ? "Selesai Dikonfirmasi" : (isSomeDelegated ? "Draft Menunggu Review!" : "Belum Ada Pengisian...");

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans relative z-10">
      <div className="bg-blue-600 p-4 text-white shadow-md flex items-center justify-between">
        <h1 className="text-lg font-bold">Oper Presensi</h1>
        <button onClick={fetchStatusDelegasi} className="p-2 bg-blue-700 hover:bg-blue-800 rounded-full transition-colors">
          <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-5">
        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center gap-4">
          <ShieldAlert size={40} className="text-blue-700 shrink-0" />
          <p className="text-sm text-gray-800 leading-relaxed">
            Berikan akses presensi sementara kepada Man Power untuk hari ini atau hari-hari ke depan.
          </p>
        </div>

        {/* KALENDER HORIZONTAL KHUSUS OPER PRESENSI (1 MINGGU KE DEPAN) */}
        <div>
          <p className="text-sm font-bold text-gray-500 mb-2">Pilih Tanggal Delegasi:</p>
          <div className="bg-white border border-gray-200 overflow-x-auto whitespace-nowrap p-3 flex gap-2 rounded-xl shadow-sm">
            {kalenderDelegasi.map((hari, idx) => {
              const isSelected = hari.tanggal === selectedDate;
              const tglAngka = hari.tanggal.split('-')[2];

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(hari.tanggal)}
                  className={`min-w-[70px] flex flex-col items-center p-3 rounded-2xl transition-all border ${
                    isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200' 
                    : 'bg-white border-gray-200 text-gray-800 hover:border-blue-300'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{hari.hari}</span>
                  <span className="text-xl font-black mt-1">{tglAngka}</span>
                  {hari.is_today && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-yellow-300' : 'bg-blue-600'}`} />}
                </button>
              );
            })}
          </div>
        </div>

        {/* INDIKATOR SHIFT */}
        <div className="flex justify-center">
          <div className={`px-4 py-1.5 rounded-full text-sm font-bold border ${shiftCode === "OFF" ? "bg-red-50 text-red-600 border-red-200" : "bg-blue-50 text-blue-800 border-blue-200"}`}>
            SHIFT TERPILIH: {shiftCode}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Loader2 className="animate-spin mb-2 text-blue-600" size={32} />
            <p className="text-sm font-medium">Memuat Status...</p>
          </div>
        ) : (shiftCode === "OFF" || shiftCode === "O") ? (
          <div className="bg-orange-50 border border-orange-200 p-6 rounded-xl flex flex-col items-center text-center shadow-sm">
            <CalendarOff size={40} className="text-orange-400 mb-3" />
            <p className="font-bold text-lg text-gray-800">Grup Sedang OFF / Libur</p>
            <p className="text-sm text-gray-500 mt-1">Tidak ada presensi yang perlu didelegasikan di hari libur.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <p className="text-sm font-bold text-gray-500 mb-2">Link Akses Web Presensi:</p>
              <button onClick={salinLink} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 active:scale-[0.98]">
                <Copy size={20} /> SALIN LINK & BAGIKAN KE WA
              </button>
            </div>

            <div className={`p-6 rounded-xl border flex flex-col items-center shadow-sm transition-colors ${cardColor} ${borderColor}`}>
              {isAllConfirmed ? <CheckCircle2 size={40} className={iconColor} /> : isSomeDelegated ? <FileClock size={40} className={iconColor} /> : <Hourglass size={40} className={iconColor} />}
              <p className={`font-bold text-lg mt-3 ${iconColor}`}>{statusTitle}</p>
            </div>

            {delegatedList.length > 0 && (
              <div className="pt-2">
                <p className="font-bold text-lg text-gray-800 mb-3">Draft Masuk dari Web:</p>
                <div className="space-y-3">
                  {delegatedList.map((k, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                      <div className="bg-blue-600 w-10 h-10 rounded-full flex justify-center items-center shrink-0">
                        <CloudDownload size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-800">{k.nama}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{k.badge_number} • Menunggu Review</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => navigate('/dashboard/presensi', { state: { targetDate: selectedDate } })}
                  className="w-full mt-6 bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2 active:scale-[0.98]"
                >
                  <FileCheck2 size={20} /> REVIEW & KONFIRMASI
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OperPresensiPage;