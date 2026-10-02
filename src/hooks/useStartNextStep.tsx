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
  const [confirmingLessonId, setConfirmingLessonId] = useState<string | null>(null);
  const confirmingLesson = confirmingLessonId ? lessons.find((l) => l.id === confirmingLessonId) : undefined;

  const start = (step: NextStep) => {
    if (step.requiresResourceConfirmation && step.lessonId) {
      setConfirmingLessonId(step.lessonId);
      return;
    }
    navigate(step.href);
  };

  const handleConfirmedStart = (lessonId: string, resource?: Resource) => {
    startLearningSession({ lessonId, source: resource });
    navigate(`/study/${lessonId}`);
  };

  const confirmModal = confirmingLesson ? (
    <ResourceConfirmationModal
      isOpen={true}
      onClose={() => setConfirmingLessonId(null)}
      lesson={confirmingLesson}
      onConfirm={(selectedResource) => {
        handleConfirmedStart(confirmingLesson.id, selectedResource);
        setConfirmingLessonId(null);
      }}
    />
  ) : null;

  return { start, confirmModal };
}
