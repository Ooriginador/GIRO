'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import { CheckCircle2, Copy, Key, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('never');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const data = (await apiClient.getApiKeys()) as { api_keys: ApiKey[] };
      setApiKeys(data.api_keys || []);
    } catch (error) {
      console.error('Failed to load API keys:', error);
      setApiKeys([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const expiryDays = newKeyExpiry === 'never' ? undefined : parseInt(newKeyExpiry);
      const result = (await apiClient.createApiKey(newKeyName, expiryDays)) as { key: string };
      setNewlyCreatedKey(result.key);

      await loadApiKeys();
      setNewKeyName('');
      setNewKeyExpiry('never');
      setCreateDialogOpen(false);
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    try {
      await apiClient.revokeApiKey(keyId);
      await loadApiKeys();
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const maskKey = (keyPrefix: string) => {
    // O backend retorna apenas o prefix (ex: giro_sk_live_XXXX...YYYY)
    return keyPrefix;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold mb-2">API Keys</h2>
          <p className="text-gray-600">Gerencie chaves de API para integração</p>
        </div>

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova API Key</DialogTitle>
              <DialogDescription>
                Gere uma nova chave de API para integração com o GIRO
              </DialogDescription>
            </DialogHeader>

            {newlyCreatedKey ? (
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-2 font-semibold">
                    ⚠️ Guarde esta chave em local seguro!
                  </p>
                  <p className="text-xs text-yellow-700">
                    Esta é a única vez que você verá esta chave. Ela não poderá ser recuperada
                    depois.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Sua Nova API Key</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={newlyCreatedKey} className="font-mono text-sm" />
                    <Button variant="outline" onClick={() => copyToClipboard(newlyCreatedKey)}>
                      {copiedKey === newlyCreatedKey ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => {
                    setNewlyCreatedKey(null);
                    setCreateDialogOpen(false);
                  }}
                  className="w-full"
                >
                  Fechar
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Nome da Chave</Label>
                  <Input
                    id="keyName"
                    placeholder="Ex: Production API, Mobile App"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    required
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiração</Label>
                  <select
                    id="expiry"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    disabled={creating}
                  >
                    <option value="never">Nunca expira</option>
                    <option value="30">30 dias</option>
                    <option value="90">90 dias</option>
                    <option value="180">180 dias</option>
                    <option value="365">1 ano</option>
                  </select>
                </div>

                <Button type="submit" disabled={creating} className="w-full">
                  {creating ? 'Criando...' : 'Criar API Key'}
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      ) : apiKeys.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">Nenhuma API key criada ainda</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira API Key
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => {
            const expired = isExpired(apiKey.expires_at);

            return (
              <Card key={apiKey.id} className={expired ? 'opacity-60' : ''}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Key className="w-5 h-5" />
                        {apiKey.name}
                        {expired && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                            Expirada
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Criada em {formatDate(apiKey.created_at)}
                      </CardDescription>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Revogar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revogar API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A chave <strong>{apiKey.name}</strong>{' '}
                            será permanentemente revogada e todas as integrações que a utilizam
                            deixarão de funcionar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevoke(apiKey.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Revogar Permanentemente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={maskKey(apiKey.key_prefix)}
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(apiKey.key_prefix)}
                        title="Copiar prefixo (chave completa não disponível)"
                      >
                        {copiedKey === apiKey.key_prefix ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Último uso</div>
                        <div>{formatDate(apiKey.last_used_at)}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Expira em</div>
                        <div>
                          {apiKey.expires_at ? formatDate(apiKey.expires_at) : 'Nunca expira'}
                        </div>
                      </div>
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
