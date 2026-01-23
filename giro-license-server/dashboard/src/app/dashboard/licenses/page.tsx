'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api';
import { CheckCircle2, Copy, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

interface License {
  license_key: string;
  plan_type: string;
  status: string;
  max_devices: number;
  expires_at: string;
  created_at: string;
  company_name: string | null;
}

interface LicenseDetails extends License {
  activations: {
    hardware_id: string;
    device_name: string | null;
    activated_at: string;
    last_heartbeat: string | null;
    is_active: boolean;
  }[];
  usage: {
    active_devices: number;
    total_activations: number;
  };
}

export default function LicensesPage() {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState('monthly');
  const [quantity, setQuantity] = useState(1);
  const [creating, setCreating] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdLicenses, setCreatedLicenses] = useState<string[]>([]);
  const [showCreatedModal, setShowCreatedModal] = useState(false);

  const loadLicenses = async () => {
    try {
      const data = (await apiClient.getLicenses()) as { licenses: License[] };
      setLicenses(data.licenses || []);
    } catch (error) {
      console.error('Failed to load licenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLicenses();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const response = (await apiClient.createLicenses(planType, quantity)) as {
        licenses: { license_key: string }[];
        message: string;
      };

      // Capturar as chaves criadas
      const keys = response.licenses?.map((l) => l.license_key) || [];
      if (keys.length > 0) {
        setCreatedLicenses(keys);
        setShowCreatedModal(true);
      }

      await loadLicenses();
      setQuantity(1);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50';
      case 'expired':
        return 'text-red-600 bg-red-50';
      case 'suspended':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Mock license details - will be replaced with API call
  const getMockDetails = (license: License): LicenseDetails => ({
    ...license,
    activations: [
      {
        hardware_id: 'HW-XXXX-XXXX-XXXX',
        device_name: 'Desktop Principal',
        activated_at: new Date().toISOString(),
        last_heartbeat: new Date().toISOString(),
        is_active: true,
      },
      {
        hardware_id: 'HW-YYYY-YYYY-YYYY',
        device_name: 'Notebook Vendas',
        activated_at: new Date(Date.now() - 86400000).toISOString(),
        last_heartbeat: new Date(Date.now() - 3600000).toISOString(),
        is_active: false,
      },
    ],
    usage: {
      active_devices: 1,
      total_activations: 2,
    },
  });

  const copyAllKeys = () => {
    navigator.clipboard.writeText(createdLicenses.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      {/* Modal de Licenças Criadas */}
      <Dialog open={showCreatedModal} onOpenChange={setShowCreatedModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Licenças Criadas com Sucesso!
            </DialogTitle>
            <DialogDescription>
              {createdLicenses.length} licença(s) criada(s). Copie as chaves abaixo:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {createdLicenses.map((key, index) => (
              <div
                key={key}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
              >
                <code className="font-mono text-sm font-bold text-gray-800">{key}</code>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(key)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={copyAllKeys}>
              {copied ? 'Copiado!' : 'Copiar Todas'}
            </Button>
            <Button className="flex-1" onClick={() => setShowCreatedModal(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Licenças</h2>
        <p className="text-gray-600">Gerencie as licenças do GIRO</p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Criar Novas Licenças</CardTitle>
          <CardDescription>Gere novas chaves de licença</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="planType">Tipo de Plano</Label>
                <select
                  id="planType"
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={creating}
                >
                  <option value="monthly">Mensal - R$ 99,90/mês</option>
                  <option value="semiannual">Semestral - R$ 599,40 (14% off)</option>
                  <option value="annual">Anual - R$ 999,00 (17% off)</option>
                  <option value="lifetime">
                    Vitalício - R$ 2.499,00 (2 anos suporte + 5 anos validação)
                  </option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max="100"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  disabled={creating}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? 'Criando...' : 'Criar Licenças'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {licenses.map((license) => {
            const details = getMockDetails(license);

            return (
              <Card key={license.license_key}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-mono text-sm font-bold">{license.license_key}</div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(license.license_key)}
                          className="h-6 w-6 p-0"
                        >
                          {copied ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <div className="text-sm text-gray-600">
                        {license.company_name || 'Sem empresa'}
                      </div>
                      <div className="flex gap-2 items-center text-xs text-gray-500">
                        <span>Plano: {license.plan_type}</span>
                        <span>•</span>
                        <span>Dispositivos: {license.max_devices}</span>
                        <span>•</span>
                        <span>
                          Expira: {new Date(license.expires_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          license.status
                        )}`}
                      >
                        {license.status}
                      </span>

                      {/* License Details Dialog */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedLicense(license.license_key)}
                          >
                            <Info className="w-4 h-4 mr-2" />
                            Detalhes
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes da Licença</DialogTitle>
                            <DialogDescription className="font-mono">
                              {license.license_key}
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-6">
                            {/* Resumo */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-sm text-gray-500">Plano</div>
                                <div className="font-semibold capitalize">{license.plan_type}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Status</div>
                                <div className="font-semibold capitalize">{license.status}</div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Dispositivos Ativos</div>
                                <div className="font-semibold">
                                  {details.usage.active_devices} / {license.max_devices}
                                </div>
                              </div>
                              <div>
                                <div className="text-sm text-gray-500">Total de Ativações</div>
                                <div className="font-semibold">
                                  {details.usage.total_activations}
                                </div>
                              </div>
                            </div>

                            {/* Histórico de Ativações */}
                            <div>
                              <h3 className="font-semibold mb-3">Histórico de Ativações</h3>
                              {details.activations.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">
                                  Nenhuma ativação registrada
                                </p>
                              ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                  {details.activations.map((activation, idx) => (
                                    <div key={idx} className="border rounded-lg p-3 text-sm">
                                      <div className="flex justify-between items-start mb-1">
                                        <div>
                                          <div className="font-semibold">
                                            {activation.device_name || 'Dispositivo sem nome'}
                                          </div>
                                          <div className="text-xs text-gray-500 font-mono">
                                            {activation.hardware_id}
                                          </div>
                                        </div>
                                        <span
                                          className={`px-2 py-1 rounded-full text-xs ${
                                            activation.is_active
                                              ? 'bg-green-50 text-green-700'
                                              : 'bg-gray-50 text-gray-700'
                                          }`}
                                        >
                                          {activation.is_active ? 'Ativo' : 'Inativo'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 mt-2">
                                        <div>
                                          Ativado:{' '}
                                          {new Date(activation.activated_at).toLocaleString(
                                            'pt-BR'
                                          )}
                                        </div>
                                        {activation.last_heartbeat && (
                                          <div>
                                            Último heartbeat:{' '}
                                            {new Date(activation.last_heartbeat).toLocaleString(
                                              'pt-BR'
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Ações */}
                            <div className="flex gap-2 pt-4 border-t">
                              <Button variant="outline" size="sm" className="flex-1">
                                Transferir Licença
                              </Button>
                              <Button variant="destructive" size="sm" className="flex-1">
                                Revogar Licença
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
