/**
 * Store de Tutoriais - Zustand
 * Gerencia estado global dos tutoriais e progresso do usuário
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tutorials } from './tutorials';
import type { TutorialId, TutorialProgress, TutorialSettings, TutorialState } from './types';

interface TutorialStore extends TutorialState {
  // Ações de navegação
  startTutorial: (tutorialId: TutorialId) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (stepIndex: number) => void;
  pauseTutorial: () => void;
  resumeTutorial: () => void;
  skipTutorial: () => void;
  completeTutorial: () => void;
  resetTutorial: (tutorialId: TutorialId) => void;

  // Ações de UI
  showSpotlight: () => void;
  hideSpotlight: () => void;

  // Ações de configuração
  updateSettings: (settings: Partial<TutorialSettings>) => void;
  enableTutorials: () => void;
  disableTutorials: () => void;

  // Queries
  getTutorialProgress: (tutorialId: TutorialId) => TutorialProgress | undefined;
  isStepCompleted: (tutorialId: TutorialId, stepId: string) => boolean;
  getCompletedTutorials: () => TutorialId[];
  getTotalProgress: () => { completed: number; total: number; percentage: number };
  canStartTutorial: (tutorialId: TutorialId) => boolean;
  getCurrentStep: () => { tutorial: TutorialId; step: number; total: number } | null;
}

const createDefaultProgress = (tutorialId: TutorialId): TutorialProgress => ({
  tutorialId,
  status: 'not-started',
  currentStep: 0,
  completedSteps: [],
});

export const useTutorialStore = create<TutorialStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      activeTutorial: null,
      currentStep: 0,
      isPaused: false,
      isSpotlightVisible: false,
      progress: {} as Record<TutorialId, TutorialProgress>,
      settings: {
        enabled: true,
        showWelcomeOnFirstLogin: true,
        animationSpeed: 1,
        soundEnabled: true,
        highContrast: false,
        fontSize: 'medium',
        screenReaderAnnouncements: true,
        keyboardNavigation: true,
      },

      // Iniciar tutorial
      startTutorial: (tutorialId) => {
        const tutorial = tutorials[tutorialId];
        if (!tutorial) return;

        const state = get();
        if (!state.settings.enabled) return;

        // Verificar pré-requisitos
        if (!state.canStartTutorial(tutorialId)) {
          console.warn(`Prerequisites not met for tutorial: ${tutorialId}`);
          return;
        }

        const existingProgress = state.progress[tutorialId];
        const startStep =
          existingProgress?.status === 'in-progress' ? existingProgress.currentStep : 0;

        set({
          activeTutorial: tutorialId,
          currentStep: startStep,
          isPaused: false,
          isSpotlightVisible: true,
          progress: {
            ...state.progress,
            [tutorialId]: {
              ...createDefaultProgress(tutorialId),
              ...existingProgress,
              status: 'in-progress',
              currentStep: startStep,
              startedAt: existingProgress?.startedAt ?? new Date().toISOString(),
              lastViewedAt: new Date().toISOString(),
            },
          },
        });

        // Anunciar para leitores de tela
        if (state.settings.screenReaderAnnouncements) {
          announceToScreenReader(
            `Tutorial iniciado: ${tutorial.name}. Passo 1 de ${tutorial.steps.length}.`
          );
        }
      },

      // Próximo passo
      nextStep: () => {
        const state = get();
        if (!state.activeTutorial) return;

        const tutorial = tutorials[state.activeTutorial];
        if (!tutorial) return;

        const currentStepObj = tutorial.steps[state.currentStep];
        const nextStepIndex = state.currentStep + 1;

        // Marcar passo atual como completado
        const progress = state.progress[state.activeTutorial];
        const completedSteps = progress?.completedSteps ?? [];
        if (currentStepObj && !completedSteps.includes(currentStepObj.id)) {
          completedSteps.push(currentStepObj.id);
        }

        // Verificar se é o último passo
        if (nextStepIndex >= tutorial.steps.length) {
          state.completeTutorial();
          return;
        }

        set({
          currentStep: nextStepIndex,
          progress: {
            ...state.progress,
            [state.activeTutorial]: {
              ...progress!,
              currentStep: nextStepIndex,
              completedSteps,
              lastViewedAt: new Date().toISOString(),
            },
          },
        });

        // Anunciar para leitores de tela
        if (state.settings.screenReaderAnnouncements) {
          const nextStep = tutorial.steps[nextStepIndex];
          if (nextStep) {
            announceToScreenReader(
              `Passo ${nextStepIndex + 1} de ${tutorial.steps.length}: ${nextStep.title}`
            );
          }
        }
      },

      // Passo anterior
      previousStep: () => {
        const state = get();
        if (!state.activeTutorial || state.currentStep <= 0) return;

        set({ currentStep: state.currentStep - 1 });

        if (state.settings.screenReaderAnnouncements) {
          const tutorial = tutorials[state.activeTutorial];
          const prevStep = tutorial?.steps[state.currentStep - 1];
          if (prevStep) {
            announceToScreenReader(`Voltando para passo ${state.currentStep}: ${prevStep.title}`);
          }
        }
      },

      // Ir para passo específico
      goToStep: (stepIndex) => {
        const state = get();
        if (!state.activeTutorial) return;

        const tutorial = tutorials[state.activeTutorial];
        if (!tutorial || stepIndex < 0 || stepIndex >= tutorial.steps.length) return;

        set({
          currentStep: stepIndex,
          progress: {
            ...state.progress,
            [state.activeTutorial]: {
              ...state.progress[state.activeTutorial]!,
              currentStep: stepIndex,
              lastViewedAt: new Date().toISOString(),
            },
          },
        });
      },

      // Pausar tutorial
      pauseTutorial: () => {
        set({ isPaused: true, isSpotlightVisible: false });
      },

      // Retomar tutorial
      resumeTutorial: () => {
        set({ isPaused: false, isSpotlightVisible: true });
      },

      // Pular tutorial
      skipTutorial: () => {
        const state = get();
        if (!state.activeTutorial) return;

        set({
          activeTutorial: null,
          currentStep: 0,
          isPaused: false,
          isSpotlightVisible: false,
          progress: {
            ...state.progress,
            [state.activeTutorial]: {
              ...state.progress[state.activeTutorial]!,
              status: 'skipped',
              lastViewedAt: new Date().toISOString(),
            },
          },
        });
      },

      // Completar tutorial
      completeTutorial: () => {
        const state = get();
        if (!state.activeTutorial) return;

        const tutorialId = state.activeTutorial;
        const tutorial = tutorials[tutorialId];

        set({
          activeTutorial: null,
          currentStep: 0,
          isPaused: false,
          isSpotlightVisible: false,
          progress: {
            ...state.progress,
            [tutorialId]: {
              ...state.progress[tutorialId]!,
              status: 'completed',
              completedSteps: tutorial?.steps.map((s) => s.id) ?? [],
              completedAt: new Date().toISOString(),
              lastViewedAt: new Date().toISOString(),
            },
          },
        });

        if (state.settings.screenReaderAnnouncements) {
          announceToScreenReader(`Tutorial concluído: ${tutorial?.name ?? tutorialId}`);
        }

        // Som de conclusão
        if (state.settings.soundEnabled) {
          playCompletionSound();
        }
      },

      // Resetar tutorial
      resetTutorial: (tutorialId) => {
        const state = get();
        set({
          progress: {
            ...state.progress,
            [tutorialId]: createDefaultProgress(tutorialId),
          },
        });
      },

      // Mostrar spotlight
      showSpotlight: () => set({ isSpotlightVisible: true }),

      // Esconder spotlight
      hideSpotlight: () => set({ isSpotlightVisible: false }),

      // Atualizar configurações
      updateSettings: (newSettings) => {
        const state = get();
        set({
          settings: { ...state.settings, ...newSettings },
        });
      },

      // Habilitar tutoriais
      enableTutorials: () => {
        const state = get();
        set({ settings: { ...state.settings, enabled: true } });
      },

      // Desabilitar tutoriais
      disableTutorials: () => {
        set((state) => ({
          settings: { ...state.settings, enabled: false },
          activeTutorial: null,
          isSpotlightVisible: false,
        }));
      },

      // Obter progresso de um tutorial
      getTutorialProgress: (tutorialId) => {
        return get().progress[tutorialId];
      },

      // Verificar se passo foi completado
      isStepCompleted: (tutorialId, stepId) => {
        const progress = get().progress[tutorialId];
        return progress?.completedSteps.includes(stepId) ?? false;
      },

      // Obter tutoriais completados
      getCompletedTutorials: () => {
        const { progress } = get();
        return Object.entries(progress)
          .filter(([, p]) => p.status === 'completed')
          .map(([id]) => id as TutorialId);
      },

      // Obter progresso total
      getTotalProgress: () => {
        const allTutorials = Object.keys(tutorials) as TutorialId[];
        const completedTutorials = get().getCompletedTutorials();
        return {
          completed: completedTutorials.length,
          total: allTutorials.length,
          percentage: Math.round((completedTutorials.length / allTutorials.length) * 100),
        };
      },

      // Verificar se pode iniciar tutorial (pré-requisitos)
      canStartTutorial: (tutorialId) => {
        const tutorial = tutorials[tutorialId];
        if (!tutorial) return false;

        if (!tutorial.prerequisites || tutorial.prerequisites.length === 0) {
          return true;
        }

        const completedTutorials = get().getCompletedTutorials();
        return tutorial.prerequisites.every((prereq) => completedTutorials.includes(prereq));
      },

      // Obter passo atual
      getCurrentStep: () => {
        const { activeTutorial, currentStep } = get();
        if (!activeTutorial) return null;

        const tutorial = tutorials[activeTutorial];
        if (!tutorial) return null;

        return {
          tutorial: activeTutorial,
          step: currentStep,
          total: tutorial.steps.length,
        };
      },
    }),
    {
      name: 'giro-tutorials',
      partialize: (state) => ({
        progress: state.progress,
        settings: state.settings,
      }),
    }
  )
);

// Função auxiliar para anunciar para leitores de tela
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  document.body.appendChild(announcement);

  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// Função auxiliar para som de conclusão
function playCompletionSound() {
  try {
    const webkitWindow = window as unknown as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextCtor = window.AudioContext ?? webkitWindow.webkitAudioContext;
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch {
    // Silently fail if audio not available
  }
}

export default useTutorialStore;
