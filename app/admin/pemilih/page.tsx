'use client';

import { useEffect, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

interface Pemilih {
  id: number;
  nisn: string;
  nama?: string;
  tipe?: string; // 'siswa' | 'guru' | 'staf'
  kelas?: string;
  jabatan?: string;
  tahun?: string;
  token: string;
  sudah_memilih: boolean;
}

const generateRandomToken = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function ManajemenPemilihPage() {
  const [pemilihList, setPemilihList] = useState<Pemilih[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [pesan, setPesan] = useState<{ teks: string; tipe: 'sukses' | 'error' } | null>(null);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      const savedTheme = localStorage.getItem('admin_theme_mode');
      setIsDark(savedTheme === 'dark');
    };

    checkTheme();
    const interval = setInterval(checkTheme, 300);
    return () => clearInterval(interval);
  }, []);

  // Form Import CSV State
  const [tahunImport, setTahunImport] = useState('2026');
  const [fileCSV, setFileCSV] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);

  // Modal Tambah Manual State
  const [modalOpen, setModalOpen] = useState(false);
  const [formManual, setFormManual] = useState({
    tipe: 'siswa',
    nisn: '',
    nama: '',
    kelas: '',
    jabatan: '',
    tahun: '2026',
    token: '',
  });

  // Filter Bar State
  const [search, setSearch] = useState('');
  const [filterTahun, setFilterTahun] = useState('2026');
  const [filterTipe, setFilterTipe] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('');

  const fetchPemilih = async () => {
    const { data } = await supabase
      .from('pemilih')
      .select('*')
      .order('id', { ascending: false });

    if (data) setPemilihList(data);
  };

  useEffect(() => {
    fetchPemilih();
  }, []);

  // Handle file CSV dengan normalisasi header
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileCSV(file);
    setPesan(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(), // normalisasi nama kolom
      complete: (results) => {
        setParsedRows(results.data);
      },
    });
  };

  // Import CSV
  const handleImportSubmit = async () => {
    if (!fileCSV || parsedRows.length === 0) {
      setPesan({ teks: 'Pilih file CSV yang valid terlebih dahulu!', tipe: 'error' });
      return;
    }

    setLoading(true);
    setPesan(null);

    try {
      const payload = parsedRows
        .map((row: any) => {
          // Bersihkan data tiap kolom
          const identifier = String(row.identifier || row.nisn || row.nip || row.nuptk || row.no_identitas || '').trim();
          const existingToken = String(row.token || '').trim();
          const nama = String(row.name || row.nama || '').trim();
          const rawTipe = String(row.type || row.tipe || row.peran || row.role || '').toLowerCase().trim();
          const kelasVal = String(row.class || row.kelas || row.rombel || '').trim();
          const jabatanVal = String(row.position || row.jabatan || row.posisi || '').trim();

          // Deteksi tipe secara fleksibel
          let cleanTipe = 'siswa';
          if (rawTipe.includes('guru') || rawTipe.includes('pendidik') || rawTipe === 'teacher') {
            cleanTipe = 'guru';
          } else if (rawTipe.includes('staf') || rawTipe.includes('staff') || rawTipe.includes('tu') || rawTipe === 'tendik') {
            cleanTipe = 'staf';
          } else if (rawTipe.includes('siswa') || rawTipe === 'student') {
            cleanTipe = 'siswa';
          } else if (jabatanVal && !kelasVal) {
            // Jika kolom kelas kosong tapi jabatan terisi, jangan anggap siswa
            cleanTipe = 'guru';
          }

          return {
            nisn: identifier,
            nama: nama,
            tipe: cleanTipe,
            kelas: cleanTipe === 'siswa' ? (kelasVal || null) : null,
            jabatan: cleanTipe !== 'siswa' ? (jabatanVal || (cleanTipe === 'guru' ? 'Guru' : 'Staf')) : null,
            tahun: tahunImport,
            token: existingToken ? existingToken : generateRandomToken(6),
            sudah_memilih: false,
          };
        })
        .filter((item) => item.nisn);

      if (payload.length === 0) {
        throw new Error('Kolom identifier/nisn/nip tidak ditemukan atau kosong pada berkas CSV.');
      }

      const { error } = await supabase.from('pemilih').insert(payload);
      if (error) throw error;

      setPesan({
        teks: `Berhasil mengimpor ${payload.length} data pemilih!`,
        tipe: 'sukses',
      });
      setFileCSV(null);
      setParsedRows([]);
      fetchPemilih();
    } catch (err: any) {
      setPesan({ teks: `Gagal import: ${err.message}`, tipe: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Simpan manual
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formManual.nisn) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('pemilih').insert([
        {
          nisn: formManual.nisn.trim(),
          nama: formManual.nama.trim(),
          tipe: formManual.tipe,
          kelas: formManual.tipe === 'siswa' ? formManual.kelas.trim() : null,
          jabatan: formManual.tipe !== 'siswa' ? formManual.jabatan.trim() : null,
          tahun: formManual.tahun,
          token: formManual.token.trim() || generateRandomToken(6),
          sudah_memilih: false,
        },
      ]);

      if (error) throw error;

      setModalOpen(false);
      setFormManual({
        tipe: 'siswa',
        nisn: '',
        nama: '',
        kelas: '',
        jabatan: '',
        tahun: '2026',
        token: '',
      });
      fetchPemilih();
      setPesan({ teks: 'Data pemilih berhasil ditambahkan!', tipe: 'sukses' });
    } catch (err: any) {
      alert('Gagal menambahkan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHapusTerpilih = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Hapus ${selectedIds.length} data pemilih yang dipilih?`)) return;

    const { error } = await supabase.from('pemilih').delete().in('id', selectedIds);
    if (!error) {
      setSelectedIds([]);
      fetchPemilih();
      setPesan({ teks: 'Data terpilih berhasil dihapus.', tipe: 'sukses' });
    } else {
      alert('Gagal menghapus: ' + error.message);
    }
  };

  // Filter Data
  const filteredData = pemilihList.filter((item) => {
    const matchSearch =
      item.nisn?.toLowerCase().includes(search.toLowerCase()) ||
      item.nama?.toLowerCase().includes(search.toLowerCase()) ||
      item.tipe?.toLowerCase().includes(search.toLowerCase());

    const matchTahun = !filterTahun || item.tahun === filterTahun;
    const matchTipe = filterTipe === 'Semua' || item.tipe?.toLowerCase() === filterTipe.toLowerCase();
    const matchKelas = !filterKelas || item.kelas?.toLowerCase().includes(filterKelas.toLowerCase());

    return matchSearch && matchTahun && matchTipe && matchKelas;
  });

  const handleExportExcel = () => {
    if (filteredData.length === 0) {
      alert('Tidak ada data yang sesuai filter untuk diexport!');
      return;
    }

    const dataFormatted = filteredData.map((item, idx) => ({
      No: idx + 1,
      Tipe: (item.tipe || 'siswa').toUpperCase(),
      'Identifier (NISN/NIP)': item.nisn,
      Nama: item.nama || '-',
      'Kelas / Jabatan': item.tipe === 'siswa' ? item.kelas || '-' : item.jabatan || '-',
      Tahun: item.tahun || '-',
      Token: item.token,
      'Sudah Memilih': item.sudah_memilih ? 'YA' : 'BELUM',
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataFormatted);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pemilih');
    XLSX.writeFile(workbook, `Data_Pemilih_${filterTipe}_${Date.now()}.xlsx`);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredData.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredData.map((item) => item.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const cardClass = isDark
    ? 'bg-[#181818] border-[#262626] text-gray-200'
    : 'bg-white border-slate-200 text-slate-800 shadow-sm';

  const inputClass = isDark
    ? 'bg-[#121212] border-[#2a2a2a] text-gray-100 placeholder:text-gray-500 focus:border-blue-500'
    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-600 focus:bg-white';

  const headingClass = isDark ? 'text-white' : 'text-slate-900';
  const subtextClass = isDark ? 'text-gray-400' : 'text-slate-500';
  const labelClass = isDark ? 'text-gray-300' : 'text-slate-700';

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-xs transition-colors duration-200">
      {pesan && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            pesan.tipe === 'sukses'
              ? isDark
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : isDark
              ? 'bg-rose-950/40 border-rose-800 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {pesan.teks}
        </div>
      )}

      {/* Pengaturan Import */}
      <div className={`border rounded-2xl p-6 transition-colors duration-200 ${cardClass}`}>
        <div>
          <h2 className={`text-base font-bold ${headingClass}`}>Pengaturan Import</h2>
          <p className={`text-xs mt-0.5 ${subtextClass}`}>
            Isi tahun dan pilih berkas CSV data pemilih.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${labelClass}`}>Tahun</label>
            <input
              type="text"
              value={tahunImport}
              onChange={(e) => setTahunImport(e.target.value)}
              className={`w-full border rounded-lg px-3.5 py-2.5 focus:outline-none transition ${inputClass}`}
            />
            <p className={`text-[11px] mt-1.5 ${subtextClass}`}>
              Tahun akademik/penyelenggaraan data pemilih.
            </p>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${labelClass}`}>File CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className={`w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold cursor-pointer border rounded-lg p-1.5 transition ${
                isDark
                  ? 'text-gray-300 file:bg-[#262626] file:text-gray-200 hover:file:bg-[#333333] bg-[#121212] border-[#2a2a2a]'
                  : 'text-slate-600 file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 bg-slate-50 border-slate-200'
              }`}
            />
            <p className={`text-[11px] mt-1 ${subtextClass}`}>
              {fileCSV ? fileCSV.name : 'Belum ada file dipilih.'}
            </p>

            <div
              className={`mt-3 border rounded-xl p-3 text-[11px] space-y-2 ${
                isDark ? 'bg-[#121212] border-[#262626] text-gray-400' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className={`font-semibold block ${headingClass}`}>Format kolom CSV:</span>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold px-2 py-0.5 rounded text-[10px]">
                  Siswa
                </span>
                <code className={`font-mono ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                  type,identifier,name,class,token
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold px-2 py-0.5 rounded text-[10px]">
                  Guru
                </span>
                <code className={`font-mono ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                  type,identifier,name,position,token
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 font-semibold px-2 py-0.5 rounded text-[10px]">
                  Staf
                </span>
                <code className={`font-mono ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                  type,identifier,name,position,token
                </code>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleImportSubmit}
            disabled={loading || !fileCSV}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            <span>📤</span> {loading ? 'Memproses...' : 'Mulai Import'}
          </button>
          <span className={`text-[11px] ${subtextClass}`}>Pastikan file berformat CSV.</span>
        </div>
      </div>

      {/* Tambah Pemilih Manual */}
      <div className={`border rounded-2xl p-6 flex justify-between items-center transition-colors duration-200 ${cardClass}`}>
        <div>
          <h2 className={`text-base font-bold ${headingClass}`}>Tambah Pemilih</h2>
          <p className={`text-xs mt-0.5 ${subtextClass}`}>
            Tambahkan satu data pemilih secara manual.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
        >
          <span>+</span> Tambah Pemilih
        </button>
      </div>

      {/* Filter Bar & Tabel */}
      <div className={`border rounded-2xl p-6 space-y-4 transition-colors duration-200 ${cardClass}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${subtextClass}`}>Cari Pemilih</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari identifier / nama / tipe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full border rounded-lg pl-8 pr-3 py-2 text-xs focus:outline-none transition ${inputClass}`}
              />
              <span className="absolute left-2.5 top-2 text-xs text-gray-400">🔍</span>
            </div>
          </div>

          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${subtextClass}`}>Filter Tahun</label>
            <input
              type="text"
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition ${inputClass}`}
            />
          </div>

          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${subtextClass}`}>Filter Tipe</label>
            <select
              value={filterTipe}
              onChange={(e) => setFilterTipe(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition ${inputClass}`}
            >
              <option value="Semua">Semua</option>
              <option value="Siswa">Siswa</option>
              <option value="Guru">Guru</option>
              <option value="Staf">Staf</option>
            </select>
          </div>

          <div>
            <label className={`block text-[11px] font-semibold mb-1 ${subtextClass}`}>Filter Kelas</label>
            <input
              type="text"
              placeholder="cth: VII A / 8B / XII-1"
              value={filterKelas}
              onChange={(e) => setFilterKelas(e.target.value)}
              className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none transition ${inputClass}`}
            />
          </div>
        </div>

        {/* Tombol Aksi */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
          >
            <span>📥</span> Export Excel
          </button>

          <button
            onClick={handleHapusTerpilih}
            disabled={selectedIds.length === 0}
            className={`border text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-40 flex items-center gap-1.5 ${
              isDark
                ? 'bg-rose-950/60 hover:bg-rose-900 border-rose-800 text-rose-300'
                : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-600'
            }`}
          >
            <span>🗑️</span> Hapus Terpilih ({selectedIds.length})
          </button>
        </div>

        {/* Tabel Data */}
        <div className={`overflow-x-auto rounded-xl border ${isDark ? 'border-[#262626]' : 'border-slate-200'}`}>
          <table className={`w-full text-left text-xs ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>
            <thead
              className={`uppercase font-semibold tracking-wider border-b ${
                isDark
                  ? 'bg-[#1f1f1f] text-gray-400 border-[#262626]'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredData.length > 0 && selectedIds.length === filteredData.length}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3">TIPE</th>
                <th className="px-4 py-3">IDENTIFIER (NISN/NIP)</th>
                <th className="px-4 py-3">NAMA</th>
                <th className="px-4 py-3">KELAS / JABATAN</th>
                <th className="px-4 py-3">TOKEN</th>
                <th className="px-4 py-3">STATUS</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-[#262626]' : 'divide-slate-100'}`}>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`text-center py-8 ${subtextClass}`}>
                    Tidak ada data pemilih yang sesuai kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition ${isDark ? 'hover:bg-[#202020]' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelectOne(item.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`font-semibold uppercase text-[10px] px-2 py-0.5 rounded border ${
                          item.tipe === 'guru'
                            ? isDark
                              ? 'bg-blue-950 text-blue-400 border-blue-800/60'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                            : item.tipe === 'staf'
                            ? isDark
                              ? 'bg-purple-950 text-purple-400 border-purple-800/60'
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                            : isDark
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800/60'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {item.tipe || 'siswa'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-mono font-semibold ${headingClass}`}>{item.nisn}</td>
                    <td className={`px-4 py-3 font-medium ${headingClass}`}>{item.nama || '-'}</td>
                    <td className={`px-4 py-3 ${subtextClass}`}>
                      {item.tipe === 'siswa' ? item.kelas || '-' : item.jabatan || '-'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-blue-500">{item.token}</td>
                    <td className="px-4 py-3">
                      {item.sudah_memilih ? (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            isDark
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          Sudah Memilih
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            isDark
                              ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                              : 'bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          Belum Memilih
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah Manual */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div
            className={`border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl ${
              isDark ? 'bg-[#1c1c1c] border-[#2e2e2e]' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`flex justify-between items-center pb-2 border-b ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
              <h3 className={`text-sm font-bold ${headingClass}`}>Tambah Pemilih Manual</h3>
              <button
                onClick={() => setModalOpen(false)}
                className={`${subtextClass} hover:${headingClass} text-base`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className={`block mb-1 font-semibold ${labelClass}`}>Tipe Pemilih</label>
                <select
                  value={formManual.tipe}
                  onChange={(e) => setFormManual({ ...formManual, tipe: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2.5 focus:outline-none transition ${inputClass}`}
                >
                  <option value="siswa">🎓 Siswa</option>
                  <option value="guru">👨‍🏫 Guru</option>
                  <option value="staf">💼 Staf</option>
                </select>
              </div>

              <div>
                <label className={`block mb-1 font-semibold ${labelClass}`}>
                  {formManual.tipe === 'siswa'
                    ? 'NISN Siswa'
                    : formManual.tipe === 'guru'
                    ? 'NIP / NUPTK Guru'
                    : 'Nomor Identitas Staf'}
                </label>
                <input
                  type="text"
                  required
                  value={formManual.nisn}
                  onChange={(e) => setFormManual({ ...formManual, nisn: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2.5 focus:outline-none transition ${inputClass}`}
                  placeholder={
                    formManual.tipe === 'siswa'
                      ? 'Contoh: 0071234567'
                      : formManual.tipe === 'guru'
                      ? 'Contoh: 19880718...'
                      : 'Contoh: STAF-001'
                  }
                />
              </div>

              <div>
                <label className={`block mb-1 font-semibold ${labelClass}`}>Nama Lengkap</label>
                <input
                  type="text"
                  value={formManual.nama}
                  onChange={(e) => setFormManual({ ...formManual, nama: e.target.value })}
                  className={`w-full border rounded-lg px-3 py-2.5 focus:outline-none transition ${inputClass}`}
                  placeholder="Nama pemilih..."
                />
              </div>

              {formManual.tipe === 'siswa' ? (
                <div>
                  <label className={`block mb-1 font-semibold ${labelClass}`}>Kelas</label>
                  <input
                    type="text"
                    value={formManual.kelas}
                    onChange={(e) => setFormManual({ ...formManual, kelas: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2.5 focus:outline-none transition ${inputClass}`}
                    placeholder="Contoh: VII A / 8-B / 12 MIPA 1"
                  />
                </div>
              ) : (
                <div>
                  <label className={`block mb-1 font-semibold ${labelClass}`}>
                    {formManual.tipe === 'guru' ? 'Jabatan / Posisi Guru' : 'Bagian / Posisi Staf'}
                  </label>
                  <input
                    type="text"
                    value={formManual.jabatan}
                    onChange={(e) => setFormManual({ ...formManual, jabatan: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2.5 focus:outline-none transition ${inputClass}`}
                    placeholder={
                      formManual.tipe === 'guru'
                        ? 'Contoh: Guru Matematika / Wali Kelas'
                        : 'Contoh: Tata Usaha / Keamanan'
                    }
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`block mb-1 font-semibold ${labelClass}`}>Tahun</label>
                  <input
                    type="text"
                    value={formManual.tahun}
                    onChange={(e) => setFormManual({ ...formManual, tahun: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2.5 focus:outline-none transition ${inputClass}`}
                  />
                </div>
                <div>
                  <label className={`block mb-1 font-semibold ${labelClass}`}>Token (Opsional)</label>
                  <input
                    type="text"
                    value={formManual.token}
                    onChange={(e) => setFormManual({ ...formManual, token: e.target.value })}
                    className={`w-full border rounded-lg px-3 py-2.5 focus:outline-none transition uppercase font-mono ${inputClass}`}
                    placeholder="Otomatis"
                  />
                </div>
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${isDark ? 'border-[#2a2a2a]' : 'border-slate-100'}`}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className={`px-4 py-2 ${subtextClass} hover:${headingClass}`}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 shadow-md"
                >
                  {loading ? 'Menyimpan...' : 'Simpan Pemilih'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}