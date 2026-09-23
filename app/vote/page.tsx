'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Kandidat {
  id: number;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  visi: string;
  misi: string;
  foto_url?: string;
  total_suara: number;
}

export default function VotePage() {
  const [kandidatList, setKandidatList] = useState<Kandidat[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [pesan, setPesan] = useState('');

  useEffect(() => {
    const pemilihId = localStorage.getItem('pemilih_id');
    if (!pemilihId) {
      window.location.href = '/';
      return;
    }
    fetchKandidat();
  }, []);

  const fetchKandidat = async () => {
    const { data, error } = await supabase
      .from('kandidat')
      .select('*')
      .order('nomor_urut', { ascending: true });

    if (!error && data) {
      setKandidatList(data);
    }
    setLoading(false);
  };

  const handleVote = async (kandidat: Kandidat) => {
    const konfirmasi = confirm(
      `Apakah Anda yakin ingin memilih Paslon No. ${kandidat.nomor_urut} (${kandidat.nama_ketua} & ${kandidat.nama_wakil})? Pilihan tidak dapat diubah!`
    );
    if (!konfirmasi) return;

    setVoting(true);
    setPesan('');

    const pemilihId = localStorage.getItem('pemilih_id');
    if (!pemilihId) {
      window.location.href = '/';
      return;
    }

    try {
      const { error: errorKandidat } = await supabase
        .from('kandidat')
        .update({ total_suara: (kandidat.total_suara || 0) + 1 })
        .eq('id', kandidat.id);

      if (errorKandidat) throw errorKandidat;

      const { error: errorPemilih } = await supabase
        .from('pemilih')
        .update({ sudah_memilih: true })
        .eq('id', pemilihId);

      if (errorPemilih) throw errorPemilih;

      localStorage.removeItem('pemilih_id');
      localStorage.removeItem('pemilih_nisn');

      alert('Terima kasih! Hak suara Anda telah berhasil disimpan.');
      window.location.href = '/';
    } catch (err: any) {
      console.error(err);
      setPesan('Terjadi kesalahan saat memproses suara.');
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 font-medium">Memuat bilik suara...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Bilik Suara Pemilihan OSIS</h1>
          <p className="text-gray-600 mt-2">Pilihlah pasangan calon sesuai hati nurani Anda</p>
        </header>

        {pesan && (
          <div className="mb-6 p-4 bg-red-100 text-red-700 rounded-lg text-center font-medium">
            {pesan}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kandidatList.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col justify-between hover:shadow-lg transition"
            >
              <div>
                {/* Foto Paslon */}
                <div className="w-full h-56 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                  {item.foto_url ? (
                    <img
                      src={item.foto_url}
                      alt={`Paslon ${item.nomor_urut}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">Belum ada foto</span>
                  )}
                  <span className="absolute top-3 left-3 text-xl font-black bg-blue-600 text-white w-9 h-9 rounded-full flex items-center justify-center shadow">
                    {item.nomor_urut}
                  </span>
                </div>

                <div className="p-6">
                  <span className="text-xs font-semibold px-2.5 py-1 bg-blue-100 text-blue-800 rounded">
                    Kandidat Paslon
                  </span>

                  <h2 className="text-xl font-bold text-gray-800 mt-2">
                    {item.nama_ketua} & {item.nama_wakil}
                  </h2>

                  <div className="mt-4 text-sm text-gray-600 space-y-2">
                    <div>
                      <span className="font-semibold text-gray-700">Visi:</span>
                      <p className="mt-0.5 text-gray-600">{item.visi || '-'}</p>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-700">Misi:</span>
                      <p className="mt-0.5 text-gray-600">{item.misi || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0">
                <button
                  onClick={() => handleVote(item)}
                  disabled={voting}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:bg-gray-400"
                >
                  {voting ? 'Menyimpan Pilihan...' : `Pilih Paslon 0${item.nomor_urut}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}