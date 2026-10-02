import { useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { ResourceConfirmationModal } from '../components/study/ResourceConfirmationModal';
import type { Resource } from '../types';
import type { NextStep } from '../utils/nextStep';

/**
 * Shared "เริ่มขั้นต่อไป" behaviour: study steps go through the existing
 * resource confirmation, everything else navigates to step.href.
 */
export function useStartNextStep(): { start: (step: NextStep) => void; confirmModal: ReactNode } {
  const navigate = useNavigate();
  const { lessons, startLearningSession } = useStore();
  const [confirming, setConfirming] = useState<NextStep | null>(null);
  const confirmingLesson = confirming?.lessonId ? lessons.find((l) => l.id === confirming.lessonId) : undefined;

  const start = (step: NextStep) => {
    if (step.requiresResourceConfirmation && step.lessonId) {
      setConfirming(step);
      return;
    }
    navigate(step.href);
  };

  const handleConfirmedStart = (lessonId: string, resource?: Resource, plannedMinutes?: number, curriculumLessonId?: string) => {
    startLearningSession({ lessonId, source: resource, plannedMinutes, curriculumLessonId });
    navigate(`/study/${lessonId}`);
  };

  const confirmModal = confirmingLesson ? (
    <ResourceConfirmationModal
      isOpen={true}
      onClose={() => setConfirming(null)}
      lesson={confirmingLesson}
      suggestion={confirming?.curriculum?.recommendedResource}
      plannedMinutes={confirming?.minutes}
      onConfirm={(selectedResource) => {
        handleConfirmedStart(confirmingLesson.id, selectedResource, confirming?.minutes, confirming?.curriculum?.lessonId);
        setConfirming(null);
      }}
    />
  ) : null;

  return { start, confirmModal };
}
