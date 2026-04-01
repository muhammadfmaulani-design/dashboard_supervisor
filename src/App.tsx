import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/login';
import Dashboard from './pages/dashboard';
import OvertimePage from './pages/overtime'; // Pastikan path import sesuai

// --- WRAPPER UNTUK HALAMAN YANG BUTUH PROP SUPERVISOR ---
// Fungsi ini bertugas mengecek apakah user sudah login, 
// mengambil datanya dari localStorage, lalu melemparnya ke halaman.
const ProtectedOvertimeRoute = () => {
  const sessionStr = localStorage.getItem('user_session');
  
  // Kalau tidak ada sesi (belum login), lempar balik ke login
  if (!sessionStr) {
    return <Navigate to="/login" replace />;
  }

  const session = JSON.parse(sessionStr);
  
  // Bentuk ulang object supervisor sesuai interface yang diminta OvertimePage
  const supervisorData = {
    group: session.group,
    badge_number: session.badge_number
  };

  return <OvertimePage supervisor={supervisorData} />;
};

export default function App() {
  return (
    <BrowserRouter>
      {/* Sekarang pakai w-full biar bebas 100% lebar layar */}
      <div className="w-full bg-gray-50 min-h-screen relative overflow-x-hidden font-sans">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Route Dashboard Utama */}
          <Route path="/dashboard/*" element={<Dashboard />} />
          
          {/* Route Baru untuk Overtime */}
          <Route path="/overtime" element={<ProtectedOvertimeRoute />} />
          
          {/* Jika ada halaman Presensi, kamu bisa buat dengan cara yang sama */}
          {/* <Route path="/presensi" element={<ProtectedPresensiRoute />} /> */}
          
          {/* Fallback route jika URL tidak ditemukan */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}