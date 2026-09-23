'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Kandidat {
  id: any;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  foto_url?: string;
  jumlah_suara?: number;
}

export default function BilikSuaraPage() {
  const [kandidatList, setKandidatList] = useState<Kandidat[]>([]);
  const [voter, setVoter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    const savedVoter = sessionStorage.getItem('voter_data');
    if (!savedVoter) {
      alert('Sesi pemilih tidak ditemukan. Silakan login kembali!');
      window.location.href = '/';
      return;
    }

    setVoter(JSON.parse(savedVoter));

    const fetchKandidat = async () => {
      const { data } = await supabase
        .from('kandidat')
        .select('*')
        .order('nomor_urut', { ascending: true });

      if (data) setKandidatList(data);
      setLoading(false);
    };

    fetchKandidat();
  }, []);

  const handlePilih = async (kandidat: Kandidat) => {
    if (!voter) return;

    const namaPaslon = `${kandidat.nama_ketua} & ${kandidat.nama_wakil}`;
    const konfirmasi = confirm(
      `Apakah Anda yakin ingin memilih Paslon No. ${kandidat.nomor_urut} (${namaPaslon})?`
    );
    if (!konfirmasi) return;

    setVoting(true);

    try {
      const totalBaru = Number(kandidat.jumlah_suara || 0) + 1;
      const { error: errKandidat } = await supabase
        .from('kandidat')
        .update({ jumlah_suara: totalBaru })
        .eq('id', kandidat.id);

      if (errKandidat) {
        throw new Error('Gagal mencatat suara paslon: ' + errKandidat.message);
      }

      const { error: errPemilih } = await supabase
        .from('pemilih')
        .update({ 
          sudah_memilih: true,
          status: 'sudah' 
        })
        .eq('nisn', voter.nisn);

      if (errPemilih) {
        throw new Error('Gagal memperbarui status kehadiran: ' + errPemilih.message);
      }

      sessionStorage.removeItem('voter_data');
      alert('🎉 Terima kasih! Suara Anda telah berhasil direkam.');
      window.location.href = '/';
    } catch (err: any) {
      alert('❌ Kendala: ' + (err?.message || 'Terjadi kesalahan sistem'));
      console.error(err);
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-xs text-slate-500">
        Memuat bilik suara...
      </div>
    );
  }

  const tipePemilih = voter?.tipe?.toLowerCase() || '';
  const isSiswa = tipePemilih === 'siswa';
  const labelIdentitas = isSiswa ? 'NISN' : 'NIP';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 sm:p-6 flex flex-col items-center">
      {/* Header Bilik Suara */}
      <div className="w-full max-w-5xl bg-white border border-slate-200 rounded-2xl p-5 mb-6 text-center space-y-1.5 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          <h1 className="text-base font-bold text-slate-900 tracking-tight">Bilik Suara Pemilihan</h1>
          
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
              isSiswa
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {voter?.tipe || (voter?.jabatan ? 'Staff' : 'Pemilih')}
          </span>
        </div>

        <p className="text-xs text-slate-600">
          Selamat datang, <span className="text-blue-600 font-bold">{voter?.nama || voter?.nisn}</span>
          {' '}
          <span className="text-slate-400 font-medium">
            ({labelIdentitas}: {voter?.nisn})
          </span>
        </p>

        {(voter?.kelas || voter?.jabatan) && (
          <p className="text-[11px] text-amber-600 font-medium">
            {isSiswa ? `Kelas: ${voter.kelas}` : `${voter.jabatan || 'Tenaga Pendidik / Kependidikan'}`}
          </p>
        )}

        <p className="text-[11px] text-slate-500 pt-1">
          Tentukan pilihanmu dengan menekan tombol <b>PILIH</b> pada kartu paslon di bawah ini.
        </p>
      </div>

      {/* Grid Kartu Paslon */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kandidatList.map((k) => (
          <div
            key={k.id}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between text-center relative shadow-sm hover:shadow-md transition"
          >
            {/* Nomor Urut */}
            <div className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-md">
              {k.nomor_urut}
            </div>

            <div>
              {/* Wadah Foto: Rasio Square (kotak pas) dengan object-cover normal */}
              <div className="w-full aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden mb-3.5 flex items-center justify-center">
                {k.foto_url ? (
                  <img
                    src={k.foto_url}
                    alt={k.nama_ketua}
                    className="w-full h-full object-cover object-center"
                  />
                ) : (
                  <span className="text-slate-400 text-xs">Foto Paslon</span>
                )}
              </div>

              {/* Keterangan & Nama Paslon */}
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-1">
                Calon Ketua & Wakil OSIS
              </p>
              <h3 className="text-sm font-bold text-slate-900 leading-snug mb-4">
                {k.nama_ketua} & {k.nama_wakil}
              </h3>
            </div>

            {/* Tombol Pilih */}
            <button
              onClick={() => handlePilih(k)}
              disabled={voting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50 shadow-md shadow-blue-500/20"
            >
              {voting ? 'Merekam Suara...' : 'PILIH'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}