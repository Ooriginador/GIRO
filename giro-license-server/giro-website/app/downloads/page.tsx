import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/sections/Footer";
import { getLatestMobileRelease, getLatestRelease } from "@/lib/github";
import { Download, Monitor, Smartphone, Terminal } from "lucide-react";

export default async function DownloadsPage() {
  const latestRelease = await getLatestRelease();
  const latestMobileRelease = await getLatestMobileRelease();

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <Navbar />

      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Downloads</h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              Baixe a versão mais recente do GIRO para sua plataforma preferida.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Windows */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 transition-transform">
                <Monitor className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Windows</h2>
              <p className="text-slate-400 mb-6">
                Para Windows 10 e 11 (64-bit)
              </p>
              {latestRelease?.assets.windows ? (
                <a
                  href={latestRelease.assets.windows}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Baixar Installer (.exe)
                </a>
              ) : (
                <button
                  disabled
                  className="w-full py-4 bg-slate-700 rounded-xl font-semibold text-slate-500 cursor-not-allowed"
                >
                  Indisponível
                </button>
              )}
              <div className="mt-4 text-center text-sm text-slate-500">
                Versão {latestRelease?.version || "..."}
              </div>
            </div>

            {/* Android */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Android</h2>
              <p className="text-slate-400 mb-6">Para smartphones e tablets</p>
              {latestMobileRelease?.apk ? (
                <a
                  href={latestMobileRelease.apk}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Baixar APK
                </a>
              ) : (
                <button
                  disabled
                  className="w-full py-4 bg-slate-700 rounded-xl font-semibold text-slate-500 cursor-not-allowed"
                >
                  Em Breve
                </button>
              )}
              <div className="mt-4 text-center text-sm text-slate-500">
                Versão {latestMobileRelease?.version || "..."}
              </div>
            </div>

            {/* Linux */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-white/10 hover:border-emerald-500/50 transition-colors group">
              <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center mb-6 text-orange-400 group-hover:scale-110 transition-transform">
                <Terminal className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Linux</h2>
              <p className="text-slate-400 mb-6">
                Compatível com principais distros
              </p>
              <div className="space-y-3">
                {latestRelease?.assets.linux_appimage ? (
                  <a
                    href={latestRelease.assets.linux_appimage}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    AppImage
                  </a>
                ) : null}
                {latestRelease?.assets.linux_deb ? (
                  <a
                    href={latestRelease.assets.linux_deb}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    .deb (Debian/Ubuntu)
                  </a>
                ) : null}
                {!latestRelease?.assets.linux_deb &&
                  !latestRelease?.assets.linux_appimage && (
                    <button
                      disabled
                      className="w-full py-4 bg-slate-700 rounded-xl font-semibold text-slate-500 cursor-not-allowed"
                    >
                      Indisponível
                    </button>
                  )}
              </div>
              <div className="mt-4 text-center text-sm text-slate-500">
                Versão {latestRelease?.version || "..."}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
