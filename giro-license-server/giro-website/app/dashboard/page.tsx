"use client";

import {
  getHardware,
  getLicenses,
  getProfile,
  Hardware,
  License,
  UserProfile,
} from "@/lib/api";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Key,
  Laptop,
  LogOut,
  Monitor,
  ShieldCheck,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  console.log("[TRACE] DashboardPage Rendering");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [hardware, setHardware] = useState<Hardware[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const [userData, licenseRes, hardwareData] = await Promise.all([
          getProfile(),
          getLicenses(),
          getHardware(),
        ]);
        setUser(userData);
        setLicenses(licenseRes.data || []);
        setHardware(hardwareData);
      } catch (error: any) {
        console.error("Failed to fetch dashboard data:", error);
        if (
          error.message === "Sessão expirada" ||
          error.message?.includes("401")
        ) {
          // api.ts handles the redirect for 401, but we can do it here too just in case
          router.push(
            `/login?redirect=${encodeURIComponent(window.location.pathname)}`,
          );
        } else {
          setError(
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-4">
        <div className="bg-white/5 border border-red-500/20 rounded-xl p-8 text-center max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erro de Conexão</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            >
              Tentar Novamente
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-emerald-400 to-blue-500">
              GIRO
            </span>
            <span className="text-sm px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Painel do Cliente
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/profile")}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
              title="Meu Perfil"
            >
              <User className="w-4 h-4" />
              <span className="hidden md:inline text-sm">
                {user?.name?.split(" ")?.[0] || user?.email}
              </span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
              title="Sair"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-6 md:grid-cols-3"
        >
          <div className="md:col-span-2 bg-linear-to-br from-emerald-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <h1 className="text-3xl font-bold text-white mb-2">
              Olá, {user?.name?.split(" ")?.[0]} 👋
            </h1>
            <p className="text-gray-400">
              Gerencie suas licenças e dispositivos ativos em um só lugar.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-400 text-sm">Status da Conta</p>
                <p className="text-xl font-bold text-white mt-1">Ativo</p>
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-sm text-gray-500">
                Membro desde{" "}
                {user?.created_at
                  ? new Date(user.created_at).getFullYear()
                  : new Date().getFullYear()}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Licenses Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-6 h-6 text-emerald-500" />
            <h2 className="text-xl font-bold text-white">Minhas Licenças</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {licenses.length > 0 ? (
              licenses.map((license, index) => (
                <div
                  key={index}
                  className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-emerald-500/50 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 capitalize">
                      {license.plan_type}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 text-xs capitalize ${
                        license.status === "active"
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          license.status === "active"
                            ? "bg-emerald-400"
                            : "bg-red-400"
                        }`}
                      />
                      {license.status}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                        Chave de Licença
                      </p>
                      <div className="flex items-center gap-2 bg-black/30 rounded-lg p-2 font-mono text-sm text-gray-300 break-all border border-white/5 group-hover:border-white/10 transition-colors">
                        <span className="flex-1 select-all">
                          {license.license_key}
                        </span>
                        <button
                          onClick={() => handleCopyKey(license.license_key)}
                          className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-colors shrink-0"
                          title="Copiar chave"
                        >
                          {copiedKey === license.license_key ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Expira em:</span>
                      <span className="text-gray-300">
                        {license.expires_at
                          ? new Date(license.expires_at).toLocaleDateString()
                          : "Vitalício"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full bg-white/5 border border-white/10 rounded-xl p-8 text-center">
                <AlertCircle className="w-10 h-10 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-300 font-medium">
                  Nenhuma licença encontrada
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Adquira um plano para começar a usar.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => router.push("/#precos")}
                    className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Ver Planos
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.section>

        {/* Devices Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Monitor className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold text-white">
              Dispositivos Conectados
            </h2>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {hardware.length > 0 ? (
              <div className="divide-y divide-white/10">
                {hardware.map((device) => (
                  <div
                    key={device.id}
                    className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <Laptop className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-medium">
                          {device.machine_name || "Dispositivo desconhecido"}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                            {device.os_version || "SO desconhecido"}
                          </span>
                          <span className="text-xs text-gray-600 hidden md:inline-block">
                            ID: {device.fingerprint.substring(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 md:min-w-[200px]">
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Último acesso</p>
                        <p className="text-sm text-gray-300">
                          {new Date(device.last_seen).toLocaleString()}
                        </p>
                      </div>
                      <button
                        className="p-2 hover:bg-red-500/10 text-gray-500 hover:text-red-400 rounded-lg transition-colors"
                        title="Desconectar"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Monitor className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-300">
                  Nenhum dispositivo conectado
                </h3>
                <p className="text-gray-500 mt-1 max-w-sm mx-auto">
                  Baixe o aplicativo desktop e faça login para vincular seu
                  dispositivo.
                </p>
              </div>
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
