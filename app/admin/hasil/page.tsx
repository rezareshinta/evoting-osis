'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

interface Kandidat {
  id: any;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  foto_url?: string;
  jumlah_suara: number;
}

interface Pemilih {
  id: any;
  nisn: string;
  nama?: string;
  status: string;
}

export default function AdminHasilPage() {
  const [kandidatList, setKandidatList] = useState<Kandidat[]>([]);
  const [pemilihList, setPemilihList] = useState<Pemilih[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    try {
      const [resKandidat, resPemilih] = await Promise.all([
        supabase.from('kandidat').select('*').order('nomor_urut', { ascending: true }),
        supabase.from('pemilih').select('*').order('nisn', { ascending: true })
      ]);

      if (resKandidat.data) setKandidatList(resKandidat.data);
      if (resPemilih.data) setPemilihList(resPemilih.data);
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('realtime_admin_hasil')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kandidat' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pemilih' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const totalSuara = kandidatList.reduce((acc, k) => acc + (Number(k.jumlah_suara) || 0), 0);
  const totalPemilihTerdaftar = pemilihList.length;
  const sudahMemilih = pemilihList.filter((p) => p.status === 'sudah').length;
  
  // Perhitungan Golput
  const totalGolput = Math.max(0, totalPemilihTerdaftar - sudahMemilih);
  const persenGolput = totalPemilihTerdaftar > 0 ? ((totalGolput / totalPemilihTerdaftar) * 100).toFixed(1) : '0';
  const partisipasi = totalPemilihTerdaftar > 0 ? ((sudahMemilih / totalPemilihTerdaftar) * 100).toFixed(1) : '0';

  const downloadExcel = () => {
    setDownloading(true);

    try {
      // 1. Data Rekapitulasi Suara & Golput
      const dataRekap: any[] = kandidatList.map((k) => {
        const suara = Number(k.jumlah_suara) || 0;
        const persen = totalSuara > 0 ? ((suara / totalSuara) * 100).toFixed(2) + '%' : '0%';
        return {
          'No. Urut': k.nomor_urut,
          'Nama Pasangan Calon / Keterangan': `${k.nama_ketua} & ${k.nama_wakil}`,
          'Jumlah Perolehan Suara': suara,
          'Persentase': persen,
        };
      });

      // Baris Total Suara Sah / Masuk
      dataRekap.push({
        'No. Urut': '-',
        'Nama Pasangan Calon / Keterangan': 'TOTAL SUARA MASUK (SUDAH MEMILIH)',
        'Jumlah Perolehan Suara': sudahMemilih,
        'Persentase': totalPemilihTerdaftar > 0 ? ((sudahMemilih / totalPemilihTerdaftar) * 100).toFixed(2) + '%' : '0%',
      });

      // Baris Tidak Memilih (Golput)
      dataRekap.push({
        'No. Urut': '-',
        'Nama Pasangan Calon / Keterangan': 'TIDAK MEMILIH (GOLPUT)',
        'Jumlah Perolehan Suara': totalGolput,
        'Persentase': totalPemilihTerdaftar > 0 ? ((totalGolput / totalPemilihTerdaftar) * 100).toFixed(2) + '%' : '0%',
      });

      // Baris Total Hak Pilih DPT
      dataRekap.push({
        'No. Urut': '-',
        'Nama Pasangan Calon / Keterangan': 'TOTAL PEMILIH TERDAFTAR (DPT)',
        'Jumlah Perolehan Suara': totalPemilihTerdaftar,
        'Persentase': '100%',
      });

      // 2. Data Daftar Hadir Pemilih
      const dataKehadiran = pemilihList.map((p, idx) => ({
        'No': idx + 1,
        'NISN': p.nisn,
        'Nama Pemilih': p.nama || '-',
        'Status Hak Suara': p.status === 'sudah' ? 'SUDAH MEMILIH' : 'BELUM MEMILIH (GOLPUT)',
      }));

      const wb = XLSX.utils.book_new();
      const wsRekap = XLSX.utils.json_to_sheet(dataRekap);
      const wsKehadiran = XLSX.utils.json_to_sheet(dataKehadiran);

      wsRekap['!cols'] = [{ wch: 10 }, { wch: 38 }, { wch: 25 }, { wch: 15 }];
      wsKehadiran['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 28 }, { wch: 26 }];

      XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekapitulasi Suara');
      XLSX.utils.book_append_sheet(wb, wsKehadiran, 'Daftar Hadir Pemilih');

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const tanggal = new Date().toISOString().split('T')[0];
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Laporan_Hasil_EVoting_OSIS_${tanggal}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengunduh file Excel.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = async () => {
    const konfirmasi = confirm('Apakah Anda yakin ingin mereset semua suara ke 0 dan mengembalikan hak suara semua pemilih?');
    if (!konfirmasi) return;

    setResetting(true);
    try {
      await supabase.from('kandidat').update({ jumlah_suara: 0 }).neq('nomor_urut', -1);
      await supabase.from('pemilih').update({ status: 'belum' }).neq('nisn', '');
      fetchData();
      alert('Data suara berhasil direset!');
    } catch (err) {
      alert('Gagal mereset data suara.');
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400 text-xs">
        Memuat data rekapitulasi...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs text-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Hasil Rekapitulasi Suara</h1>
          <p className="text-[11px] text-gray-400">Pantau perolehan suara langsung dan tingkat partisipasi pemilih</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadExcel}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1.5 rounded-md transition text-xs shadow-md shadow-emerald-950/20 disabled:opacity-50"
          >
            <span>📥</span>
            {downloading ? 'Mengunduh...' : 'Unduh Excel'}
          </button>

          <button
            onClick={handleReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 font-medium px-3 py-1.5 rounded-md transition text-xs disabled:opacity-50"
          >
            <span>🔄</span>
            {resetting ? 'Mereset...' : 'Reset Suara'}
          </button>
        </div>
      </div>

      {/* Kartu Ringkasan 4 Kolom Termasuk Golput */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Suara Masuk */}
        <div className="bg-[#141414] border border-[#222222] p-4 rounded-xl">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Suara Masuk</p>
          <p className="text-xl font-bold text-blue-500 mt-1">
            {totalSuara} <span className="text-xs font-normal text-gray-400">suara</span>
          </p>
        </div>

        {/* Pemilih Terdaftar */}
        <div className="bg-[#141414] border border-[#222222] p-4 rounded-xl">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Pemilih Terdaftar</p>
          <p className="text-xl font-bold text-white mt-1">
            {totalPemilihTerdaftar} <span className="text-xs font-normal text-gray-400">pemilih</span>
          </p>
        </div>

        {/* Partisipasi Pemilih */}
        <div className="bg-[#141414] border border-[#222222] p-4 rounded-xl">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Partisipasi</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{partisipasi}%</p>
        </div>

        {/* Golput */}
        <div className="bg-[#141414] border border-rose-900/40 p-4 rounded-xl">
          <p className="text-[11px] text-rose-400 uppercase tracking-wider font-semibold">Tidak Memilih (Golput)</p>
          <p className="text-xl font-bold text-rose-500 mt-1">
            {totalGolput} <span className="text-xs font-normal text-rose-400/80">({persenGolput}%)</span>
          </p>
        </div>
      </div>

      {/* Grafik Perolehan Suara */}
      <div className="bg-[#141414] border border-[#222222] rounded-xl p-4 space-y-4">
        <h2 className="text-xs font-semibold text-gray-300">Perolehan Suara Kandidat</h2>

        <div className="space-y-3">
          {kandidatList.map((k) => {
            const suara = Number(k.jumlah_suara) || 0;
            const persen = totalSuara > 0 ? ((suara / totalSuara) * 100).toFixed(0) : '0';

            return (
              <div key={k.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">
                      {k.nomor_urut}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-xs">{k.nama_ketua} & {k.nama_wakil}</h3>
                      <p className="text-[10px] text-gray-400">Paslon No. {k.nomor_urut}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-blue-400">{suara} suara</span>
                    <span className="text-[10px] text-gray-500 block">({persen}%)</span>
                  </div>
                </div>

                <div className="w-full bg-[#202020] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${persen}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}