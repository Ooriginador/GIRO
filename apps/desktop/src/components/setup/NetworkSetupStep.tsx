/**
 * @file NetworkSetupStep - Step de Configuração de Rede no Setup Inicial
 * @description Detecta automaticamente Masters na rede e permite configurar conexão
 *
 * PÚBLICO-ALVO: Comerciantes de mercearias e motopeças
 * Linguagem simplificada, sem jargões técnicos
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { invoke, setSetting } from '@/lib/tauri';
import {
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Laptop,
  Link,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FC } from 'react';

interface DiscoveredMaster {
  name: string;
  ip: string;
  port: number;
  version: string | null;
  storeName: string | null;
}

type NetworkSetupChoice =
  | 'scanning'
  | 'found_master'
  | 'no_master'
  | 'connecting'
  | 'connected'
  | 'skipped';

interface NetworkSetupStepProps {
  /** Callback quando setup de rede concluído */
  onComplete: (result: {
    role: 'STANDALONE' | 'MASTER' | 'SATELLITE';
    connectedTo?: string;
  }) => void;
  /** Masters já descobertos (evita re-scan) */
  discoveredMasters?: DiscoveredMaster[];
  /** Callback para voltar à tela anterior */
  onBack?: () => void;
  /** Callback para pular este step */
  onSkip?: () => void;
  /** Permite pular este passo */
  allowSkip?: boolean;
}

export const NetworkSetupStep: FC<NetworkSetupStepProps> = ({
  onComplete,
  discoveredMasters: initialMasters,
  onBack,
  onSkip,
  allowSkip = true,
}) => {
  const { toast } = useToast();

  const [step, setStep] = useState<NetworkSetupChoice>('scanning');
  const [masters, setMasters] = useState<DiscoveredMaster[]>([]);
  const [selectedMaster, setSelectedMaster] = useState<DiscoveredMaster | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [terminalName, setTerminalName] = useState('Caixa 2');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Escanear rede ao montar
  const scanNetwork = useCallback(async () => {
    setStep('scanning');
    setMasters([]);
    setConnectionError(null);

    try {
      // Scan por 8 segundos
      const found = await invoke<DiscoveredMaster[]>('scan_network_for_masters', {
        timeoutSecs: 8,
      });

      if (found.length > 0) {
        setMasters(found);
        setStep('found_master');
      } else {
        setStep('no_master');
      }
    } catch (error) {
      console.error('Erro ao escanear rede:', error);
      setStep('no_master');
    }
  }, []);

  useEffect(() => {
    // Se já temos masters descobertos, use-os diretamente
    if (initialMasters && initialMasters.length > 0) {
      setMasters(initialMasters);
      setStep('found_master');
    } else {
      scanNetwork();
    }
  }, [scanNetwork, initialMasters]);

  // Testar conexão com Master
  const handleConnect = async () => {
    if (!selectedMaster || !password) {
      toast({
        title: 'Preencha todos os campos',
        description: 'Selecione um caixa e digite a senha da rede.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);

    try {
      const success = await invoke<boolean>('test_master_connection', {
        ip: selectedMaster.ip,
        port: selectedMaster.port,
        secret: password,
      });

      if (success) {
        // Salvar configurações
        await Promise.all([
          setSetting('network.role', 'SATELLITE'),
          setSetting('terminal.name', terminalName),
          setSetting('network.secret', password),
          setSetting('network.master_ip', selectedMaster.ip),
          setSetting('network.master_port', String(selectedMaster.port)),
        ]);

        // Iniciar cliente de rede imediatamente
        try {
          await invoke('start_network_client', { terminalName });
        } catch (e) {
          console.warn('Alerta ao iniciar cliente de rede (pode já estar rodando):', e);
        }

        setStep('connected');

        toast({
          title: '✅ Conectado com sucesso!',
          description: `Este caixa está conectado ao ${selectedMaster.name || 'Caixa Principal'}.`,
        });

        // Aguardar um pouco e completar
        setTimeout(() => {
          onComplete({ role: 'SATELLITE', connectedTo: selectedMaster.ip });
        }, 2000);
      } else {
        setConnectionError('Senha incorreta ou o caixa principal não está aceitando conexões.');
      }
    } catch (error) {
      console.error('Erro ao conectar:', error);
      setConnectionError(
        error instanceof Error ? error.message : 'Não foi possível conectar. Verifique a rede.'
      );
    } finally {
      setIsConnecting(false);
    }
  };

  // Configurar como Caixa Único ou Principal
  const handleSetupAsPrimary = async (role: 'STANDALONE' | 'MASTER') => {
    try {
      await setSetting('network.role', role);

      if (role === 'MASTER') {
        toast({
          title: '👑 Caixa Principal configurado!',
          description: 'Outros caixas poderão se conectar a este computador.',
        });
      } else {
        toast({
          title: '💻 Caixa Único configurado!',
          description: 'Este computador funcionará de forma independente.',
        });
      }

      onComplete({ role });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  // Renderização baseada no step
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Wifi className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <CardTitle className="text-2xl">Configuração de Rede</CardTitle>
        <CardDescription>
          Vamos verificar se você tem outros computadores com GIRO na sua loja
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Escaneando */}
        {step === 'scanning' && (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-500 mb-4" />
            <p className="text-lg font-medium">Procurando outros caixas na rede...</p>
            <p className="text-sm text-muted-foreground mt-2">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* Encontrou Master(s) */}
        {step === 'found_master' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                Encontramos {masters.length} {masters.length === 1 ? 'caixa' : 'caixas'} na sua
                rede!
              </span>
            </div>

            <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/30 p-4">
              <p className="text-sm">
                <strong>Deseja conectar este computador ao caixa existente?</strong>
                <br />
                Ao conectar, as vendas feitas aqui serão sincronizadas automaticamente.
              </p>
            </div>

            {/* Lista de Masters */}
            <div className="space-y-2">
              <Label>Selecione o caixa principal:</Label>
              {masters.map((master) => (
                <button
                  key={`${master.ip}:${master.port}`}
                  onClick={() => setSelectedMaster(master)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                    selectedMaster?.ip === master.ip
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="rounded-full p-2 bg-amber-100 dark:bg-amber-900/30">
                    <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium">{master.name || 'GIRO Desktop'}</div>
                    <div className="text-xs text-muted-foreground">
                      {master.ip}:{master.port}
                      {master.storeName && ` • ${master.storeName}`}
                    </div>
                  </div>
                  {master.version && (
                    <Badge variant="outline" className="text-xs">
                      v{master.version}
                    </Badge>
                  )}
                </button>
              ))}
            </div>

            {/* Formulário de Conexão */}
            {selectedMaster && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="terminalName">Nome deste Caixa</Label>
                    <Input
                      id="terminalName"
                      value={terminalName}
                      onChange={(e) => setTerminalName(e.target.value)}
                      placeholder="Ex: Caixa 2, Balcão"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha da Rede</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Digite a senha"
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
                    <p className="text-xs text-muted-foreground">
                      A senha está no Caixa Principal, em Configurações → Rede
                    </p>
                  </div>
                </div>

                {connectionError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
                    ❌ {connectionError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting || !password || !terminalName}
                    className="flex-1"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <Link className="mr-2 h-4 w-4" />
                        Conectar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Alternativas */}
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                Ou configure este computador como:
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleSetupAsPrimary('STANDALONE')}
                  className="flex-1"
                >
                  <Laptop className="mr-2 h-4 w-4" />
                  Caixa Único
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSetupAsPrimary('MASTER')}
                  className="flex-1"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Caixa Principal
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Não encontrou Master */}
        {step === 'no_master' && (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <WifiOff className="h-5 w-5" />
              <span className="font-medium">Nenhum outro caixa encontrado na rede</span>
            </div>

            <div className="rounded-lg border bg-muted/50 p-4 text-sm space-y-2">
              <p>
                <strong>Isso pode significar:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Este é o primeiro computador com GIRO na loja</li>
                <li>O outro computador está desligado ou desconectado</li>
                <li>Os computadores estão em redes diferentes</li>
              </ul>
            </div>

            <div className="space-y-3">
              <p className="font-medium">Como você quer configurar este computador?</p>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={() => handleSetupAsPrimary('STANDALONE')}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all hover:border-primary hover:bg-muted/50"
                >
                  <div className="rounded-full p-3 bg-slate-100 dark:bg-slate-800">
                    <Laptop className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div>
                    <div className="font-semibold">Caixa Único</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Tenho apenas 1 computador
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleSetupAsPrimary('MASTER')}
                  className="flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-center transition-all hover:border-primary hover:bg-muted/50"
                >
                  <div className="rounded-full p-3 bg-amber-100 dark:bg-amber-900/30">
                    <Crown className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <div className="font-semibold">Caixa Principal</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Terei outros computadores depois
                    </div>
                  </div>
                </button>
              </div>

              <Button variant="ghost" onClick={scanNetwork} className="w-full mt-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Procurar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Conectado com sucesso */}
        {step === 'connected' && (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-xl font-semibold text-green-600 dark:text-green-400">
              Conectado com sucesso!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Este caixa está pronto para sincronizar com o Caixa Principal
            </p>
          </div>
        )}

        {/* Botão Voltar e Pular */}
        {step !== 'connected' && step !== 'scanning' && (
          <div className="flex justify-between pt-4 border-t">
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                ← Voltar
              </Button>
            )}
            {(allowSkip || onSkip) && (
              <Button
                variant="link"
                className="ml-auto"
                onClick={() => {
                  setStep('skipped');
                  if (onSkip) {
                    onSkip();
                  } else {
                    onComplete({ role: 'STANDALONE' });
                  }
                }}
              >
                Configurar como Caixa Único
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
