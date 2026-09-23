'use client';

import { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';

interface PemilihRow {
  nisn: string;
  token?: string;
}

const ADMIN_PASSCODE = 'panitia123';

// Fungsi pembuat token acak 6 karakter kombinasi huruf besar dan angka
const generateRandomToken = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Tanpa huruf O, I, angka 0, 1 agar tidak membingungkan
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPass, setInputPass] = useState('');
  const [authError, setAuthError] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<{ nisn: string; token: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; tipe: 'sukses' | 'error' } | null>(null);

  useEffect(() => {
    const status = sessionStorage.getItem('admin_auth');
    if (status === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPass === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      sessionStorage.setItem('admin_auth', 'true');
      setAuthError('');
    } else {
      setAuthError('Kata sandi panitia salah!');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    setInputPass('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setPesan(null);

    Papa.parse<PemilihRow>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // Jika token kosong di CSV, buatkan otomatis
        const cleaned = results.data
          .map((row: any) => {
            const nisnVal = String(row.nisn || row.NISN || '').trim();
            const existingToken = String(row.token || row.TOKEN || '').trim();

            return {
              nisn: nisnVal,
              token: existingToken ? existingToken : generateRandomToken(6),
            };
          })
          .filter((row) => row.nisn);

        setPreviewData(cleaned);
      },
    });
  };

  // Fitur unduh CSV hasil generate agar panitia bisa mencetak/membagikan token ke siswa
  const handleDownloadCSV = () => {
    const csvContent = Papa.unparse(previewData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `data_pemilih_dengan_token_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpload = async () => {
    if (previewData.length === 0) {
      setPesan({ teks: 'Data CSV kosong atau kolom nisn tidak ditemukan!', tipe: 'error' });
      return;
    }

    setLoading(true);
    setPesan(null);

    try {
      const payload = previewData.map((item) => ({
        nisn: item.nisn,
        token: item.token,
        sudah_memilih: false,
      }));

      const { error } = await supabase.from('pemilih').insert(payload);

      if (error) throw error;

      setPesan({
        teks: `Berhasil menambahkan ${previewData.length} data pemilih beserta tokennya!`,
        tipe: 'sukses',
      });
    } catch (err: any) {
      console.error(err);
      setPesan({
        teks: `Gagal mengunggah: ${err.message || 'Periksa duplikasi NISN atau izin database.'}`,
        tipe: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-sm w-full bg-white rounded-xl shadow-lg p-6">
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-gray-800">Autentikasi Panitia</h1>
            <p className="text-gray-500 text-xs mt-1">Masukkan kata sandi untuk mengakses panel admin</p>
          </div>

          {authError && (
            <div className="mb-4 p-2.5 bg-red-100 text-red-700 text-xs rounded-lg text-center font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Kata Sandi Admin
              </label>
              <input
                type="password"
                required
                value={inputPass}
                onChange={(e) => setInputPass(e.target.value)}
                placeholder="Masukkan kata sandi..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition"
            >
              Buka Akses Admin
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <header className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Panel Admin: Bulk Import</h1>
            <p className="text-sm text-gray-500 mt-1">
              Cukup siapkan CSV dengan kolom header <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-600 font-mono">nisn</code>. Token akan otomatis dibuatkan jika kolom token kosong.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-red-600 hover:underline border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
          >
            Keluar
          </button>
        </header>

        {pesan && (
          <div
            className={`mb-6 p-4 rounded-lg text-sm font-medium ${
              pesan.tipe === 'sukses'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {pesan.teks}
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        {previewData.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">
                Pratinjau ({previewData.length} siswa siap disimpan)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCSV}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition"
                >
                  Unduh CSV + Token
                </button>
                <button
                  onClick={handleUpload}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition disabled:bg-gray-400"
                >
                  {loading ? 'Menyimpan...' : 'Simpan ke Database'}
                </button>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                  <tr>
                    <th className="px-4 py-2">No</th>
                    <th className="px-4 py-2">NISN</th>
                    <th className="px-4 py-2">Token (Otomatis)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewData.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2">{idx + 1}</td>
                      <td className="px-4 py-2 font-mono">{row.nisn}</td>
                      <td className="px-4 py-2 font-mono font-semibold text-blue-600">{row.token}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Gunakan tombol <strong>Unduh CSV + Token</strong> untuk menyimpan salinan token yang nanti dibagikan ke siswa.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}