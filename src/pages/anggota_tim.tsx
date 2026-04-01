import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { 
  Users, 
  Loader2, 
  User as UserIcon, 
  Briefcase, 
  Hash,
  X,
  Send,
  MessageSquareWarning // Ikon baru untuk tombol yang lebih kalem
} from 'lucide-react';

interface Supervisor {
  group: string;
  badge_number: string;
}

interface Karyawan {
  badge_number: string;
  nama: string;
  role: string;
  kode_shift: string;
}

const AnggotaTimPage = ({ supervisor }: { supervisor: Supervisor }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [teamList, setTeamList] = useState<Karyawan[]>([]);

  // State untuk Modal Pelaporan
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [selectedKaryawan, setSelectedKaryawan] = useState<Karyawan | null>(null);
  const [reportCategory, setReportCategory] = useState<string>("");
  const [reportDescription, setReportDescription] = useState<string>("");
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  useEffect(() => {
    if (supervisor) {
      fetchTeamMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supervisor]);

  const fetchTeamMembers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('karyawan')
        .select('*')
        .eq('kode_shift', supervisor.group)
        .neq('badge_number', supervisor.badge_number)
        .order('nama', { ascending: true });

      if (error) throw error;
      setTeamList(data || []);
    } catch (error: any) {
      alert("Gagal memuat data anggota tim: " + (error.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  // Fungsi membuka pop-up lapor
  const handleOpenReport = (karyawan: Karyawan) => {
    setSelectedKaryawan(karyawan);
    setReportCategory("");
    setReportDescription("");
    setIsReportModalOpen(true);
  };

  // Fungsi mengirim laporan ke Supabase
  const submitLaporan = async () => {
    if (!reportCategory) return alert("Pilih kategori laporan terlebih dahulu!");
    if (!reportDescription.trim()) return alert("Deskripsi laporan tidak boleh kosong!");
    if (!selectedKaryawan) return;

    setIsSubmittingReport(true);
    try {
      const payload = {
        badge_karyawan: selectedKaryawan.badge_number,
        nama_karyawan: selectedKaryawan.nama,
        badge_spv: supervisor.badge_number,
        kategori: reportCategory,
        deskripsi: reportDescription.trim(),
        status: "Menunggu Review Admin",
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('pelaporan_karyawan').insert([payload]);
      
      if (error) throw error;

      alert("Catatan/Laporan berhasil dikirim ke Admin!");
      setIsReportModalOpen(false);
    } catch (error: any) {
      alert("Gagal mengirim laporan: " + (error.message || error));
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10 font-sans relative">
      
      {/* HEADER INFO */}
      <div className="bg-orange-600 px-6 pt-6 pb-8 shadow-md rounded-b-[30px] z-10 relative">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-1">
            Grup Shift: {supervisor.group}
          </h2>
          <p className="text-orange-100 text-sm font-medium flex items-center gap-1.5">
            <Users size={16} />
            Total Anggota: {teamList.length} Orang
          </p>
        </div>
      </div>

      {/* BODY KONTEN */}
      <div className="max-w-3xl mx-auto px-4 -mt-4 relative z-20">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-orange-600 bg-white rounded-2xl shadow-sm border border-gray-100 mt-8">
            <Loader2 className="animate-spin mb-3" size={40} />
            <p className="font-bold text-gray-500">Memuat anggota tim...</p>
          </div>
        ) : teamList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100 mt-8">
            <Users className="text-gray-300 mb-4" size={60} />
            <p className="font-bold text-gray-500 text-lg">Tidak ada anggota di grup ini.</p>
            <p className="text-sm text-gray-400 mt-1">Hanya Supervisor yang terdaftar.</p>
          </div>
        ) : (
          <div className="space-y-3 pt-6">
            {teamList.map((k) => (
              <div 
                key={k.badge_number} 
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                {/* PROFIL KARYAWAN */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-50 text-blue-800 font-bold text-xl rounded-full flex items-center justify-center shrink-0 border border-blue-100">
                    {k.nama ? k.nama.substring(0, 1).toUpperCase() : <UserIcon size={24} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-800 text-base md:text-lg truncate">
                      {k.nama || '-'}
                    </h3>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-1.5">
                      <div className="flex items-center gap-1.5 text-gray-500 text-xs md:text-sm">
                        <Hash size={14} className="text-gray-400" />
                        <span>{k.badge_number}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-orange-600 font-semibold text-xs md:text-sm">
                        <Briefcase size={14} className="text-orange-500" />
                        <span>{k.role === 'EMP' ? 'Man Power' : k.role || 'Staff'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TOMBOL LAPORKAN - STYLE DIPERBARUI (LEBIH SOFT) */}
                <button 
                  onClick={() => handleOpenReport(k)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-95 shadow-sm"
                >
                  <MessageSquareWarning size={16} className="text-slate-500" /> BUAT CATATAN
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- MODAL PELAPORAN KARYAWAN --- */}
      {isReportModalOpen && selectedKaryawan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4">
            
            {/* Modal Header - Diubah menjadi tema Slate/Orange agar tidak terlalu mengintimidasi */}
            <div className="p-5 bg-slate-800 text-white flex justify-between items-start">
              <div>
                <h3 className="font-black text-lg flex items-center gap-2">
                  <MessageSquareWarning size={20} className="text-orange-400" /> Catatan Karyawan
                </h3>
                <p className="text-slate-300 text-sm mt-1">
                  Karyawan: <span className="font-bold text-white">{selectedKaryawan.nama}</span>
                </p>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)} 
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Body (Form) */}
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50 space-y-5">
              
              {/* Kategori Laporan */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Kategori Catatan <span className="text-orange-500">*</span>
                </label>
                <select 
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-xl focus:ring-slate-500 focus:border-slate-500 block p-3.5 shadow-sm transition-colors"
                >
                  <option value="" disabled>-- Pilih Kategori --</option>
                  <option value="Kinerja Menurun">Kinerja Menurun / Bermasalah</option>
                  <option value="Indisipliner (Sering Terlambat/Mangkir)">Indisipliner (Sering Terlambat/Mangkir)</option>
                  <option value="Sakit Berkepanjangan">Sakit Berkepanjangan / Kecelakaan</option>
                  <option value="Indikasi Resign / Keluar">Indikasi Resign / Keluar</option>
                  <option value="Pelanggaran SOP / K3">Pelanggaran SOP / K3</option>
                  <option value="Keluhan Pribadi">Keluhan Karyawan / Pribadi</option>
                  <option value="Lainnya">Lainnya...</option>
                </select>
              </div>

              {/* Deskripsi Laporan */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Detail Keterangan <span className="text-orange-500">*</span>
                </label>
                <textarea 
                  rows={5}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Ceritakan secara detail mengenai catatan karyawan ini..."
                  className="w-full bg-white border border-gray-300 text-gray-800 text-sm rounded-xl focus:ring-slate-500 focus:border-slate-500 block p-3.5 shadow-sm resize-none transition-colors"
                ></textarea>
                <p className="text-xs text-slate-500 mt-2 font-medium">
                  Informasi ini akan masuk ke sistem Admin & HR untuk ditindaklanjuti.
                </p>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-gray-200 bg-white flex gap-3">
              <button 
                onClick={() => setIsReportModalOpen(false)} 
                className="flex-1 py-3.5 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={isSubmittingReport}
              >
                Batal
              </button>
              <button 
                onClick={submitLaporan} 
                disabled={isSubmittingReport}
                className="flex-[2] py-3.5 font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-lg shadow-slate-200 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-400"
              >
                {isSubmittingReport ? (
                  <><Loader2 size={18} className="animate-spin" /> Mengirim...</>
                ) : (
                  <><Send size={18} /> Kirim Catatan</>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AnggotaTimPage;