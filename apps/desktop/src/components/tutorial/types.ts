/**
 * Sistema de Tutoriais - Tipos
 * Autotreinamento completo do GIRO
 */

export type TutorialId =
  // Core Tutorials
  | 'welcome'
  | 'pdv-basic'
  | 'pdv-advanced'
  | 'products'
  | 'stock'
  | 'cash'
  | 'reports'
  | 'settings'
  | 'employees'
  | 'alerts'
  // Enterprise Tutorials
  | 'enterprise-intro'
  | 'enterprise-contracts'
  | 'enterprise-workfronts'
  | 'enterprise-requests'
  | 'enterprise-transfers'
  | 'enterprise-locations'
  | 'enterprise-inventory';

export type TutorialStatus = 'not-started' | 'in-progress' | 'completed' | 'skipped';

export interface TutorialStep {
  /** ID único do passo */
  id: string;
  /** Título do passo (exibido no tooltip) */
  title: string;
  /** Descrição detalhada */
  description: string;
  /** Seletor CSS do elemento a destacar */
  target?: string;
  /** Posição do tooltip relativo ao elemento */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  /** Ação esperada do usuário */
  action?: 'click' | 'type' | 'wait' | 'navigate';
  /** Dados para a ação (ex: texto para digitar, rota para navegar) */
  actionData?: string;
  /** Se o passo é obrigatório para avançar */
  required?: boolean;
  /** Se permite pular este passo */
  skippable?: boolean;
  /** Tecla de atalho para este passo (acessibilidade) */
  hotkey?: string;
  /** Delay antes de mostrar o passo (ms) */
  delay?: number;
  /** Callback ao completar o passo */
  onComplete?: () => void;
  /** Callback ao entrar no passo */
  onEnter?: () => void;
  /** URL/rota onde este passo deve ser exibido */
  route?: string;
  /** Condição para mostrar o passo */
  condition?: () => boolean;
}

export interface Tutorial {
  /** ID único do tutorial */
  id: TutorialId;
  /** Nome do tutorial */
  name: string;
  /** Descrição do que será aprendido */
  description: string;
  /** Categoria do tutorial */
  category: 'getting-started' | 'operations' | 'management' | 'advanced' | 'enterprise';
  /** Duração estimada em minutos */
  estimatedMinutes: number;
  /** Ícone (nome do lucide-react) */
  icon: string;
  /** Passos do tutorial */
  steps: TutorialStep[];
  /** Pré-requisitos (IDs de outros tutoriais) */
  prerequisites?: TutorialId[];
  /** Tags para busca */
  tags: string[];
}

export interface TutorialProgress {
  tutorialId: TutorialId;
  status: TutorialStatus;
  currentStep: number;
  completedSteps: string[];
  startedAt?: string;
  completedAt?: string;
  lastViewedAt?: string;
}

export interface TutorialState {
  /** Tutorial ativo no momento */
  activeTutorial: TutorialId | null;
  /** Passo atual do tutorial ativo */
  currentStep: number;
  /** Se o tutorial está pausado */
  isPaused: boolean;
  /** Se o spotlight está visível */
  isSpotlightVisible: boolean;
  /** Progresso de todos os tutoriais */
  progress: Record<TutorialId, TutorialProgress>;
  /** Configurações do usuário */
  settings: TutorialSettings;
}

export interface TutorialSettings {
  /** Se tutoriais estão habilitados */
  enabled: boolean;
  /** Se deve mostrar tutorial de boas-vindas no primeiro acesso */
  showWelcomeOnFirstLogin: boolean;
  /** Velocidade das animações (0.5x a 2x) */
  animationSpeed: number;
  /** Se deve usar sons */
  soundEnabled: boolean;
  /** Se deve usar alto contraste no spotlight */
  highContrast: boolean;
  /** Tamanho do texto do tutorial */
  fontSize: 'small' | 'medium' | 'large';
  /** Se deve anunciar passos para leitores de tela */
  screenReaderAnnouncements: boolean;
  /** Se permite navegação apenas por teclado */
  keyboardNavigation: boolean;
}

export interface SpotlightConfig {
  /** Padding ao redor do elemento destacado */
  padding: number;
  /** Cor do overlay */
  overlayColor: string;
  /** Opacidade do overlay (0-1) */
  overlayOpacity: number;
  /** Border radius do spotlight */
  borderRadius: number;
  /** Se deve pulsar o elemento */
  pulse: boolean;
  /** Duração da animação de transição */
  transitionDuration: number;
}

export const defaultSpotlightConfig: SpotlightConfig = {
  padding: 8,
  overlayColor: '#000000',
  overlayOpacity: 0.75,
  borderRadius: 8,
  pulse: true,
  transitionDuration: 300,
};

export const defaultTutorialSettings: TutorialSettings = {
  enabled: true,
  showWelcomeOnFirstLogin: true,
  animationSpeed: 1,
  soundEnabled: true,
  highContrast: false,
  fontSize: 'medium',
  screenReaderAnnouncements: true,
  keyboardNavigation: true,
};
