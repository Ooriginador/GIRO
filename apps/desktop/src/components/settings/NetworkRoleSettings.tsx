/**
 * @file NetworkRoleSettings - Configuração de Rede entre Caixas
 * @description Permite configurar a conexão entre múltiplos computadores na loja
 *
 * PÚBLICO-ALVO: Comerciantes de mercearias e motopeças
 * Linguagem simplificada, sem jargões técnicos
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { invoke, setSetting, getSetting } from '@/lib/tauri';
import {
  CheckCircle2,
  ChevronDown,
  Crown,
  Eye,
  EyeOff,
  HelpCircle,
  Laptop,
  Link,
  Loader2,
  RefreshCw,
  Save,
  Server,
  Settings2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FC } from 'react';

type NetworkRole = 'STANDALONE' | 'MASTER' | 'SATELLITE';

interface RoleOption {
  value: NetworkRole;
  label: string;
  shortLabel: string; // Nome curto para badges
  icon: React.ReactNode;
  description: string;
  scenario: string; // Quando usar esta opção
  color: string;
  bgColor: string;
}

const roleOptions: RoleOption[] = [
  {
    value: 'STANDALONE',
    label: 'Caixa Único',
    shortLabel: 'Único',
    icon: <Laptop className="h-6 w-6" />,
    description: 'Apenas 1 computador na loja',
    scenario: 'Escolha esta opção se você tem apenas um computador para vendas',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  {
    value: 'MASTER',
    label: 'Caixa Principal',
    shortLabel: 'Principal',
    icon: <Crown className="h-6 w-6" />,
    description: 'Computador central da loja',
    scenario: 'Escolha no computador principal. Os outros vão se conectar a ele.',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  {
    value: 'SATELLITE',
    label: 'Caixa Auxiliar',
    shortLabel: 'Auxiliar',
    icon: <Link className="h-6 w-6" />,
    description: 'Conecta ao computador principal',
    scenario: 'Escolha nos computadores secundários. Eles vão buscar dados do Principal.',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
];

interface NetworkStatus {
  isRunning: boolean;
  status: string;
  connectedMaster?: string;
}

interface MobileServerStatus {
  isRunning: boolean;
  port: number;
  connectedDevices: number;
  localIp: string | null;
}

export const NetworkRoleSettings: FC = () => {
  const { toast } = useToast();

  // Estado atual
  const [currentRole, setCurrentRole] = useState<NetworkRole>('STANDALONE');
  const [pendingRole, setPendingRole] = useState<NetworkRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Configurações
  const [terminalName, setTerminalName] = useState('');
  const [networkSecret, setNetworkSecret] = useState('');
  const [masterIp, setMasterIp] = useState('');
  const [masterPort, setMasterPort] = useState('3847');
  const [serverPort, setServerPort] = useState('3847');

  // Status
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null);
  const [serverStatus, setServerStatus] = useState<MobileServerStatus | null>(null);

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Carregar configurações atuais
  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [role, name, secret, ip, mPort, sPort] = await Promise.all([
        getSetting('network.role').catch(() => 'STANDALONE'),
        getSetting('terminal.name').catch(() => ''),
        getSetting('network.secret').catch(() => ''),
        getSetting('network.master_ip').catch(() => ''),
        getSetting('network.master_port').catch(() => '3847'),
        getSetting('network.server_port').catch(() => '3847'),
      ]);

      setCurrentRole((role as NetworkRole) || 'STANDALONE');
      setTerminalName(name || '');
      setNetworkSecret(secret || '');
      setMasterIp(ip || '');
      setMasterPort(mPort || '3847');
      setServerPort(sPort || '3847');
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Buscar status
  const fetchStatus = useCallback(async () => {
    try {
      if (currentRole === 'SATELLITE') {
        const status = await invoke<NetworkStatus>('get_network_status');
        setNetworkStatus(status);
      } else if (currentRole === 'MASTER') {
        const status = await invoke<MobileServerStatus>('get_mobile_server_status');
        setServerStatus(status);
      }
    } catch (error) {
      console.error('Erro ao buscar status:', error);
    }
  }, [currentRole]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!isLoading) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 5000);
      return () => clearInterval(interval);
    }
  }, [isLoading, currentRole, fetchStatus]);

  // Validar antes de salvar
  const validateSettings = (): string | null => {
    const role = pendingRole || currentRole;

    if (!networkSecret.trim() && role !== 'STANDALONE') {
      return 'Defina uma senha para proteger a conexão entre os caixas';
    }

    if (networkSecret.length > 0 && networkSecret.length < 6 && role !== 'STANDALONE') {
      return 'A senha da rede precisa ter pelo menos 6 caracteres';
    }

    if (role === 'SATELLITE' && !terminalName.trim()) {
      return 'Dê um nome a este caixa para identificá-lo (ex: Caixa 2)';
    }

    if (role === 'MASTER' && !terminalName.trim()) {
      return 'Dê um nome a este caixa (ex: Caixa Principal)';
    }

    return null;
  };

  // Detectar mudanças não salvas
  const handleFieldChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  // Salvar configurações
  const handleSave = async () => {
    const error = validateSettings();
    if (error) {
      toast({ title: 'Configuração incompleta', description: error, variant: 'destructive' });
      return;
    }

    const newRole = pendingRole || currentRole;

    // Se está mudando de papel, mostrar confirmação
    if (pendingRole && pendingRole !== currentRole) {
      setShowConfirmDialog(true);
      return;
    }

    await saveSettings(newRole);
  };

  const saveSettings = async (role: NetworkRole) => {
    setIsSaving(true);
    try {
      // Parar serviços atuais antes de mudar
      if (currentRole === 'MASTER') {
        try {
          await invoke('stop_mobile_server');
        } catch {
          // Ignorar se já estava parado
        }
      } else if (currentRole === 'SATELLITE') {
        try {
          await invoke('stop_network_client');
        } catch {
          // Ignorar se já estava parado
        }
      }

      // Salvar todas as configurações
      await Promise.all([
        setSetting('network.role', role),
        setSetting('terminal.name', terminalName),
        setSetting('network.secret', networkSecret),
        setSetting('network.master_ip', masterIp),
        setSetting('network.master_port', masterPort),
        setSetting('network.server_port', serverPort),
      ]);

      // Iniciar serviço correspondente
      if (role === 'MASTER') {
        await invoke('start_mobile_server', {
          config: {
            port: parseInt(serverPort, 10),
            maxConnections: 10,
          },
        });
        toast({
          title: '✅ Caixa Principal configurado!',
          description: 'Os outros caixas da loja já podem se conectar.',
        });
      } else if (role === 'SATELLITE') {
        await invoke('start_network_client', { terminalName });
        toast({
          title: '✅ Caixa Auxiliar configurado!',
          description: 'Buscando o Caixa Principal na rede...',
        });
      } else {
        toast({
          title: '✅ Caixa Único configurado!',
          description: 'Este computador vai funcionar de forma independente.',
        });
      }

      setCurrentRole(role);
      setPendingRole(null);
      setHasUnsavedChanges(false);
      await fetchStatus();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: '❌ Não foi possível salvar',
        description:
          'Verifique sua conexão e tente novamente. ' +
          (error instanceof Error ? error.message : ''),
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
      setShowConfirmDialog(false);
    }
  };

  // Gerar senha da rede (fácil de digitar, sem caracteres confusos)
  const generateSecret = () => {
    // Excluímos caracteres confusos: 0/O, 1/l/I
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let secret = '';
    // Gerar em grupos de 4 para facilitar leitura
    for (let i = 0; i < 16; i++) {
      if (i > 0 && i % 4 === 0) secret += '-';
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNetworkSecret(secret);
    setHasUnsavedChanges(true);
    toast({
      title: '🔐 Senha gerada!',
      description: 'Anote esta senha e use nos outros caixas.',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const activeRole = pendingRole || currentRole;
  const currentRoleOption = roleOptions.find((r) => r.value === currentRole);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Aviso de mudanças não salvas */}
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <HelpCircle className="h-4 w-4" />
            <span className="text-sm">Você tem alterações não salvas</span>
          </div>
        )}

        {/* Card Principal */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-full p-2.5 ${currentRoleOption?.bgColor}`}>
                  <div className={currentRoleOption?.color}>{currentRoleOption?.icon}</div>
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    Conexão entre Caixas
                  </CardTitle>
                  <CardDescription>
                    Configure como os computadores da sua loja se comunicam
                  </CardDescription>
                </div>
              </div>
              {currentRole !== 'STANDALONE' && (
                <Badge variant={currentRole === 'MASTER' ? 'default' : 'secondary'} className="h-7">
                  {currentRole === 'MASTER' ? (
                    <>
                      <Crown className="mr-1 h-3 w-3" /> Principal
                    </>
                  ) : (
                    <>
                      <Link className="mr-1 h-3 w-3" /> Auxiliar
                    </>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Pergunta inicial */}
            <div className="space-y-3">
              <Label className="text-base">Quantos computadores você tem na loja?</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPendingRole(option.value);
                      setHasUnsavedChanges(true);
                    }}
                    className={`relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all hover:shadow-md ${
                      activeRole === option.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-muted hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    {activeRole === option.value && (
                      <div className="absolute right-2 top-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    <div className={`rounded-full p-3 ${option.bgColor}`}>
                      <div className={option.color}>{option.icon}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-base">{option.label}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{option.description}</div>
                    </div>
                    <div className="mt-1 rounded-md bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                      {option.scenario}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configurações (quando não é Standalone) */}
            {activeRole !== 'STANDALONE' && (
              <div className="space-y-4 rounded-xl border bg-muted/30 p-5">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium">Configurações do Caixa</h4>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Nome do Caixa */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="terminalName">Nome deste Caixa</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[200px]">
                          Um nome para identificar este computador na rede
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <Input
                      id="terminalName"
                      value={terminalName}
                      onChange={(e) => handleFieldChange(setTerminalName)(e.target.value)}
                      placeholder={
                        activeRole === 'MASTER' ? 'Ex: Caixa Principal' : 'Ex: Caixa 2, Balcão'
                      }
                    />
                  </div>

                  {/* Senha da Rede */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="networkSecret">Senha da Rede</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[220px]">
                          Protege a comunicação. Use a mesma senha em todos os caixas da loja.
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          id="networkSecret"
                          type={showPassword ? 'text' : 'password'}
                          value={networkSecret}
                          onChange={(e) => handleFieldChange(setNetworkSecret)(e.target.value)}
                          placeholder="Senha compartilhada"
                          className="pr-10 font-mono"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={generateSecret}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Gerar senha automática</TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      📝 Anote a senha e use a mesma em todos os caixas
                    </p>
                  </div>
                </div>

                {/* Configurações Avançadas (colapsável) */}
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-muted-foreground"
                    >
                      <span className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Configurações Avançadas
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          showAdvanced ? 'rotate-180' : ''
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-4">
                    {/* Configurações específicas do Master */}
                    {activeRole === 'MASTER' && (
                      <div className="space-y-4 rounded-lg border bg-background p-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <Label htmlFor="serverPort">Porta de comunicação</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-[200px]">
                                Porta TCP usada para conexão. Normalmente não precisa alterar.
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                            id="serverPort"
                            type="number"
                            value={serverPort}
                            onChange={(e) => handleFieldChange(setServerPort)(e.target.value)}
                            placeholder="3847"
                            className="w-32"
                          />
                        </div>

                        {/* Dica de Firewall Windows */}
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950/50">
                          <p className="font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2">
                            ⚠️ Firewall do Windows
                          </p>
                          <p className="text-amber-600 dark:text-amber-400 mt-1">
                            Ao iniciar, o Windows pode pedir permissão para o GIRO.{' '}
                            <strong>Clique em Permitir</strong> para que os outros caixas consigam
                            se conectar.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Configurações específicas do Satellite */}
                    {activeRole === 'SATELLITE' && (
                      <div className="space-y-4 rounded-lg border bg-background p-4">
                        <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950/50">
                          <p className="font-medium text-blue-700 dark:text-blue-300">
                            🔍 Conexão Automática
                          </p>
                          <p className="text-blue-600 dark:text-blue-400 mt-1">
                            O caixa busca o Principal automaticamente. Só preencha abaixo se não
                            encontrar.
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <Label htmlFor="masterIp">Endereço IP do Principal</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[220px]">
                                  Use só se a conexão automática não funcionar. Descubra o IP no
                                  Caixa Principal (ex: 192.168.1.100)
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <Input
                              id="masterIp"
                              value={masterIp}
                              onChange={(e) => handleFieldChange(setMasterIp)(e.target.value)}
                              placeholder="Deixe vazio para automático"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="masterPort">Porta</Label>
                            <Input
                              id="masterPort"
                              type="number"
                              value={masterPort}
                              onChange={(e) => handleFieldChange(setMasterPort)(e.target.value)}
                              placeholder="3847"
                              className="w-32"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Status do Caixa Principal */}
            {currentRole === 'MASTER' && serverStatus && (
              <div className="rounded-xl border bg-gradient-to-br from-green-50 to-emerald-50 p-4 dark:from-green-950/30 dark:to-emerald-950/30">
                <h4 className="mb-4 font-medium flex items-center gap-2 text-green-800 dark:text-green-200">
                  <Server className="h-4 w-4" />
                  Status do Caixa Principal
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="text-center rounded-lg bg-white/50 p-3 dark:bg-black/20">
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          serverStatus.isRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-lg font-semibold">
                        {serverStatus.isRunning ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">Servidor</div>
                  </div>
                  <div className="text-center rounded-lg bg-white/50 p-3 dark:bg-black/20">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {serverStatus.connectedDevices}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {serverStatus.connectedDevices === 1
                        ? 'Caixa conectado'
                        : 'Caixas conectados'}
                    </div>
                  </div>
                  <div className="text-center rounded-lg bg-white/50 p-3 dark:bg-black/20">
                    <div className="text-lg font-mono text-green-700 dark:text-green-300">
                      {serverStatus.localIp || '—'}
                    </div>
                    <div className="text-xs text-muted-foreground">Endereço IP</div>
                  </div>
                </div>
              </div>
            )}

            {/* Status do Caixa Auxiliar */}
            {currentRole === 'SATELLITE' && networkStatus && (
              <div
                className={`rounded-xl border p-4 ${
                  networkStatus.connectedMaster
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30'
                    : 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30'
                }`}
              >
                <h4
                  className={`mb-3 font-medium flex items-center gap-2 ${
                    networkStatus.connectedMaster
                      ? 'text-green-800 dark:text-green-200'
                      : 'text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {networkStatus.connectedMaster ? (
                    <Wifi className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  Status da Conexão
                </h4>
                <div className="flex items-center gap-3 rounded-lg bg-white/50 p-3 dark:bg-black/20">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      networkStatus.connectedMaster
                        ? 'bg-green-500'
                        : networkStatus.isRunning
                        ? 'bg-amber-500 animate-pulse'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium">
                    {networkStatus.connectedMaster
                      ? `✓ Conectado ao ${networkStatus.connectedMaster}`
                      : networkStatus.isRunning
                      ? '🔍 Buscando o Caixa Principal...'
                      : '✕ Desconectado'}
                  </span>
                </div>
                {!networkStatus.connectedMaster && networkStatus.isRunning && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Verifique se o Caixa Principal está ligado e conectado à mesma rede
                  </p>
                )}
              </div>
            )}

            {/* Botão Salvar */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-sm text-muted-foreground">
                {hasUnsavedChanges && '• Alterações pendentes'}
              </div>
              <div className="flex gap-2">
                {pendingRole && pendingRole !== currentRole && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPendingRole(null);
                      setHasUnsavedChanges(false);
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  onClick={handleSave}
                  disabled={isSaving || (!hasUnsavedChanges && !pendingRole)}
                  className="min-w-[140px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diálogo de Confirmação - Linguagem Humanizada */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Confirmar alteração?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    Você está mudando de{' '}
                    <strong className="text-foreground">
                      {roleOptions.find((r) => r.value === currentRole)?.label}
                    </strong>{' '}
                    para{' '}
                    <strong className="text-foreground">
                      {roleOptions.find((r) => r.value === pendingRole)?.label}
                    </strong>
                    .
                  </p>

                  <div className="rounded-lg bg-muted p-3 text-sm">
                    {pendingRole === 'MASTER' && (
                      <p>
                        👑 Este computador se tornará o <strong>Caixa Principal</strong>. Os outros
                        caixas da loja vão se conectar a ele para sincronizar vendas e dados.
                      </p>
                    )}
                    {pendingRole === 'SATELLITE' && (
                      <p>
                        🔗 Este computador se tornará um <strong>Caixa Auxiliar</strong>. As vendas
                        feitas aqui serão enviadas automaticamente para o Caixa Principal.
                      </p>
                    )}
                    {pendingRole === 'STANDALONE' && (
                      <p>
                        💻 Este computador funcionará de forma <strong>independente</strong>, sem
                        conexão com outros caixas. Os dados ficarão apenas neste computador.
                      </p>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    A mudança será aplicada imediatamente.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => pendingRole && saveSettings(pendingRole)}>
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};
