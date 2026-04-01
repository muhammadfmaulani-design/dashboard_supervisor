import { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { 
  LogOut, Fingerprint, ArrowRightLeft, 
  Timer, Users, Settings, User as UserIcon, ChevronLeft 
} from 'lucide-react';
import PresensiPage from './presensi';
import OvertimePage from './overtime';
import OperPresensiPage from './oper_presensi';
import AnggotaTimPage from './anggota_tim';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const sessionString = localStorage.getItem('user_session');
    if (!sessionString) {
      navigate('/login', { replace: true });
    } else {
      setUser(JSON.parse(sessionString));
    }
  }, [navigate]);

  if (!user) return null;

  // Mengecek apakah kita sedang di halaman utama dashboard atau di menu anak (presensi, dll)
  const isRootDashboard = location.pathname === '/dashboard' || location.pathname === '/dashboard/';

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans overflow-hidden">
      
      {/* HEADER UNIVERSAL UNTUK SUB-MENU (Muncul kalau masuk ke menu presensi dsb) */}
      {!isRootDashboard && (
        <div className="bg-red-600 text-white p-4 shadow-md flex items-center z-20 shrink-0">
          <button onClick={() => navigate('/dashboard')} className="p-1 mr-3 hover:bg-red-700 rounded-lg transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="font-bold text-lg uppercase">
            {location.pathname.includes('presensi') ? 'Presensi Tim' : 
             location.pathname.includes('alih') ? 'Oper Presensi' : 
             location.pathname.includes('overtime') ? 'Overtime' : 'Anggota Tim'}
          </h1>
        </div>
      )}

      {/* AREA KONTEN UTAMA */}
      <div className="flex-1 overflow-y-auto">
        <Routes>
        <Route path="/" element={<MainMenu user={user} />} />
        <Route path="presensi" element={<PresensiPage supervisor={user} />} />
        <Route path="overtime" element={<OvertimePage supervisor={user} />} />        
        <Route path="oper_presensi" element={<OperPresensiPage supervisor={user} />} />
        <Route path="anggota-tim" element={<AnggotaTimPage supervisor={user} />} />
        </Routes>
      </div>
    </div>
  );
};

// ========================================================
// KOMPONEN MENU UTAMA (Sesuai dengan _DashboardScreenState)
// ========================================================
const MainMenu = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-full flex flex-col relative bg-gray-50 pb-10">
      
      {/* HEADER PROFILE (Sama persis dengan bentuk melengkung di Flutter) */}
      <div className="bg-red-600 rounded-b-[30px] shadow-lg shadow-red-200/50 w-full px-6 pt-10 pb-8 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-5">
          
          {/* Avatar & Settings Icon (Pakai Stack di Flutter, di sini pakai absolute) */}
          <div className="relative cursor-pointer hover:scale-105 transition-transform" onClick={() => setShowSettings(true)}>
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center shadow-md">
              <UserIcon size={35} className="text-red-600" />
            </div>
            <div className="absolute bottom-0 right-0 bg-yellow-400 p-1.5 rounded-full border-2 border-red-600 shadow-sm">
              <Settings size={14} className="text-red-900" />
            </div>
          </div>

          {/* User Text Info */}
          <div className="flex-1 overflow-hidden">
            <h2 className="text-xl md:text-2xl font-bold text-white truncate">{user.nama}</h2>
            <p className="text-red-100 text-xs md:text-sm">Badge: {user.badge_number}</p>
            <div className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full border border-white/30">
              <span className="text-white text-xs font-bold tracking-wide">GRUP SHIFT: {user.group}</span>
            </div>
          </div>
        </div>
      </div>

      {/* GRID MENU BUTTONS */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 pt-8 flex flex-col">
        {/* Responsif: 2 Kolom di HP, 4 Kolom di Laptop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <MenuButton 
            label="PRESENSI TIM" 
            icon={Fingerprint} 
            color="text-red-600" 
            bg="bg-red-50" 
            border="border-red-100" 
            onClick={() => navigate('/dashboard/presensi')} 
          />
          <MenuButton 
            label="OPER PRESENSI" 
            icon={ArrowRightLeft} 
            color="text-yellow-600" 
            bg="bg-yellow-50" 
            border="border-yellow-100" 
            onClick={() => navigate('/dashboard/oper_presensi')} 
          />
          <MenuButton 
            label="OVERTIME" 
            icon={Timer} 
            color="text-red-700" 
            bg="bg-red-50" 
            border="border-red-100" 
            onClick={() => navigate('/dashboard/overtime')} 
          />
          <MenuButton 
            label="ANGGOTA TIM" 
            icon={Users} 
            color="text-gray-700" 
            bg="bg-gray-100" 
            border="border-gray-200" 
            onClick={() => navigate('/dashboard/anggota-tim')} 
          />
        </div>
        
        {/* Versi App */}
        <div className="text-center mt-12 mb-6 opacity-50">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">MMPresent Version 1.0.0</p>
        </div>
      </div>

      {/* MODAL SETTINGS BOTTOM SHEET (Pengganti showModalBottomSheet Flutter) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm transition-opacity">
          {/* Overlay click untuk menutup modal */}
          <div className="absolute inset-0" onClick={() => setShowSettings(false)}></div>
          
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 relative z-10 animate-slide-up shadow-2xl">
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6"></div>
            <h3 className="text-center text-lg font-bold text-gray-800 mb-4">Pengaturan Akun</h3>
            <div className="border-t border-gray-100 pt-2">
              <button 
                onClick={handleLogout} 
                className="w-full flex items-center justify-center gap-3 p-4 hover:bg-red-50 rounded-2xl transition-colors active:scale-95"
              >
                <LogOut className="text-red-600" />
                <span className="font-bold text-red-600 text-lg">Keluar (Logout)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ========================================================
// WIDGET TOMBOL GRID (Sesuai dengan _buildGridMenuButton)
// ========================================================
const MenuButton = ({ label, icon: Icon, color, bg, border, onClick }: any) => (
  <button 
    onClick={onClick} 
    className={`flex flex-col items-center justify-center p-6 bg-white rounded-3xl border ${border} shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 active:scale-95 cursor-pointer`}
  >
    <div className={`p-4 rounded-full ${bg} mb-3 shadow-inner`}>
      <Icon className={color} size={36} />
    </div>
    <span className="text-xs md:text-sm font-bold text-gray-800 text-center leading-tight tracking-wide">
      {label}
    </span>
  </button>
);

export default Dashboard;