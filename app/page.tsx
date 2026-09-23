'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanId = identifier.trim();
    const cleanToken = token.trim();

    if (!cleanId || !cleanToken) {
      alert('Mohon isi nomor identitas dan token rahasia.');
      return;
    }

    setLoading(true);

    try {
      // Cari pemilih berdasarkan identitas (NISN/NIP) dan token
      const { data, error } = await supabase
        .from('pemilih')
        .select('*')
        .eq('nisn', cleanId)
        .eq('token', cleanToken)
        .maybeSingle();

      if (error || !data) {
        alert('Nomor identitas atau token salah / tidak ditemukan.');
        setLoading(false);
        return;
      }

      // Periksa status hak suara
      if (data.sudah_memilih === true || data.status === 'sudah') {
        alert('Hak suara untuk identitas ini sudah pernah digunakan.');
        setLoading(false);
        return;
      }

      // Simpan data sesi pemilih (termasuk tipe: siswa, guru, atau staf)
      sessionStorage.setItem('voter_data', JSON.stringify(data));
      router.push('/bilik');
    } catch (err) {
      console.error('Kendala saat login:', err);
      alert('Terjadi kesalahan sistem saat verifikasi data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between items-center p-4">
      <div className="flex-1 flex flex-col justify-center items-center w-full">
        {/* Header */}
        <div className="text-center mb-6 space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white text-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            🗳️
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">E-Voting OSIS</h1>
          <p className="text-xs text-slate-500">
            Gunakan hak suaramu secara bijak
          </p>
        </div>

        {/* Kartu Formulir Login Tanpa Tab */}
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/60 p-6 sm:p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                NIS / NISN / NIP
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan nomor identitas Anda"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Token Rahasia
              </label>
              <input
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Masukkan token unik"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition uppercase font-mono tracking-wider"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg text-xs transition shadow-md shadow-blue-600/30 disabled:opacity-50"
            >
              {loading ? 'Memverifikasi...' : 'Masuk ke Bilik Suara'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] text-slate-400 space-y-0.5">
          <p>Sistem Pemilihan Elektronik</p>
          <p>© 2026 E-Voting OSIS</p>
        </div>
      </div>
    </div>
  );
}