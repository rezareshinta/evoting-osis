'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // KODE RAHASIA PANITIA: Bisa kamu sesuaikan
  const KODE_RAHASIA_PANITIA = 'PANITIA2026';

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validasi Kode Rahasia agar siswa iseng tidak bisa buat akun admin
    if (secretKey !== KODE_RAHASIA_PANITIA) {
      setErrorMsg('Kode Rahasia Panitia salah! Pendaftaran ditolak.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      setSuccessMsg('Akun admin berhasil didaftarkan! Mengalihkan ke login...');
      setTimeout(() => {
        router.push('/admin/login');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mendaftarkan akun.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#181818] border border-[#262626] rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 mx-auto flex items-center justify-center text-xl font-bold">
            🛡️
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Daftar Akun Admin</h1>
          <p className="text-xs text-gray-400">
            Khusus panitia pemilihan. Membutuhkan kode rahasia.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-300 mb-1.5">Email Panitia</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="panitia@gmail.com"
              className="w-full bg-[#121212] border border-[#2e2e2e] text-gray-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-300 mb-1.5">Kata Sandi</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full bg-[#121212] border border-[#2e2e2e] text-gray-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-300 mb-1.5">
              Kode Rahasia Panitia
            </label>
            <input
              type="text"
              required
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Masukkan kode rahasia panitia"
              className="w-full bg-[#121212] border border-[#2e2e2e] text-amber-400 font-mono rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-amber-500 text-sm"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Kode bawaan sistem: <code className="text-gray-400 font-mono">PANITIA2026</code>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition disabled:opacity-50 text-sm mt-2"
          >
            {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-gray-400 border-t border-[#262626]">
          Sudah punya akun?{' '}
          <Link href="/admin/login" className="text-blue-400 hover:underline font-medium">
            Masuk di sini
          </Link>
        </div>
      </div>
    </div>
  );
}