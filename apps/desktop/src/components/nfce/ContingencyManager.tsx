import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { listOfflineNotes, transmitOfflineNote } from '@/lib/tauri';
import { useSettingsStore } from '@/stores/settings-store';
import type { OfflineNote } from '@/types/nfce';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Send } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ContingencyManager() {
  const [notes, setNotes] = useState<OfflineNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [transmitting, setTransmitting] = useState<string | null>(null);

  // Carregar configurações fiscais do store ou storage seguro
  // Assumindo que o FiscalSettings salvou PFX path e senha no Settings Store ou LocalStorage seguro
  // O componente FiscalSettings usa useSettingsStore?
  // Precisamos acessar as configs para retransmitir.

  const { fiscal, company } = useSettingsStore();

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const result = await listOfflineNotes();
      // Sort by date desc
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setNotes(result);
    } catch (error) {
      console.error('Erro ao listar notas:', error);
      toast({
        title: 'Erro ao carregar notas offline',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleTransmit = async (note: OfflineNote) => {
    if (!fiscal.certPath || !fiscal.certPassword) {
      toast({
        title: 'Configuração Fiscal Incompleta',
        description: 'Verifique o certificado e senha nas configurações fiscais.',
        variant: 'destructive',
      });
      return;
    }

    setTransmitting(note.access_key);
    try {
      const envCode = fiscal.environment;
      const emitterUf = fiscal.uf || company.state || 'SP';

      const response = await transmitOfflineNote(
        note.access_key,
        fiscal.certPath,
        fiscal.certPassword,
        emitterUf,
        envCode
      );

      if (response.success) {
        toast({
          title: 'Nota Transmitida!',
          description: `Protocolo: ${response.protocol}`,
          variant: 'default',
        });
        // Atualizar lista (nota deve sumir ou mudar status)
        await fetchNotes();
      } else {
        toast({
          title: 'Rejeição SEFAZ',
          description: response.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro na transmissão:', error);
      toast({
        title: 'Erro de Transmissão',
        description: String(error),
        variant: 'destructive',
      });
    } finally {
      setTransmitting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Contingência Offline
            </CardTitle>
            <CardDescription>
              Gerencie notas emitidas sem internet. Transmita assim que a conexão retornar.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchNotes} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />
            <p>Nenhuma nota pendente de transmissão.</p>
            <p className="text-sm">Todas as vendas foram sincronizadas com a SEFAZ.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Chave de Acesso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notes.map((note) => (
                  <TableRow key={note.access_key}>
                    <TableCell>
                      {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {note.access_key}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-amber-100 text-amber-800 border-amber-200"
                      >
                        PENDENTE
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleTransmit(note)}
                        disabled={transmitting === note.access_key}
                      >
                        {transmitting === note.access_key ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Send className="h-4 w-4 mr-1" />
                        )}
                        Transmitir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
