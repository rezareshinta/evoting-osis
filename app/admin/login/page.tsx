'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [pesanStatus, setPesanStatus] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPesanStatus('⏳ Sedang memeriksa akun admin...');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setPesanStatus('❌ ' + error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        setPesanStatus('✅ Berhasil masuk! Mengalihkan ke dasbor...');
        // Pengalihan langsung ke halaman hasil rekapitulasi
        window.location.href = '/admin/hasil';
      } else {
        setPesanStatus('⚠️ Sesi tidak ditemukan. Periksa kembali email dan sandi.');
        setLoading(false);
      }
    } catch (err: any) {
      setPesanStatus('❌ Terjadi kesalahan: ' + (err?.message || 'Gagal terhubung'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col items-center justify-center p-4 text-xs text-gray-200">
      <div className="w-full max-w-xs bg-[#161616] border border-[#262626] rounded-xl p-5 shadow-xl space-y-4">
        <div className="text-center space-y-1">
          <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm mx-auto mb-2 border border-blue-500/30">
            🔐
          </div>
          <h1 className="text-base font-bold text-white tracking-tight">Login Administrator</h1>
          <p className="text-[11px] text-gray-400">Masuk untuk mengelola sistem e-voting</p>
        </div>

        {pesanStatus && (
          <div className="p-2.5 rounded-md bg-[#222222] border border-[#333333] text-[11px] font-medium leading-tight text-center">
            {pesanStatus}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Email Admin
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sekolah.sch.id"
              className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 text-xs transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 text-xs transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md transition disabled:opacity-50 text-xs mt-1 shadow-md shadow-blue-900/20"
          >
            {loading ? 'Memeriksa...' : 'Masuk ke Dasbor'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-[#222222]">
          <Link
            href="/admin/register"
            className="text-[11px] text-gray-400 hover:text-blue-400 transition"
          >
            Belum punya akun admin? <span className="underline">Daftar di sini</span>
          </Link>
        </div>
      </div>
    </div>
  );
}