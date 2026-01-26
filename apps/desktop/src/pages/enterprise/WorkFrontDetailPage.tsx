import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  ArrowLeft,
  Edit,
  Plus,
  Users,
  MapPin,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WorkFront, WorkFrontActivity, MaterialRequest } from '@/types/enterprise';

// Status badge colors
const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativa',
  INACTIVE: 'Inativa',
  SUSPENDED: 'Suspensa',
  CLOSED: 'Encerrada',
};

const requestStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  SEPARATING: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export function WorkFrontDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workFront, setWorkFront] = useState<WorkFront | null>(null);
  const [activities, setActivities] = useState<WorkFrontActivity[]>([]);
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWorkFront = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      // Load work front from backend
      const data = await invoke<WorkFront | null>('get_work_front_by_id', { id });
      if (data) {
        setWorkFront(data);
        // Activities and requests are embedded in the work front response from backend
        setActivities(data.activities || []);
        setRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Failed to load work front:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadWorkFront();
  }, [loadWorkFront]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!workFront) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Frente de trabalho não encontrada</p>
        <Button variant="outline" onClick={() => navigate('/enterprise/work-fronts')}>
          Voltar para Frentes
        </Button>
      </div>
    );
  }

  const completedActivities = activities.filter((a) => a.status === 'COMPLETED').length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/enterprise/work-fronts')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{workFront.name}</h1>
              <Badge className={statusColors[workFront.status]}>
                {statusLabels[workFront.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {workFront.code} • {workFront.contract?.name}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/enterprise/work-fronts/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button onClick={() => navigate(`/enterprise/requests/new?workFrontId=${id}`)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Requisição
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Atividades</p>
                <p className="text-2xl font-bold">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">{completedActivities}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Requisições</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{pendingRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Card */}
          <Card>
            <CardHeader>
              <CardTitle>Progresso Geral</CardTitle>
              <CardDescription>Avanço das atividades da frente de trabalho</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-primary">{workFront.progress}%</span>
                <span className="text-muted-foreground">
                  {completedActivities} de {activities.length} atividades concluídas
                </span>
              </div>
              <Progress value={workFront.progress} className="h-3" />
            </CardContent>
          </Card>

          {/* Tabs for Activities and Requests */}
          <Tabs defaultValue="activities">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="activities">Atividades ({activities.length})</TabsTrigger>
              <TabsTrigger value="requests">Requisições ({requests.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="activities" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Atividades da Frente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              activity.status === 'COMPLETED'
                                ? 'bg-green-500'
                                : activity.status === 'IN_PROGRESS'
                                ? 'bg-blue-500'
                                : 'bg-gray-300'
                            }`}
                          />
                          <div>
                            <p className="font-medium">{activity.name}</p>
                            <p className="text-sm text-muted-foreground">{activity.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-muted-foreground">Progresso</span>
                              <span>{activity.progress}%</span>
                            </div>
                            <Progress value={activity.progress} className="h-2" />
                          </div>
                          <Badge
                            variant={activity.status === 'COMPLETED' ? 'default' : 'outline'}
                            className={
                              activity.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-800'
                                : activity.status === 'IN_PROGRESS'
                                ? 'bg-blue-100 text-blue-800'
                                : ''
                            }
                          >
                            {activity.status === 'COMPLETED'
                              ? 'Concluída'
                              : activity.status === 'IN_PROGRESS'
                              ? 'Em Andamento'
                              : 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Requisições de Material</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-mono">{request.code}</TableCell>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>{request.itemCount || '-'}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                request.priority === 'URGENT'
                                  ? 'border-red-500 text-red-500'
                                  : request.priority === 'HIGH'
                                  ? 'border-orange-500 text-orange-500'
                                  : ''
                              }
                            >
                              {request.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={requestStatusColors[request.status]}>
                              {request.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/enterprise/requests/${request.id}`)}
                            >
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle>Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Supervisor</p>
                  <p className="font-medium">{workFront.supervisor?.name}</p>
                  <p className="text-sm text-muted-foreground">{workFront.supervisor?.email}</p>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Local de Estoque</p>
                  <p className="font-medium">{workFront.location || '-'}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Início</span>
                  <span className="font-medium">
                    {workFront.startDate
                      ? new Date(workFront.startDate).toLocaleDateString('pt-BR')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Previsão Término</span>
                  <span className="font-medium">
                    {workFront.expectedEndDate
                      ? new Date(workFront.expectedEndDate).toLocaleDateString('pt-BR')
                      : '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes Card */}
          {workFront.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{workFront.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/enterprise/requests/new?workFrontId=${id}`)}
              >
                <Package className="h-4 w-4 mr-2" />
                Nova Requisição
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate(`/enterprise/locations/${workFront.locationId}/stock`)}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Ver Estoque Local
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
