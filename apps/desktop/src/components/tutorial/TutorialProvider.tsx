/**
 * TutorialProvider - Contexto global de tutoriais
 * Envolve a aplicação e renderiza o spotlight + tooltip
 */

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
    // Por padrão, não faz nada (usuário deve usar navegação explícita)
  }, []);

  const handleClickTarget = useCallback(() => {
    if (step?.action === 'click') {
      // Se a ação é clicar, avançar após clique
      handleNext();
    }
  }, [step, handleNext]);

  // Mostrar tutorial de boas-vindas no primeiro login
  useEffect(() => {
    if (!settings.enabled || !settings.showWelcomeOnFirstLogin) return;

    const welcomeProgress = getTutorialProgress('welcome');
    if (!welcomeProgress || welcomeProgress.status === 'not-started') {
      // Aguardar um momento para a UI carregar
      const timeout = setTimeout(() => {
        const restrictedRoutes = ['/login', '/license', '/setup', '/wizard'];
        if (!restrictedRoutes.includes(location.pathname)) {
          startTutorial('welcome');
        }
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [settings, getTutorialProgress, startTutorial, location.pathname]);

  // Não renderizar nada se tutoriais desabilitados ou nenhum ativo
  if (!settings.enabled || !activeTutorial || !tutorial || !step || isPaused) {
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
