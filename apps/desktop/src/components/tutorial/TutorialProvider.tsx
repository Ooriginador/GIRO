import { createLogger } from '@/lib/logger';
const log = createLogger('Tutorial');
/**
 * TutorialProvider - Contexto global de tutoriais
 * Envolve a aplicação e renderiza o spotlight + tooltip
 */

import { useAuthStore } from '@/stores/auth-store';
import { type FC, type ReactNode, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Spotlight } from './Spotlight';
import { TutorialTooltip } from './TutorialTooltip';
import { useTutorialStore } from './tutorial-store';
import { tutorials } from './tutorials';

interface TutorialProviderProps {
  children: ReactNode;
}

export const TutorialProvider: FC<TutorialProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const {
    activeTutorial,
    currentStep,
    isPaused,
    isSpotlightVisible,
    settings,
    nextStep,
    previousStep,
    skipTutorial,
    pauseTutorial,
    startTutorial,
    getTutorialProgress,
  } = useTutorialStore();

  // Obter tutorial e passo atual
  const tutorial = activeTutorial ? tutorials[activeTutorial] : null;
  const step = tutorial?.steps[currentStep];

  // Navegar para rota do passo se necessário
  useEffect(() => {
    if (!step?.route || isPaused) return;

    if (location.pathname !== step.route) {
      navigate(step.route);
    }
  }, [step, location.pathname, navigate, isPaused]);

  // Verificar condição do passo
  useEffect(() => {
    if (!step?.condition) return;

    if (!step.condition()) {
      // Se condição não for atendida, pausar até atender
      // ou pular automaticamente após timeout
    }
  }, [step]);

  // Executar callback ao entrar no passo
  useEffect(() => {
    if (step?.onEnter) {
      step.onEnter();
    }
  }, [step]);

  // Delay do passo
  useEffect(() => {
    if (!step?.delay) return;

    const timeout = setTimeout(() => {
      // Ação após delay se necessário
    }, step.delay);

    return () => clearTimeout(timeout);
  }, [step]);

  // Handlers
  const handleNext = useCallback(() => {
    if (step?.onComplete) {
      step.onComplete();
    }
    nextStep();
  }, [step, nextStep]);

  const handlePrevious = useCallback(() => {
    previousStep();
  }, [previousStep]);

  const handleSkip = useCallback(() => {
    skipTutorial();
  }, [skipTutorial]);

  const handleClose = useCallback(() => {
    pauseTutorial();
  }, [pauseTutorial]);

  const handleClickOutside = useCallback(() => {
    // Opcionalmente pausar ou avançar
  }, []);

  const handleClickTarget = useCallback(() => {
    if (step?.action === 'click') {
      handleNext();
    }
  }, [step, handleNext]);

  // LOGS DE DEPURAÇÃO
  useEffect(() => {
    log.debug(
      ` Path=${location.pathname}, Auth=${isAuthenticated}, Active=${activeTutorial}, Paused=${isPaused}`
    );
  }, [location.pathname, isAuthenticated, activeTutorial, isPaused]);

  // GUARDA DEFINITIVA: Se estiver em rota restrita ou deslogado, FORÇA a parada de qualquer tutorial
  useEffect(() => {
    const restrictedRoutes = ['/', '/login', '/license', '/setup', '/wizard'];
    const isRestricted = restrictedRoutes.includes(location.pathname);

    if (activeTutorial && (!isAuthenticated || isRestricted)) {
      console.warn(
        ` FORCING SKIP: Tutorial ${activeTutorial} is restricted on path ${location.pathname} (Authenticated: ${isAuthenticated})`
      );
      skipTutorial();
    }
  }, [activeTutorial, isAuthenticated, location.pathname, skipTutorial]);

  // Mostrar tutorial de boas-vindas no primeiro login
  useEffect(() => {
    if (!settings.enabled || !settings.showWelcomeOnFirstLogin || !isAuthenticated) return;

    const welcomeProgress = getTutorialProgress('welcome');
    if (!welcomeProgress || welcomeProgress.status === 'not-started') {
      // Aguardar um momento para a UI carregar
      const timeout = setTimeout(() => {
        const restrictedRoutes = ['/', '/login', '/license', '/setup', '/wizard'];
        if (!restrictedRoutes.includes(location.pathname)) {
          log.debug(' Auto-starting welcome tutorial');
          startTutorial('welcome');
        } else {
          log.debug(
            ` Skip auto-start on restricted route: ${location.pathname}`
          );
        }
      }, 2000); // Increased delay for safety

      return () => clearTimeout(timeout);
    }
  }, [settings, getTutorialProgress, startTutorial, location.pathname, isAuthenticated]);

  // Não renderizar nada se tutoriais desabilitados ou nenhum ativo ou rota restrita
  const restrictedRoutes = ['/', '/login', '/license', '/setup', '/wizard'];
  const isRestricted = restrictedRoutes.includes(location.pathname);

  if (
    !settings.enabled ||
    !activeTutorial ||
    !tutorial ||
    !step ||
    isPaused ||
    !isAuthenticated ||
    isRestricted
  ) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      <Spotlight
        target={step.target}
        isActive={isSpotlightVisible}
        highContrast={settings.highContrast}
        onClickOutside={handleClickOutside}
        onClickTarget={handleClickTarget}
        config={{
          transitionDuration: 300 / settings.animationSpeed,
        }}
      />

      <TutorialTooltip
        step={step}
        stepIndex={currentStep}
        totalSteps={tutorial.steps.length}
        isVisible={isSpotlightVisible}
        fontSize={settings.fontSize}
        highContrast={settings.highContrast}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onSkip={handleSkip}
        onClose={handleClose}
      />
    </>
  );
};

export default TutorialProvider;
