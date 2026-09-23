'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';

interface Kandidat {
  id: string;
  nomor_urut: number;
  nama: string;
  visi_misi: string;
  foto_url: string;
  jumlah_suara: number;
}

interface Pemilih {
  id: string;
  nisn: string;
  nama?: string;
  status: string;
}

export default function AdminHasilPage() {
  const [kandidatList, setKandidatList] = useState<Kandidat[]>([]);
  const [pemilihList, setPemilihList] = useState<Pemilih[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Ambil data kandidat & pemilih
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

    // Berlangganan data real-time jika ada suara masuk
    const channel = supabase
      .channel('realtime_hasil')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kandidat' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pemilih' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Hitung total suara
  const totalSuara = kandidatList.reduce((acc, k) => acc + (k.jumlah_suara || 0), 0);
  const totalPemilihTerdaftar = pemilihList.length;
  const sudahMemilih = pemilihList.filter((p) => p.status === 'sudah').length;
  const belumMemilih = totalPemilihTerdaftar - sudahMemilih;

  // Fungsi Export ke File Excel (.xlsx)
  const downloadExcel = () => {
    setDownloading(true);

    try {
      // 1. Siapkan Data Sheet 1: Rekap Hasil Suara
      const dataRekap = kandidatList.map((k) => {
        const persen = totalSuara > 0 ? ((k.jumlah_suara / totalSuara) * 100).toFixed(2) + '%' : '0%';
        return {
          'No. Urut': k.nomor_urut,
          'Nama Pasangan Calon': k.nama,
          'Jumlah Perolehan Suara': k.jumlah_suara || 0,
          'Persentase': persen,
        };
      });

      // Tambahkan baris total di bagian bawah
      dataRekap.push({
        'No. Urut': 0,
        'Nama Pasangan Calon': 'TOTAL SUARA MASUK',
        'Jumlah Perolehan Suara': totalSuara,
        'Persentase': '100%',
      });

      // 2. Siapkan Data Sheet 2: Data Kehadiran Pemilih
      const dataKehadiran = pemilihList.map((p, idx) => ({
        'No': idx + 1,
        'NISN': p.nisn,
        'Nama Pemilih': p.nama || '-',
        'Status Hak Suara': p.status === 'sudah' ? 'SUDAH MEMILIH' : 'BELUM MEMILIH',
      }));

      // 3. Buat Workbook Excel
      const wb = XLSX.utils.book_new();

      const wsRekap = XLSX.utils.json_to_sheet(dataRekap);
      const wsKehadiran = XLSX.utils.json_to_sheet(dataKehadiran);

      // Atur lebar kolom agar rapi saat dibuka di Excel
      wsRekap['!cols'] = [{ wch: 10 }, { wch: 30 }, { wch: 25 }, { wch: 15 }];
      wsKehadiran['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 28 }, { wch: 20 }];

      // Masukkan sheet ke dalam file
      XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekapitulasi Suara');
      XLSX.utils.book_append_sheet(wb, wsKehadiran, 'Daftar Pemilih');

      // 4. Unduh file langsung ke perangkat
      const tanggal = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Laporan_Hasil_EVoting_OSIS_${tanggal}.xlsx`);
    } catch (err) {
      alert('Gagal membuat file Excel. Silakan coba lagi.');
      console.error(err);
    } finally {
      setDownloading(false);
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
      {/* Header Halaman & Tombol Unduh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#161616] p-4 rounded-xl border border-[#262626]">
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Hasil Rekapitulasi Suara</h1>
          <p className="text-[11px] text-gray-400">Pantau perolehan suara paslon dan kehadiran pemilih secara real-time</p>
        </div>
        
        <button
          onClick={downloadExcel}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition text-xs shadow-md shadow-emerald-950/30 disabled:opacity-50"
        >
          <span>📥</span>
          {downloading ? 'Membuat File...' : 'Unduh Laporan Excel (.xlsx)'}
        </button>
      </div>

      {/* Kartu Ringkasan Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#161616] border border-[#262626] p-3 rounded-xl">
          <p className="text-[11px] text-gray-400">Total Suara Masuk</p>
          <p className="text-lg font-bold text-blue-400 mt-1">{totalSuara}</p>
        </div>
        <div className="bg-[#161616] border border-[#262626] p-3 rounded-xl">
          <p className="text-[11px] text-gray-400">Daftar Pemilih Tetap</p>
          <p className="text-lg font-bold text-white mt-1">{totalPemilihTerdaftar}</p>
        </div>
        <div className="bg-[#161616] border border-[#262626] p-3 rounded-xl">
          <p className="text-[11px] text-gray-400">Sudah Memilih</p>
          <p className="text-lg font-bold text-emerald-400 mt-1">{sudahMemilih}</p>
        </div>
        <div className="bg-[#161616] border border-[#262626] p-3 rounded-xl">
          <p className="text-[11px] text-gray-400">Belum Memilih</p>
          <p className="text-lg font-bold text-rose-400 mt-1">{belumMemilih}</p>
        </div>
      </div>

      {/* Daftar Kartu Paslon & Progress Bar */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-300">Perolehan Suara Pasangan Calon</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {kandidatList.map((k) => {
            const persen = totalSuara > 0 ? ((k.jumlah_suara / totalSuara) * 100).toFixed(1) : '0';

            return (
              <div
                key={k.id}
                className="bg-[#161616] border border-[#262626] rounded-xl p-4 flex gap-4 items-center shadow-lg"
              >
                {/* Foto Paslon */}
                <div className="w-16 h-20 rounded-lg bg-[#222222] border border-[#333333] overflow-hidden flex-shrink-0 flex items-center justify-center">
                  {k.foto_url ? (
                    <img src={k.foto_url} alt={k.nama} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-gray-500 text-xs">No Foto</span>
                  )}
                </div>

                {/* Info & Persentase Bar */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900/40 text-blue-300 border border-blue-700/50">
                      No. Urut {k.nomor_urut}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {k.jumlah_suara || 0} <span className="text-[10px] font-normal text-gray-400">suara ({persen}%)</span>
                    </span>
                  </div>

                  <h3 className="font-semibold text-white truncate text-xs">{k.nama}</h3>

                  {/* Batang Persentase */}
                  <div className="w-full bg-[#222222] rounded-full h-2 overflow-hidden border border-[#333333]">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${persen}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}