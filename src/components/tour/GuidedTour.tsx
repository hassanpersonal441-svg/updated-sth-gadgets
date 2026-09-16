'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  badge?: string;
  onBeforeStep?: () => void;
}

export interface WelcomeModalConfig {
  title: string;
  text: string;
  startText?: string;
  skipText?: string;
  onStart: () => void;
  onSkip: () => void;
}

export interface CompletionModalConfig {
  title: string;
  text: string;
  finishText?: string;
  exploreText?: string;
  onFinish: () => void;
  onExplore?: () => void;
}

interface GuidedTourProps {
  isOpen: boolean;
  steps: TourStep[];
  currentStepIndex: number;
  showWelcome: boolean;
  showCompletion: boolean;
  welcomeConfig?: WelcomeModalConfig;
  completionConfig?: CompletionModalConfig;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
  onStepChange?: (index: number) => void;
}

interface RectState {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function GuidedTour({
  isOpen,
  steps,
  currentStepIndex,
  showWelcome,
  showCompletion,
  welcomeConfig,
  completionConfig,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: GuidedTourProps) {
  const [targetRect, setTargetRect] = useState<RectState | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' | 'left' | 'right' }>({
    top: 0,
    left: 0,
    placement: 'bottom',
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];

  // Calculate target position and tooltip coordinates
  const updatePosition = useCallback(() => {
    if (!isOpen || showWelcome || showCompletion || !currentStep) return;

    if (currentStep.onBeforeStep) {
      currentStep.onBeforeStep();
    }

    const el = document.querySelector(currentStep.targetSelector);
    if (!el) {
      setTargetRect(null);
      return;
    }

    // Scroll element into view smoothly if not visible
    const bounds = el.getBoundingClientRect();
    const isVisible =
      bounds.top >= 0 &&
      bounds.left >= 0 &&
      bounds.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      bounds.right <= (window.innerWidth || document.documentElement.clientWidth);

    if (!isVisible) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    // Give a short delay after scroll to compute precise rect
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });

      // Calculate placement
      const padding = 16;
      const tooltipWidth = tooltipRef.current?.offsetWidth || 340;
      const tooltipHeight = tooltipRef.current?.offsetHeight || 200;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let placement: 'top' | 'bottom' | 'left' | 'right' = currentStep.position || 'bottom';

      // Auto fallback placement if specified placement overflows screen
      if (placement === 'bottom' && rect.bottom + tooltipHeight + padding > viewportHeight) {
        placement = 'top';
      } else if (placement === 'top' && rect.top - tooltipHeight - padding < 0) {
        placement = 'bottom';
      } else if (placement === 'left' && rect.left - tooltipWidth - padding < 0) {
        placement = 'bottom';
      } else if (placement === 'right' && rect.right + tooltipWidth + padding > viewportWidth) {
        placement = 'bottom';
      }

      let top = 0;
      let left = 0;

      if (placement === 'bottom') {
        top = rect.bottom + 12;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      } else if (placement === 'top') {
        top = rect.top - tooltipHeight - 12;
        left = rect.left + rect.width / 2 - tooltipWidth / 2;
      } else if (placement === 'left') {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.left - tooltipWidth - 12;
      } else if (placement === 'right') {
        top = rect.top + rect.height / 2 - tooltipHeight / 2;
        left = rect.right + 12;
      }

      // Constrain within viewport padding
      left = Math.max(16, Math.min(left, viewportWidth - tooltipWidth - 16));
      top = Math.max(16, Math.min(top, viewportHeight - tooltipHeight - 16));

      setTooltipPos({ top, left, placement });
    }, 120);
  }, [isOpen, showWelcome, showCompletion, currentStep]);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleResizeOrScroll = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, currentStepIndex, showWelcome, showCompletion, updatePosition]);

  // Keyboard Navigation: Escape to skip, ArrowRight / ArrowLeft to step
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSkip();
      } else if (!showWelcome && !showCompletion) {
        if (e.key === 'ArrowRight') {
          if (currentStepIndex < steps.length - 1) onNext();
          else onFinish();
        } else if (e.key === 'ArrowLeft') {
          if (currentStepIndex > 0) onBack();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showWelcome, showCompletion, currentStepIndex, steps.length, onNext, onBack, onSkip, onFinish]);

  if (!isOpen) return null;

  // Render Welcome Modal
  if (showWelcome && welcomeConfig) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-2xl space-y-5 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#00C4CC]/10 border border-[#00C4CC]/30 text-3xl shadow-[0_0_20px_rgba(0,196,204,0.3)]">
            👋
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-black text-white">
              {welcomeConfig.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {welcomeConfig.text}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={welcomeConfig.onStart}
              className="flex-1 rounded-xl bg-[#00C4CC] hover:bg-[#00D8E0] py-3 text-xs font-black text-slate-950 shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.01] cursor-pointer"
            >
              {welcomeConfig.startText || 'Start Tour 🚀'}
            </button>
            <button
              type="button"
              onClick={welcomeConfig.onSkip}
              className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              {welcomeConfig.skipText || 'Skip for Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Completion Modal
  if (showCompletion && completionConfig) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0C1420] p-6 shadow-2xl space-y-5 text-center text-white">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-3xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            🚀
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-xl sm:text-2xl font-black text-white">
              {completionConfig.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {completionConfig.text}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={completionConfig.onFinish}
              className="flex-1 rounded-xl bg-gradient-to-r from-[#00C4CC] to-cyan-600 py-3 text-xs font-black text-slate-950 shadow-[0_0_15px_rgba(0,196,204,0.3)] transition hover:scale-[1.01] cursor-pointer"
            >
              {completionConfig.finishText || 'Finish Tour ✨'}
            </button>
            {completionConfig.onExplore && (
              <button
                type="button"
                onClick={completionConfig.onExplore}
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-xs font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                {completionConfig.exploreText || 'Explore'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dark Overlay with Highlight Ring Spotlight */}
      <svg className="absolute inset-0 h-full w-full pointer-events-auto">
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - 6}
                y={targetRect.top - 6}
                width={targetRect.width + 12}
                height={targetRect.height + 12}
                rx="12"
                ry="12"
                fill="black"
              />
            )}
          </mask>
        </defs>

        {/* Backdrop Shadow Mask */}
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(5, 8, 14, 0.78)"
          mask="url(#tour-spotlight-mask)"
          onClick={onSkip}
        />
      </svg>

      {/* Cyan Glowing Spotlight Ring Around Highlighted Target Element */}
      {targetRect && (
        <div
          className="absolute rounded-xl border-2 border-[#00C4CC] shadow-[0_0_20px_rgba(0,196,204,0.6)] pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      {/* Tooltip Card */}
      {currentStep && (
        <div
          ref={tooltipRef}
          className="absolute pointer-events-auto w-[320px] sm:w-[360px] rounded-2xl border border-slate-800 bg-[#0C1420] p-5 shadow-2xl space-y-4 text-white transition-all duration-300 animate-fadeIn"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
          }}
        >
          {/* Header Row */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-md bg-[#00C4CC]/10 border border-[#00C4CC]/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#00C4CC]">
                {currentStep.badge || `Step ${currentStepIndex + 1} of ${steps.length}`}
              </span>
            </div>
            <button
              type="button"
              onClick={onSkip}
              className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
              title="Skip Tour (Esc)"
            >
              ✕ Skip
            </button>
          </div>

          {/* Title & Description */}
          <div className="space-y-1.5">
            <h3 className="font-display text-sm sm:text-base font-black text-white">
              {currentStep.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
            <span className="font-mono text-[11px] font-bold text-slate-400">
              {currentStepIndex + 1} / {steps.length}
            </span>

            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={onBack}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 font-bold text-slate-300 hover:bg-slate-700 transition cursor-pointer"
                >
                  ← Back
                </button>
              )}

              <button
                type="button"
                onClick={currentStepIndex < steps.length - 1 ? onNext : onFinish}
                className="rounded-xl bg-[#00C4CC] hover:bg-[#00D8E0] px-4 py-1.5 font-black text-slate-950 shadow-[0_0_12px_rgba(0,196,204,0.3)] transition hover:scale-[1.02] cursor-pointer"
              >
                {currentStepIndex < steps.length - 1 ? 'Next →' : 'Finish ✨'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
