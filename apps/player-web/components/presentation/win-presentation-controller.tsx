/*
Purpose: routes bonus and win presentation overlays through one UI controller
Layer: frontend (player-web)
Uses: bonus/win presentation state from use-slot-machine.ts
*/

import type {
  BonusAnnouncementEntry,
  BonusSummaryEntry,
  WinPresentationEntry
} from "@/lib/presentation/win-presentation-types";
import { BonusSummaryOverlay } from "@/components/presentation/bonus-summary-overlay";
import { BonusWinOverlay } from "@/components/presentation/bonus-win-overlay";
import { WinPresentationOverlay } from "@/components/presentation/win-presentation-overlay";

type WinPresentationControllerProps = {
  bonusAnnouncement: BonusAnnouncementEntry | null;
  bonusSummary: BonusSummaryEntry | null;
  winPresentation: WinPresentationEntry | null;
  onDismissBonusAnnouncement: () => void;
  onDismissBonusSummary: () => void;
  onDismissWinPresentation: () => void;
};

export function WinPresentationController({
  bonusAnnouncement,
  bonusSummary,
  winPresentation,
  onDismissBonusAnnouncement,
  onDismissBonusSummary,
  onDismissWinPresentation
}: WinPresentationControllerProps) {
  return (
    <>
      <BonusWinOverlay
        announcement={bonusAnnouncement}
        onContinue={onDismissBonusAnnouncement}
      />
      <BonusSummaryOverlay onContinue={onDismissBonusSummary} summary={bonusSummary} />
      <WinPresentationOverlay
        onContinue={onDismissWinPresentation}
        presentation={winPresentation}
      />
    </>
  );
}
