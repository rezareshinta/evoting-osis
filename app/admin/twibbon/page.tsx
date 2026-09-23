'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { toPng } from 'html-to-image';

interface Kandidat {
  id: string;
  nomor_urut: number;
  nama?: string;
  nama_ketua?: string;
  nama_wakil?: string;
  visi_misi?: string;
  foto_url: string;
  jumlah_suara: number;
}

export default function TwibbonPage() {
  const [pemenang, setPemenang] = useState<Kandidat | null>(null);
  const [totalSuara, setTotalSuara] = useState(0);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ambilDataPemenang = async () => {
      try {
        const { data, error } = await supabase
          .from('kandidat')
          .select('*')
          .order('jumlah_suara', { ascending: false });

        if (data && data.length > 0) {
          const total = data.reduce((acc, curr) => acc + (Number(curr.jumlah_suara) || 0), 0);
          setTotalSuara(total);
          setPemenang(data[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    ambilDataPemenang();
  }, []);

  const unduhGambar = async () => {
    if (!cardRef.current) return;
    setDownloading(true);

    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      const labelNama = pemenang?.nama || pemenang?.nama_ketua || 'Paslon';
      link.download = `Twibbon_Pemenang_OSIS_${labelNama.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      alert('Gagal mengunduh gambar. Pastikan browser mendukung ekspor canvas.');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-xs">
        Menghitung perolehan suara pemenang...
      </div>
    );
  }

  if (!pemenang || (pemenang.jumlah_suara || 0) === 0) {
    return (
      <div className="bg-[#141414] border border-[#222222] rounded-2xl p-8 text-center max-w-md mx-auto my-12 text-xs text-gray-400">
        <p className="text-2xl mb-2">🗳️</p>
        <h2 className="font-bold text-sm mb-1" style={{ color: '#FFFFFF' }}>Belum Ada Suara Masuk</h2>
        <p style={{ color: '#9CA3AF' }}>Twibbon pengumuman pemenang akan otomatis tampil setelah ada suara yang dicoblos oleh pemilih.</p>
      </div>
    );
  }

  const persentase = totalSuara > 0 
    ? ((pemenang.jumlah_suara / totalSuara) * 100).toFixed(1) 
    : '0';

  const tampilanNama = pemenang.nama 
    ? pemenang.nama 
    : pemenang.nama_wakil 
    ? `${pemenang.nama_ketua} & ${pemenang.nama_wakil}` 
    : pemenang.nama_ketua;

  return (
    <div className="flex flex-col items-center justify-center p-4 space-y-6">
      {/* Tombol Download */}
      <div className="flex items-center justify-between w-full max-w-md">
        <div>
          <h1 className="text-base font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Twibbon Pemenang</h1>
          <p className="text-[11px]" style={{ color: '#9CA3AF' }}>Siap dibagikan ke media sosial resmi</p>
        </div>

        <button
          onClick={unduhGambar}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 font-bold px-4 py-2 rounded-xl transition text-xs shadow-lg disabled:opacity-50"
          style={{ color: '#000000' }}
        >
          <span>📸</span>
          {downloading ? 'Memproses...' : 'Unduh Gambar (PNG)'}
        </button>
      </div>

      {/* Area Kartu Twibbon */}
      <div
        ref={cardRef}
        className="w-full max-w-md rounded-3xl p-6 shadow-2xl relative overflow-hidden text-center select-none"
        style={{
          backgroundColor: '#0c0d10',
          border: '2px solid rgba(245, 158, 11, 0.4)',
        }}
      >
        {/* Glow Latar Belakang */}
        <div className="absolute -top-16 -left-16 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Bagian Header Kartu */}
        <div className="space-y-2 relative z-10">
          <div
            className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase shadow-md"
            style={{ backgroundColor: '#FFFFFF', color: '#0F172A' }}
          >
            <span>👑</span> Terpilih Sebagai Ketua & Wakil OSIS
          </div>
          
          {/* KOTAK EMAS: TULISAN SELAMAT & SUKSES PASTI TERLIHAT */}
          <div className="pt-2 flex flex-col items-center">
            <div
              className="px-6 py-2 rounded-xl font-black text-lg tracking-wider border border-amber-200 shadow-lg"
              style={{
                background: 'linear-gradient(90deg, #F59E0B, #FDE68A, #F59E0B)',
                color: '#000000',
              }}
            >
              SELAMAT & SUKSES!
            </div>
            
            <p
              className="text-xs font-bold tracking-wide mt-2"
              style={{ color: '#FFFFFF' }}
            >
              Periode Kepengurusan Baru
            </p>
          </div>
        </div>

        {/* Bingkai Foto Pemenang */}
        <div className="my-5 relative flex justify-center items-center">
          <div
            className="relative p-1.5 rounded-2xl shadow-xl"
            style={{ background: 'linear-gradient(45deg, #d97706, #fde68a, #d97706)' }}
          >
            <div className="w-48 h-48 rounded-xl bg-[#1e1e24] overflow-hidden flex items-center justify-center">
              {pemenang.foto_url ? (
                <img
                  src={pemenang.foto_url}
                  alt={tampilanNama || 'Foto Pemenang'}
                  className="w-full h-full object-cover object-center"
                  crossOrigin="anonymous"
                />
              ) : (
                <div style={{ color: '#9CA3AF' }} className="text-xs font-medium">Foto Paslon</div>
              )}
            </div>

            {/* Badge Paslon */}
            <div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 font-black text-xs px-4 py-1 rounded-full shadow-md whitespace-nowrap"
              style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              PASLON NO. {pemenang.nomor_urut}
            </div>
          </div>
        </div>

        {/* Informasi Nama & Perolehan Suara */}
        <div className="space-y-3 relative z-10 mt-5">
          <div>
            <h3
              className="text-base font-bold leading-snug tracking-tight"
              style={{ color: '#FFFFFF' }}
            >
              {tampilanNama}
            </h3>
            <p
              className="text-xs font-semibold mt-0.5"
              style={{ color: '#FBBF24' }}
            >
              Ketua & Wakil Ketua OSIS Terpilih
            </p>
          </div>

          {/* Kotak Statistik Suara */}
          <div
            className="grid grid-cols-2 gap-2.5 rounded-xl p-3 shadow-inner"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.07)', border: '1px solid rgba(255, 255, 255, 0.15)' }}
          >
            <div style={{ borderRight: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <span className="text-[10px] block font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                Persentase
              </span>
              <span className="text-xl font-black mt-0.5 block" style={{ color: '#34D399' }}>
                {persentase}%
              </span>
            </div>
            <div>
              <span className="text-[10px] block font-semibold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>
                Total Perolehan
              </span>
              <span className="text-xl font-black mt-0.5 block" style={{ color: '#FCD34D' }}>
                {pemenang.jumlah_suara} Suara
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="mt-6 pt-3 flex items-center justify-between text-[10px] relative z-10"
          style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}
        >
          <span style={{ color: '#9CA3AF' }}>Official E-Voting System</span>
          <span className="font-semibold" style={{ color: '#FFFFFF' }}>Reza Resinta</span>
        </div>
      </div>
    </div>
  );
}