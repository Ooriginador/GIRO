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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { relaunch } from '@tauri-apps/plugin-process';
import { check, Update } from '@tauri-apps/plugin-updater';
import { useCallback, useEffect, useState } from 'react';

export function UpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<Update | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const { toast } = useToast();

  const checkForUpdates = useCallback(async () => {
    try {
      const update = await check();

      if (update) {
        setUpdateInfo(update);
        setUpdateAvailable(true);

        toast({
          title: '🎉 Nova versão disponível!',
          description: `Versão ${update.version} está pronta para instalação.`,
          duration: 10000,
        });
      }
    } catch (error) {
      console.error('Erro ao verificar atualizações:', error);
    }
  }, [toast]);

  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  async function downloadAndInstall() {
    if (!updateInfo) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      await updateInfo.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setDownloadProgress(0);
            toast({
              title: '⬇️ Download iniciado',
              description: 'Baixando atualização...',
            });
            break;
          case 'Progress': {
            const total = event.data.contentLength ?? 0;
            const current = event.data.downloaded;
            const progress = total > 0 ? (current / total) * 100 : 0;
            setDownloadProgress(Math.round(progress));
            break;
          }
          case 'Finished':
            setDownloadProgress(100);
            toast({
              title: '✅ Download concluído',
              description: 'Reiniciando aplicativo...',
            });
            break;
        }
      });

      // Aguardar 2 segundos antes de reiniciar para o usuário ver a mensagem
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await relaunch();
    } catch (error) {
      console.error('Erro ao baixar/instalar atualização:', error);
      toast({
        title: '❌ Erro na atualização',
        description: 'Não foi possível instalar a atualização. Tente novamente mais tarde.',
        variant: 'destructive',
      });
      setDownloading(false);
    }
  }

  function dismissUpdate() {
    setUpdateAvailable(false);
    toast({
      title: 'ℹ️ Atualização adiada',
      description: 'Você pode atualizar mais tarde através das configurações.',
    });
  }

  return (
    <AlertDialog open={updateAvailable && !downloading} onOpenChange={setUpdateAvailable}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>🎉 Nova versão disponível!</AlertDialogTitle>
          <AlertDialogDescription>
            {updateInfo && (
              <>
                <p className="mb-2">
                  Uma nova versão do GIRO está disponível: <strong>v{updateInfo.version}</strong>
                </p>
                {updateInfo.body && (
                  <div className="mt-4 p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
                    <p className="font-semibold mb-2">O que há de novo:</p>
                    <div
                      className="text-sm whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: updateInfo.body }}
                    />
                  </div>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {downloading ? (
          <div className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Baixando atualização...</span>
                <span>{downloadProgress}%</span>
              </div>
              <Progress value={downloadProgress} />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              O aplicativo será reiniciado automaticamente após o download.
            </p>
          </div>
        ) : (
          <AlertDialogFooter>
            <AlertDialogCancel onClick={dismissUpdate}>Agora Não</AlertDialogCancel>
            <AlertDialogAction onClick={downloadAndInstall}>Atualizar Agora</AlertDialogAction>
          </AlertDialogFooter>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
