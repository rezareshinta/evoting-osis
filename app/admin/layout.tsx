'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const isAuthPage = pathname === '/admin/login' || pathname === '/admin/register';

  useEffect(() => {
    const savedTheme = localStorage.getItem('admin_theme_mode');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }

    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session && !isAuthPage) {
        router.replace('/admin/login');
      } else if (session && isAuthPage) {
        router.replace('/admin/hasil');
      } else {
        setLoading(false);
      }
    };

    checkUser();
  }, [pathname, isAuthPage, router]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const nextMode = !prev;
      localStorage.setItem('admin_theme_mode', nextMode ? 'dark' : 'light');
      return nextMode;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  };

  if (isAuthPage) {
    return <main className="min-h-screen bg-[#f8fafc]">{children}</main>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-slate-500 text-xs">
        Memverifikasi akses admin...
      </div>
    );
  }

  const menuItems = [
    { label: 'Hasil Pemilihan', href: '/admin/hasil', icon: '📊' },
    { label: 'Twibbon Pemenang', href: '/admin/twibbon', icon: '✨' },
    { category: 'Manajemen Data' },
    { label: 'Pemilihan', href: '/admin/pemilihan', icon: '📅' },
    { label: 'Kandidat', href: '/admin/kandidat', icon: '👥' },
    { label: 'Pemilih', href: '/admin/pemilih', icon: '📇' },
  ];

  return (
    <div
      className={`min-h-screen flex text-xs transition-colors duration-300 ${
        isDarkMode ? 'bg-[#121212] text-gray-200' : 'bg-[#f8fafc] text-slate-800 light-admin-override'
      }`}
    >
      {/* CSS Penimpa Otomatis: Memaksa semua kartu hitam jadi putih saat mode terang */}
      {!isDarkMode && (
        <style jsx global>{`
          .light-admin-override div[class*="bg-[#1"],
          .light-admin-override div[class*="bg-[#2"],
          .light-admin-override div[class*="bg-neutral"],
          .light-admin-override div[class*="bg-zinc-9"],
          .light-admin-override aside ~ main div[class*="rounded"] {
            background-color: #ffffff !important;
            border-color: #e2e8f0 !important;
            color: #1e293b !important;
          }
          .light-admin-override input,
          .light-admin-override select,
          .light-admin-override textarea {
            background-color: #f8fafc !important;
            border-color: #cbd5e1 !important;
            color: #0f172a !important;
          }
          .light-admin-override input::placeholder {
            color: #94a3b8 !important;
          }
          .light-admin-override h1,
          .light-admin-override h2,
          .light-admin-override h3,
          .light-admin-override strong {
            color: #0f172a !important;
          }
          .light-admin-override p {
            color: #64748b;
          }
          .light-admin-override table th {
            background-color: #f1f5f9 !important;
            color: #334155 !important;
            border-color: #e2e8f0 !important;
          }
          .light-admin-override table td {
            background-color: #ffffff !important;
            color: #1e293b !important;
            border-color: #f1f5f9 !important;
          }
        `}</style>
      )}

      {/* Sidebar */}
      <aside
        className={`w-56 border-r flex flex-col justify-between p-3 flex-shrink-0 transition-colors duration-300 ${
          isDarkMode
            ? 'bg-[#181818] border-[#262626]'
            : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div>
          <div className="flex items-center gap-2 px-2 py-3 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
              🗳️
            </div>
            <span
              className={`font-bold text-sm tracking-wide ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              E-Voting OSIS
            </span>
          </div>

          <nav className="space-y-0.5">
            {menuItems.map((item, idx) => {
              if (item.category) {
                return (
                  <p
                    key={idx}
                    className={`text-[10px] uppercase tracking-wider font-semibold px-2 pt-4 pb-1 ${
                      isDarkMode ? 'text-gray-500' : 'text-slate-400'
                    }`}
                  >
                    {item.category}
                  </p>
                );
              }

              const isActive = pathname === item.href;

              return (
                <Link
                  key={idx}
                  href={item.href || '#'}
                  className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md font-medium transition ${
                    isActive
                      ? isDarkMode
                        ? 'bg-[#262626] text-white border-l-2 border-blue-500 pl-2'
                        : 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 pl-2 font-semibold'
                      : isDarkMode
                      ? 'text-gray-400 hover:bg-[#1f1f1f] hover:text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="text-sm">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className={`pt-3 border-t space-y-2 px-1 ${
            isDarkMode ? 'border-[#262626]' : 'border-slate-200'
          }`}
        >
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-[11px] font-medium transition border ${
              isDarkMode
                ? 'bg-[#222222] border-[#333333] text-amber-300 hover:bg-[#2a2a2a]'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>{isDarkMode ? '🌙' : '☀️'}</span>
              <span>{isDarkMode ? 'Mode Gelap' : 'Mode Terang'}</span>
            </span>
            <span className="text-[10px] text-gray-400">Ganti</span>
          </button>

          <div className="space-y-0.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 rounded transition"
            >
              <span>🚪</span> Keluar (Logout)
            </button>
            <Link
              href="/"
              className={`text-[11px] block px-2 py-1 transition ${
                isDarkMode
                  ? 'text-gray-500 hover:text-gray-300'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              ← Beranda
            </Link>
          </div>
        </div>
      </aside>

      {/* Konten Utama */}
      <main
        className={`flex-1 p-6 overflow-y-auto flex justify-center transition-colors duration-300 ${
          isDarkMode ? 'bg-[#121212]' : 'bg-[#f8fafc]'
        }`}
      >
        <div className="w-full max-w-4xl">{children}</div>
      </main>
    </div>
  );
}