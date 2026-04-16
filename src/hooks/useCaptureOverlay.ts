/**
 * useCaptureOverlay — manages overlay visibility and last captured photo metadata.
 *
 * Responsibilities:
 * - Comparison overlay state (before/after)
 * - Grid selector modal visibility
 * - Timer selector modal visibility
 * - Last captured photo URI and composition score
 */

import { useState } from 'react';

export interface UseCaptureOverlayReturn {
  showComparison: boolean;
  setShowComparison: React.Dispatch<React.SetStateAction<boolean>>;
  showGridModal: boolean;
  setShowGridModal: React.Dispatch<React.SetStateAction<boolean>>;
  showTimerModal: boolean;
  setShowTimerModal: React.Dispatch<React.SetStateAction<boolean>>;
  lastCapturedUri: string | null;
  setLastCapturedUri: React.Dispatch<React.SetStateAction<string | null>>;
  lastCapturedScore: number | null;
  setLastCapturedScore: React.Dispatch<React.SetStateAction<number | null>>;
  lastCapturedScoreReason: string | null;
  setLastCapturedScoreReason: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useCaptureOverlay(): UseCaptureOverlayReturn {
  const [showComparison, setShowComparison] = useState(false);
  const [showGridModal, setShowGridModal] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false);
  const [lastCapturedUri, setLastCapturedUri] = useState<string | null>(null);
  const [lastCapturedScore, setLastCapturedScore] = useState<number | null>(null);
  const [lastCapturedScoreReason, setLastCapturedScoreReason] = useState<string | null>(null);

  return {
    showComparison,
    setShowComparison,
    showGridModal,
    setShowGridModal,
    showTimerModal,
    setShowTimerModal,
    lastCapturedUri,
    setLastCapturedUri,
    lastCapturedScore,
    setLastCapturedScore,
    lastCapturedScoreReason,
    setLastCapturedScoreReason,
  };
}
