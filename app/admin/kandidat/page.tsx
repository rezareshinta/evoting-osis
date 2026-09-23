'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { supabase } from '@/lib/supabase';

interface Kandidat {
  id: number;
  nomor_urut: number;
  nama_ketua: string;
  nama_wakil: string;
  visi: string;
  misi: string;
  foto_url: string;
}

export default function ManajemenKandidatPage() {
  const [kandidatList, setKandidatList] = useState<Kandidat[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [nomorUrut, setNomorUrut] = useState<number | ''>('');
  const [namaKetua, setNamaKetua] = useState('');
  const [namaWakil, setNamaWakil] = useState('');
  const [visi, setVisi] = useState('');
  const [misi, setMisi] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchKandidat = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kandidat')
      .select('*')
      .order('nomor_urut', { ascending: true });

    if (!error && data) {
      setKandidatList(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchKandidat();
  }, []);

  // Tangani saat memilih file dari galeri / disk
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      setPreviewUrl('');
      return;
    }
    const file = e.target.files[0];
    setSelectedFile(file);
    // Buat pratinjau lokal sebelum diunggah
    setPreviewUrl(URL.createObjectURL(file));
  };

  // Unggah foto ke Supabase Storage (Bucket: 'kandidat')
  const uploadImageToSupabase = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `kandidat-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('kandidat')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        alert('Gagal mengunggah foto ke storage: ' + uploadError.message);
        return null;
      }

      // Dapatkan URL publik dari file yang baru diunggah
      const { data } = supabase.storage.from('kandidat').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err: any) {
      alert('Terjadi kesalahan saat unggah foto: ' + err.message);
      return null;
    }
  };

  const resetForm = () => {
    setNomorUrut('');
    setNamaKetua('');
    setNamaWakil('');
    setVisi('');
    setMisi('');
    setFotoUrl('');
    setSelectedFile(null);
    setPreviewUrl('');
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nomorUrut === '') {
      alert('Nomor urut wajib diisi!');
      return;
    }

    setUploading(true);
    let finalImageUrl = fotoUrl;

    // Jika pengguna memilih file baru dari penyimpanan perangkat
    if (selectedFile) {
      const uploadedUrl = await uploadImageToSupabase(selectedFile);
      if (uploadedUrl) {
        finalImageUrl = uploadedUrl;
      } else {
        setUploading(false);
        return;
      }
    }

    const payload = {
      nomor_urut: Number(nomorUrut),
      nama_ketua: namaKetua,
      nama_wakil: namaWakil,
      visi,
      misi,
      foto_url: finalImageUrl,
    };

    if (editingId) {
      const { error } = await supabase
        .from('kandidat')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        alert('Gagal memperbarui data: ' + error.message);
      } else {
        alert('Data kandidat berhasil diperbarui!');
        resetForm();
        fetchKandidat();
      }
    } else {
      const { error } = await supabase.from('kandidat').insert([payload]);

      if (error) {
        alert('Gagal menambahkan data: ' + error.message);
      } else {
        alert('Kandidat baru berhasil ditambahkan!');
        resetForm();
        fetchKandidat();
      }
    }

    setUploading(false);
  };

  const handleEdit = (k: Kandidat) => {
    setEditingId(k.id);
    setNomorUrut(k.nomor_urut);
    setNamaKetua(k.nama_ketua);
    setNamaWakil(k.nama_wakil);
    setVisi(k.visi || '');
    setMisi(k.misi || '');
    setFotoUrl(k.foto_url || '');
    setPreviewUrl(k.foto_url || '');
    setSelectedFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah kamu yakin ingin menghapus data paslon ini?')) return;

    const { error } = await supabase.from('kandidat').delete().eq('id', id);
    if (error) {
      alert('Gagal menghapus: ' + error.message);
    } else {
      fetchKandidat();
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header Halaman */}
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">Manajemen Kandidat</h1>
        <p className="text-[11px] text-gray-400">
          Kelola data paslon ketua dan wakil ketua OSIS serta unggah foto dari perangkat
        </p>
      </div>

      {/* Formulir Input / Edit Data */}
      <div className="bg-[#181818] border border-[#262626] rounded-lg p-4">
        <h2 className="text-xs font-semibold text-white mb-3 flex items-center gap-1.5">
          <span>{editingId ? '✏️' : '➕'}</span>
          {editingId ? 'Edit Data Kandidat' : 'Tambah Paslon Baru'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">
                Nomor Urut
              </label>
              <input
                type="number"
                required
                value={nomorUrut}
                onChange={(e) => setNomorUrut(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Contoh: 1"
                className="w-full bg-[#121212] border border-[#2b2b2b] text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">
                Nama Calon Ketua
              </label>
              <input
                type="text"
                required
                value={namaKetua}
                onChange={(e) => setNamaKetua(e.target.value)}
                placeholder="Nama lengkap ketua"
                className="w-full bg-[#121212] border border-[#2b2b2b] text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">
                Nama Calon Wakil
              </label>
              <input
                type="text"
                required
                value={namaWakil}
                onChange={(e) => setNamaWakil(e.target.value)}
                placeholder="Nama lengkap wakil"
                className="w-full bg-[#121212] border border-[#2b2b2b] text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">Visi</label>
              <textarea
                rows={2}
                value={visi}
                onChange={(e) => setVisi(e.target.value)}
                placeholder="Tuliskan visi paslon..."
                className="w-full bg-[#121212] border border-[#2b2b2b] text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1">Misi</label>
              <textarea
                rows={2}
                value={misi}
                onChange={(e) => setMisi(e.target.value)}
                placeholder="Tuliskan misi paslon..."
                className="w-full bg-[#121212] border border-[#2b2b2b] text-white rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Bagian Upload File Foto Langsung dari Galeri */}
          <div>
            <label className="block text-[11px] font-medium text-gray-300 mb-1">
              Foto Paslon (Pilih dari Galeri / Berkas)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-[11px] text-gray-400 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[11px] file:font-semibold file:bg-[#252525] file:text-blue-400 hover:file:bg-[#2e2e2e] cursor-pointer bg-[#121212] border border-[#2b2b2b] rounded p-1"
              />
              {previewUrl && (
                <div className="w-10 h-10 rounded border border-[#333] overflow-hidden flex-shrink-0 bg-[#141414]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Pratinjau"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              Format: JPG, PNG, atau WEBP. Foto otomatis diunggah ke storage sistem.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-3.5 py-1.5 rounded transition text-[11px] disabled:opacity-50"
            >
              {uploading
                ? 'Mengunggah & Menyimpan...'
                : editingId
                ? 'Simpan Perubahan'
                : 'Tambah Kandidat'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="bg-[#242424] hover:bg-[#2c2c2c] text-gray-300 font-medium px-3 py-1.5 rounded transition text-[11px]"
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Daftar Tabel Kandidat Terdaftar */}
      <div className="bg-[#181818] border border-[#262626] rounded-lg p-4 space-y-3">
        <h2 className="text-xs font-semibold text-white">Daftar Kandidat Terdaftar</h2>

        {loading ? (
          <p className="text-[11px] text-gray-400 py-2">Memuat daftar kandidat...</p>
        ) : kandidatList.length === 0 ? (
          <p className="text-[11px] text-gray-400 py-2">Belum ada kandidat yang dimasukkan.</p>
        ) : (
          <div className="space-y-2">
            {kandidatList.map((k) => (
              <div
                key={k.id}
                className="bg-[#141414] border border-[#222222] rounded-md p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {k.nomor_urut}
                  </div>
                  {k.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={k.foto_url}
                      alt={k.nama_ketua}
                      className="w-10 h-10 rounded-md object-cover border border-[#2e2e2e] flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-[#202020] flex items-center justify-center text-gray-500 text-[10px] flex-shrink-0">
                      No Foto
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-white text-xs leading-tight">
                      {k.nama_ketua} & {k.nama_wakil}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                      {k.visi ? `Visi: ${k.visi}` : 'Belum ada visi tertulis'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(k)}
                    className="bg-[#242424] hover:bg-[#2e2e2e] text-blue-400 px-2.5 py-1 rounded text-[10px] font-medium transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(k.id)}
                    className="bg-rose-950/30 hover:bg-rose-900/50 text-rose-400 px-2.5 py-1 rounded text-[10px] font-medium transition"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}