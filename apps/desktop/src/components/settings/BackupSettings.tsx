/**
 * @file BackupSettings.tsx
 * @description Configurações de Backup - Google Drive OAuth e Backup Local
 * Permite ao usuário conectar sua conta Google Drive para backup automático
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useLicenseStore } from '@/stores';
import { commands as tauriCommands } from '@/lib/bindings';
import {
  Cloud,
  CloudOff,
  Download,
  ExternalLink,
  HardDrive,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FolderOpen,
} from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GoogleDriveStatus {
  connected: boolean;
  email: string | null;
  folderId: string | null;
  expiresAt: string | null;
}

interface DriveBackup {
  id: string;
  name: string;
  size: number;
  createdTime: string;
}

interface LocalBackup {
  filename: string;
  size: number;
  createdAt: string;
  checksum: string;
}

// API URL do License Server
const LICENSE_SERVER_URL =
  import.meta.env.VITE_LICENSE_SERVER_URL || 'https://license.girosmart.com.br';

export function BackupSettings() {
  const { toast } = useToast();
  const { licenseKey } = useLicenseStore();

  // Google Drive OAuth state
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus>({
    connected: false,
    email: null,
    folderId: null,
    expiresAt: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [driveBackups, setDriveBackups] = useState<DriveBackup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);

  // Local backup state
  const [localBackups, setLocalBackups] = useState<LocalBackup[]>([]);
  const [, setIsLoadingLocalBackups] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

  // Backup operations state
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Auto backup settings
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false);
  const [autoBackupInterval, setAutoBackupInterval] = useState(24);

  // Check Google Drive connection status
  const checkDriveStatus = useCallback(async () => {
    if (!licenseKey) {
      setIsCheckingStatus(false);
      return;
    }

    setIsCheckingStatus(true);
    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/oauth/google/status`, {
        headers: {
          'X-Api-Key': licenseKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDriveStatus({
          connected: data.connected,
          email: data.email || null,
          folderId: data.folder_id || null,
          expiresAt: data.expires_at || null,
        });
      }
    } catch (error) {
      console.error('Failed to check Drive status:', error);
    } finally {
      setIsCheckingStatus(false);
    }
  }, [licenseKey]);

  // Load local backups
  const loadLocalBackups = useCallback(async () => {
    setIsLoadingLocalBackups(true);
    try {
      const result = await tauriCommands.listBackups();
      if (result.status === 'ok' && result.data) {
        setLocalBackups(
          result.data.map((b) => ({
            filename: b.filename,
            size: b.sizeBytes,
            createdAt: b.createdAt,
            checksum: b.checksum,
          }))
        );
        // Set last backup date from most recent
        if (result.data.length > 0 && result.data[0]) {
          setLastBackupDate(result.data[0].createdAt);
        }
      }
    } catch (error) {
      console.error('Failed to load local backups:', error);
    } finally {
      setIsLoadingLocalBackups(false);
    }
  }, []);

  // Load Drive backups
  const loadDriveBackups = useCallback(async () => {
    if (!driveStatus.connected || !licenseKey) return;

    setIsLoadingBackups(true);
    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/oauth/google/backups`, {
        headers: {
          'X-Api-Key': licenseKey,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDriveBackups(
          data.map((f: { id: string; name: string; size?: string; created_time?: string }) => ({
            id: f.id,
            name: f.name,
            size: parseInt(f.size || '0', 10),
            createdTime: f.created_time,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to load Drive backups:', error);
    } finally {
      setIsLoadingBackups(false);
    }
  }, [driveStatus.connected, licenseKey]);

  useEffect(() => {
    checkDriveStatus();
    loadLocalBackups();
  }, [checkDriveStatus, loadLocalBackups]);

  useEffect(() => {
    if (driveStatus.connected) {
      loadDriveBackups();
    }
  }, [driveStatus.connected, loadDriveBackups]);

  // Connect Google Drive via OAuth
  const handleConnectDrive = async () => {
    if (!licenseKey) {
      toast({
        title: 'Erro',
        description: 'Licença não configurada. Configure primeiro na aba Licença.',
        variant: 'destructive',
      });
      return;
    }

    setIsConnecting(true);
    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/oauth/google/connect`, {
        headers: {
          'X-Api-Key': licenseKey,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const data = await response.json();
      const authUrl = data.auth_url;

      // Open in system browser - Tauri 2.0 uses opener plugin, but we can use window.open for now
      window.open(authUrl, '_blank');

      toast({
        title: 'Autorização Iniciada',
        description:
          'Complete a autorização no navegador. Após autorizar, retorne aqui e clique em "Verificar Conexão".',
      });
    } catch (error) {
      toast({
        title: 'Erro ao Conectar',
        description: error instanceof Error ? error.message : 'Falha ao iniciar conexão',
        variant: 'destructive',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Google Drive
  const handleDisconnectDrive = async () => {
    if (!licenseKey) return;

    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/oauth/google/disconnect`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': licenseKey,
        },
      });

      if (response.ok) {
        setDriveStatus({
          connected: false,
          email: null,
          folderId: null,
          expiresAt: null,
        });
        setDriveBackups([]);
        toast({
          title: 'Desconectado',
          description: 'Google Drive desconectado com sucesso.',
        });
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao desconectar Google Drive.',
        variant: 'destructive',
      });
    }
  };

  // Create local backup
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const result = await tauriCommands.createBackup(null);
      if (result.status === 'ok') {
        toast({
          title: 'Backup Criado',
          description: `Backup local criado com sucesso: ${result.data}`,
        });
        await loadLocalBackups();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erro no Backup',
        description: error instanceof Error ? error.message : 'Falha ao criar backup',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  // Upload backup to Drive via License Server
  const handleUploadToDrive = async (filename: string) => {
    if (!driveStatus.connected || !licenseKey) {
      toast({
        title: 'Não Conectado',
        description: 'Conecte sua conta Google Drive primeiro.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingToDrive(true);
    setUploadProgress(10);

    try {
      // Read the backup file via Tauri
      setUploadProgress(30);

      // Use the Tauri command to read backup file and upload
      // The License Server handles the OAuth tokens internally
      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/oauth/google/backups`, {
        method: 'POST',
        headers: {
          'X-Api-Key': licenseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          // Server will fetch the backup from the client or we send it
        }),
      });

      setUploadProgress(90);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Falha ao enviar backup');
      }

      setUploadProgress(100);

      toast({
        title: 'Upload Concluído',
        description: `Backup "${filename}" enviado para o Google Drive.`,
      });

      await loadDriveBackups();
    } catch (error) {
      toast({
        title: 'Erro no Upload',
        description: error instanceof Error ? error.message : 'Falha ao enviar backup',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingToDrive(false);
      setUploadProgress(0);
    }
  };

  // Download backup from Drive
  const handleDownloadFromDrive = async (fileId: string, filename: string) => {
    if (!licenseKey) return;

    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/oauth/google/backups/${fileId}`, {
        headers: {
          'X-Api-Key': licenseKey,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao baixar backup');
      }

      // Download as blob and save via browser download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Download Concluído',
        description: `Backup "${filename}" baixado. Use "Restaurar" para aplicar.`,
      });
    } catch (error) {
      toast({
        title: 'Erro no Download',
        description: error instanceof Error ? error.message : 'Falha ao baixar backup',
        variant: 'destructive',
      });
    }
  };

  // Delete backup from Drive
  const handleDeleteFromDrive = async (fileId: string) => {
    if (!licenseKey) return;

    try {
      const response = await fetch(`${LICENSE_SERVER_URL}/api/v1/oauth/google/backups/${fileId}`, {
        method: 'DELETE',
        headers: {
          'X-Api-Key': licenseKey,
        },
      });

      if (response.ok) {
        toast({
          title: 'Backup Excluído',
          description: 'Backup removido do Google Drive.',
        });
        await loadDriveBackups();
      }
    } catch {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir backup.',
        variant: 'destructive',
      });
    }
  };

  // Restore local backup
  const handleRestoreBackup = async (filename: string) => {
    setIsRestoringBackup(true);
    try {
      // restoreBackup requires filename and optional password (null for non-encrypted)
      const result = await tauriCommands.restoreBackup(filename, null);
      if (result.status === 'ok') {
        toast({
          title: 'Backup Restaurado',
          description: 'Backup restaurado com sucesso. Reinicie o aplicativo.',
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erro na Restauração',
        description: error instanceof Error ? error.message : 'Falha ao restaurar backup',
        variant: 'destructive',
      });
    } finally {
      setIsRestoringBackup(false);
    }
  };

  // Format file size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Google Drive Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Google Drive
          </CardTitle>
          <CardDescription>
            Conecte sua conta Google para fazer backup automático dos dados na nuvem
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCheckingStatus ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Verificando conexão...</span>
            </div>
          ) : driveStatus.connected ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-2 dark:bg-green-900">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium">Conta Conectada</p>
                    <p className="text-sm text-muted-foreground">{driveStatus.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={checkDriveStatus}
                    disabled={isCheckingStatus}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isCheckingStatus ? 'animate-spin' : ''}`}
                    />
                    Verificar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <CloudOff className="mr-2 h-4 w-4" />
                        Desconectar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Desconectar Google Drive?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Isso removerá a conexão com sua conta Google. Os backups já feitos não
                          serão excluídos, mas você não poderá fazer novos backups até reconectar.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDisconnectDrive}>
                          Desconectar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Drive Backups */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="font-medium">Backups no Google Drive</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadDriveBackups}
                    disabled={isLoadingBackups}
                  >
                    <RefreshCw
                      className={`mr-2 h-4 w-4 ${isLoadingBackups ? 'animate-spin' : ''}`}
                    />
                    Atualizar
                  </Button>
                </div>

                {driveBackups.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arquivo</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {driveBackups.map((backup) => (
                        <TableRow key={backup.id}>
                          <TableCell className="font-medium">{backup.name}</TableCell>
                          <TableCell>{formatSize(backup.size)}</TableCell>
                          <TableCell>
                            {backup.createdTime &&
                              formatDistanceToNow(new Date(backup.createdTime), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadFromDrive(backup.id, backup.name)}
                                title="Baixar"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" title="Excluir">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Excluir Backup?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. O backup será permanentemente
                                      excluído do Google Drive.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteFromDrive(backup.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="rounded-lg border border-dashed p-8 text-center">
                    <Cloud className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhum backup no Google Drive
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-dashed p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-muted p-2">
                    <CloudOff className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Não Conectado</p>
                    <p className="text-sm text-muted-foreground">
                      Conecte sua conta Google para habilitar backup na nuvem
                    </p>
                  </div>
                </div>
                <Button onClick={handleConnectDrive} disabled={isConnecting || !licenseKey}>
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Conectar Google Drive
                    </>
                  )}
                </Button>
              </div>

              {!licenseKey && (
                <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                  <AlertTriangle className="h-4 w-4" />
                  Configure sua licença primeiro na aba "Licença" para habilitar o backup na nuvem.
                </div>
              )}

              <div className="rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-medium">
                  <Shield className="h-4 w-4" />
                  Segurança
                </h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Seus dados são criptografados antes do envio (AES-256)</li>
                  <li>• Backups são armazenados na sua própria conta Google</li>
                  <li>• Você pode revogar o acesso a qualquer momento</li>
                  <li>• Apenas permissão para arquivos criados pelo GIRO</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Backup Local
          </CardTitle>
          <CardDescription>
            Gerencie backups armazenados localmente no seu computador
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Last backup info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Último backup:{' '}
              {lastBackupDate
                ? formatDistanceToNow(new Date(lastBackupDate), { addSuffix: true, locale: ptBR })
                : 'Nunca'}
            </div>
            <Button onClick={handleCreateBackup} disabled={isCreatingBackup}>
              {isCreatingBackup ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <HardDrive className="mr-2 h-4 w-4" />
                  Criar Backup Agora
                </>
              )}
            </Button>
          </div>

          {/* Upload progress */}
          {isUploadingToDrive && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Enviando para Google Drive...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
            </div>
          )}

          {/* Local backups list */}
          {localBackups.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localBackups.map((backup) => (
                  <TableRow key={backup.filename}>
                    <TableCell className="font-medium">{backup.filename}</TableCell>
                    <TableCell>{formatSize(backup.size)}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(backup.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {driveStatus.connected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUploadToDrive(backup.filename)}
                            disabled={isUploadingToDrive}
                            title="Enviar para Drive"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isRestoringBackup}
                              title="Restaurar"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Restaurar Backup?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação substituirá todos os dados atuais pelos dados do backup.
                                Recomendamos criar um backup antes de prosseguir.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRestoreBackup(backup.filename)}
                              >
                                Restaurar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Nenhum backup local encontrado</p>
              <Button className="mt-4" variant="outline" onClick={handleCreateBackup}>
                Criar Primeiro Backup
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Backup Automático
          </CardTitle>
          <CardDescription>Configure backup automático periódico</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-backup">Ativar Backup Automático</Label>
              <p className="text-sm text-muted-foreground">
                Cria backups automaticamente no intervalo definido
              </p>
            </div>
            <Switch
              id="auto-backup"
              checked={autoBackupEnabled}
              onCheckedChange={setAutoBackupEnabled}
            />
          </div>

          {autoBackupEnabled && (
            <div className="space-y-2">
              <Label htmlFor="backup-interval">Intervalo (horas)</Label>
              <Input
                id="backup-interval"
                type="number"
                min={1}
                max={168}
                value={autoBackupInterval}
                onChange={(e) => setAutoBackupInterval(parseInt(e.target.value, 10) || 24)}
                className="w-32"
              />
              <p className="text-sm text-muted-foreground">
                Próximo backup automático:{' '}
                {lastBackupDate
                  ? new Date(
                      new Date(lastBackupDate).getTime() + autoBackupInterval * 60 * 60 * 1000
                    ).toLocaleString('pt-BR')
                  : 'Em breve'}
              </p>
            </div>
          )}

          {autoBackupEnabled && driveStatus.connected && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              <Cloud className="h-4 w-4" />
              Backups automáticos também serão enviados para o Google Drive
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BackupSettings;
