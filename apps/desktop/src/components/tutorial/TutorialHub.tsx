/**
 * TutorialHub - Central de Treinamentos
 * Interface para visualizar e iniciar tutoriais disponíveis
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Bell,
  CheckCircle,
  Clock,
  Landmark,
  Lock,
  Package,
  Play,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  Warehouse,
  Zap,
  // Enterprise Icons
  Building2,
  FileText,
  Hammer,
  ClipboardList,
  ArrowLeftRight,
  MapPin,
  ClipboardCheck,
} from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { useTutorialStore } from './tutorial-store';
import { getTutorialsByCategory, searchTutorials, tutorials } from './tutorials';
import type { Tutorial, TutorialId } from './types';

// Map de ícones
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  ShoppingCart,
  Zap,
  Package,
  Warehouse,
  Landmark,
  BarChart3,
  Settings,
  Users,
  Bell,
  // Enterprise Icons
  Building2,
  FileText,
  Hammer,
  ClipboardList,
  ArrowLeftRight,
  MapPin,
  ClipboardCheck,
};

interface TutorialCardProps {
  tutorial: Tutorial;
  onStart: () => void;
  onReset: () => void;
  status: 'not-started' | 'in-progress' | 'completed' | 'skipped' | 'locked';
  progress?: number;
}

const TutorialCard: FC<TutorialCardProps> = ({
  tutorial,
  onStart,
  onReset,
  status,
  progress = 0,
}) => {
  const Icon = iconMap[tutorial.icon] || Sparkles;

  const statusConfig = {
    'not-started': {
      label: 'Não iniciado',
      color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      buttonLabel: 'Iniciar',
      buttonIcon: Play,
    },
    'in-progress': {
      label: `${progress}% concluído`,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      buttonLabel: 'Continuar',
      buttonIcon: Play,
    },
    completed: {
      label: 'Concluído',
      color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      buttonLabel: 'Refazer',
      buttonIcon: RotateCcw,
    },
    skipped: {
      label: 'Pulado',
      color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      buttonLabel: 'Tentar novamente',
      buttonIcon: RotateCcw,
    },
    locked: {
      label: 'Bloqueado',
      color: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
      buttonLabel: 'Requisitos',
      buttonIcon: Lock,
    },
  };

  const config = statusConfig[status];
  const ButtonIcon = config.buttonIcon;
  const isLocked = status === 'locked';

  return (
    <Card className={cn('transition-all hover:shadow-md', isLocked && 'opacity-60')}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div
            className={cn(
              'p-2 rounded-lg',
              status === 'completed' ? 'bg-green-100 dark:bg-green-900' : 'bg-primary/10'
            )}
          >
            <Icon
              className={cn(
                'h-6 w-6',
                status === 'completed' ? 'text-green-600 dark:text-green-400' : 'text-primary'
              )}
            />
          </div>
          <Badge variant="secondary" className={config.color}>
            {status === 'completed' && <CheckCircle className="h-3 w-3 mr-1" />}
            {status === 'locked' && <Lock className="h-3 w-3 mr-1" />}
            {config.label}
          </Badge>
        </div>
        <CardTitle className="mt-3">{tutorial.name}</CardTitle>
        <CardDescription className="line-clamp-2">{tutorial.description}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{tutorial.estimatedMinutes} min</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{tutorial.steps.length} passos</span>
          </div>
        </div>

        {status === 'in-progress' && <Progress value={progress} className="mb-4 h-2" />}

        <div className="flex gap-2">
          <Button
            onClick={isLocked ? undefined : onStart}
            disabled={isLocked}
            className="flex-1"
            variant={status === 'completed' ? 'outline' : 'default'}
          >
            <ButtonIcon className="h-4 w-4 mr-2" />
            {config.buttonLabel}
          </Button>

          {(status === 'completed' || status === 'in-progress') && (
            <Button variant="ghost" size="icon" onClick={onReset} title="Resetar progresso">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isLocked && tutorial.prerequisites && (
          <p className="mt-3 text-xs text-gray-500">
            Complete primeiro:{' '}
            {tutorial.prerequisites
              .map((id) => tutorials[id]?.name)
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export const TutorialHub: FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { startTutorial, resetTutorial, getTutorialProgress, getTotalProgress, canStartTutorial } =
    useTutorialStore();

  const totalProgress = getTotalProgress();

  // Filtrar tutoriais por busca e categoria
  const filteredTutorials = useMemo(() => {
    let result: Tutorial[];

    if (searchQuery) {
      result = searchTutorials(searchQuery);
    } else if (activeTab === 'all') {
      result = Object.values(tutorials);
    } else {
      result = getTutorialsByCategory(activeTab as Tutorial['category']);
    }

    return result;
  }, [searchQuery, activeTab]);

  const getStatus = (tutorialId: TutorialId) => {
    const progress = getTutorialProgress(tutorialId);
    if (!canStartTutorial(tutorialId)) return 'locked';
    return progress?.status ?? 'not-started';
  };

  const getProgressPercentage = (tutorialId: TutorialId) => {
    const progress = getTutorialProgress(tutorialId);
    const tutorial = tutorials[tutorialId];
    if (!progress || !tutorial) return 0;
    return Math.round((progress.completedSteps.length / tutorial.steps.length) * 100);
  };

  const handleStart = (tutorialId: TutorialId) => {
    const status = getStatus(tutorialId);
    if (status === 'completed' || status === 'skipped') {
      resetTutorial(tutorialId);
    }
    startTutorial(tutorialId);
  };

  const handleReset = (tutorialId: TutorialId) => {
    resetTutorial(tutorialId);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-primary" />
          Central de Treinamentos
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Aprenda a usar todas as funcionalidades do sistema GIRO
        </p>
      </div>

      {/* Progress Overview */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold">Seu Progresso</h3>
              <p className="text-sm text-gray-500">
                {totalProgress.completed} de {totalProgress.total} tutoriais concluídos
              </p>
            </div>
            <span className="text-2xl font-bold text-primary">{totalProgress.percentage}%</span>
          </div>
          <Progress value={totalProgress.percentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar tutoriais..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-6 w-full max-w-2xl">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="getting-started">Início</TabsTrigger>
          <TabsTrigger value="operations">Operações</TabsTrigger>
          <TabsTrigger value="management">Gestão</TabsTrigger>
          <TabsTrigger value="enterprise" className="text-blue-600">
            <Building2 className="h-3 w-3 mr-1" />
            Enterprise
          </TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredTutorials.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum tutorial encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTutorials.map((tutorial) => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  status={getStatus(tutorial.id)}
                  progress={getProgressPercentage(tutorial.id)}
                  onStart={() => handleStart(tutorial.id)}
                  onReset={() => handleReset(tutorial.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Quick Tips */}
      <Card className="mt-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-6">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Dicas Rápidas
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>
              • Pressione{' '}
              <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 rounded border text-xs">F1</kbd>{' '}
              a qualquer momento para abrir esta central
            </li>
            <li>• Use as setas ← → para navegar entre passos do tutorial</li>
            <li>
              • Pressione{' '}
              <kbd className="px-1 py-0.5 bg-white dark:bg-gray-800 rounded border text-xs">
                ESC
              </kbd>{' '}
              para pausar e continuar depois
            </li>
            <li>• Tutoriais bloqueados requerem completar os pré-requisitos primeiro</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default TutorialHub;
