import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabase';
import { LogIn, ShieldCheck, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeNumber || !password) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Cari email berdasarkan badge_number
      const { data: userData, error: fetchError } = await supabase
        .from('karyawan')
        .select('email, nama, role, kode_shift, badge_number')
        .eq('badge_number', badgeNumber)
        .single();

      if (fetchError || !userData) {
        throw new Error('Badge Number tidak terdaftar di sistem!');
      }

      if (!userData.email) {
        throw new Error('Akun ini belum dikonfigurasi emailnya.');
      }

      if (userData.role !== 'SPV' && userData.role !== 'ADM') {
        throw new Error('Akses ditolak. Khusus Supervisor atau Admin.');
      }

      // 2. Login resmi ke Supabase Auth (Agar RLS terbuka untuk narik data FTW dll)
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: password,
      });

      if (authError) {
        if (authError.message.includes('Invalid login')) {
          throw new Error('Password salah!');
        }
        throw authError;
      }

      // 3. Simpan data sesi ke localStorage untuk UI Dashboard
      const sessionData = {
        badge_number: userData.badge_number,
        nama: userData.nama,
        group: userData.kode_shift,
        role: userData.role
      };
      localStorage.setItem('user_session', JSON.stringify(sessionData));
      
      // Arahkan ke Dashboard
      navigate('/dashboard', { replace: true });

    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan sistem saat login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 font-sans">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 bg-red-600 rounded-2xl shadow-lg shadow-red-100 mb-4">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">MMPresent</h1>
          <p className="text-gray-500 text-sm">Dashboard Supervisor</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 space-y-5">
          {error && (
            <div className="bg-yellow-50 text-red-600 text-xs p-3 rounded-xl border border-yellow-200 flex items-center gap-2">
              <span className="font-bold">!</span> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Badge Number
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
              placeholder="Contoh: 12345"
              value={badgeNumber}
              onChange={(e) => setBadgeNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
              Password
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all placeholder:text-gray-300"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !badgeNumber || !password}
            className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <><LogIn size={20} /> MASUK</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;