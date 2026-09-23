'use client';

import { useState } from 'react';

export default function ManajemenPemilihanPage() {
  const [namaKegiatan, setNamaKegiatan] = useState('Pemilihan Ketua OSIS 2026');
  const [periode, setPeriode] = useState('2026/2027');
  const [statusAktif, setStatusAktif] = useState(true);
  const [pesan, setPesan] = useState('');

  const handleSimpan = (e: React.FormEvent) => {
    e.preventDefault();
    setPesan('Pengaturan sesi pemilihan berhasil disimpan!');
    setTimeout(() => setPesan(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Manajemen Pemilihan</h1>
        <p className="text-sm text-gray-400 mt-1">
          Atur periode, nama agenda pemilihan, serta status pembukaan bilik suara.
        </p>
      </div>

      {pesan && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm font-medium">
          {pesan}
        </div>
      )}

      <div className="bg-[#181818] border border-[#262626] rounded-xl p-6 space-y-5">
        <h2 className="text-base font-semibold text-white">Sesi Pemilihan Aktif</h2>

        <form onSubmit={handleSimpan} className="space-y-4 text-xs">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Nama Agenda / Kegiatan</label>
            <input
              type="text"
              value={namaKegiatan}
              onChange={(e) => setNamaKegiatan(e.target.value)}
              className="w-full bg-[#121212] border border-[#2a2a2a] text-gray-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 font-semibold mb-1">Periode Kepengurusan</label>
              <input
                type="text"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="w-full bg-[#121212] border border-[#2a2a2a] text-gray-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-1">Status Bilik Suara</label>
              <select
                value={statusAktif ? 'aktif' : 'tutup'}
                onChange={(e) => setStatusAktif(e.target.value === 'aktif')}
                className="w-full bg-[#121212] border border-[#2a2a2a] text-gray-200 rounded-lg px-3.5 py-2.5 focus:outline-none focus:border-blue-500"
              >
                <option value="aktif">🟢 Dibuka (Menerima Suara)</option>
                <option value="tutup">🔴 Ditutup (Bilik Suara Terkunci)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg transition"
            >
              Simpan Pengaturan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}