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
import type { ShellAssets } from "@/lib/assets/asset-manifest";
import { BonusSummaryOverlay } from "@/components/presentation/bonus-summary-overlay";
import { BonusWinOverlay } from "@/components/presentation/bonus-win-overlay";
import { WinPresentationOverlay } from "@/components/presentation/win-presentation-overlay";

type WinPresentationControllerProps = {
  bonusAnnouncement: BonusAnnouncementEntry | null;
  bonusAnnouncementLocked: boolean;
  bonusSummary: BonusSummaryEntry | null;
  bonusSummaryLocked: boolean;
  winPresentation: WinPresentationEntry | null;
  shellAssets: ShellAssets;
  onDismissBonusAnnouncement: () => void;
  onDismissBonusSummary: () => void;
  onDismissWinPresentation: () => void;
};

export function WinPresentationController({
  bonusAnnouncement,
  bonusAnnouncementLocked,
  bonusSummary,
  bonusSummaryLocked,
  winPresentation,
  shellAssets,
  onDismissBonusAnnouncement,
  onDismissBonusSummary,
  onDismissWinPresentation
}: WinPresentationControllerProps) {
  return (
    <>
      <BonusWinOverlay
        announcement={bonusAnnouncement}
        locked={bonusAnnouncementLocked}
        onContinue={onDismissBonusAnnouncement}
      />
      <BonusSummaryOverlay
        locked={bonusSummaryLocked}
        onContinue={onDismissBonusSummary}
        summary={bonusSummary}
      />
      <WinPresentationOverlay
        onContinue={onDismissWinPresentation}
        presentation={winPresentation}
        shellAssets={shellAssets}
      />
    </>
  );
}
