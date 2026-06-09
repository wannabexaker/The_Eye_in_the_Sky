/*
Purpose: compact music/SFX mixer for the support rail utility bar
Layer: frontend (player-web)
Uses: player UI store values passed from the game shell
*/

"use client";

import { useEffect, useRef, useState } from "react";

type AudioControlPopoverProps = {
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  onToggleSound: () => void;
  onSetMusicVolume: (volume: number) => void;
  onSetSfxVolume: (volume: number) => void;
};

const formatVolume = (value: number) => `${Math.round(value * 100)}%`;

export function AudioControlPopover({
  soundEnabled,
  musicVolume,
  sfxVolume,
  onToggleSound,
  onSetMusicVolume,
  onSetSfxVolume
}: AudioControlPopoverProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const audioAudible = soundEnabled && (musicVolume > 0 || sfxVolume > 0);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="audioControlWrap" ref={wrapperRef}>
      <button
        aria-expanded={open}
        aria-label={open ? "Close audio controls" : "Open audio controls"}
        className={`secondaryAction compactBottomAction iconOnlyAction supportRailUtilityButton audioControlButton ${open ? "is-open" : ""} ${audioAudible ? "is-audio-on" : "is-muted"}`}
        onClick={() => setOpen((current) => !current)}
        title={audioAudible ? "Audio controls" : "Audio muted"}
        type="button"
      >
        {audioAudible ? (
          <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
            <path d="M4 10h4l5-4v12l-5-4H4z" />
            <path d="M16.5 9a4 4 0 0 1 0 6" />
            <path d="M18.7 6.8a7 7 0 0 1 0 10.4" />
          </svg>
        ) : (
          <svg aria-hidden="true" className="utilityIcon" viewBox="0 0 24 24">
            <path d="M4 10h4l5-4v12l-5-4H4z" />
            <path d="M16 9l4 6" />
            <path d="M20 9l-4 6" />
          </svg>
        )}
      </button>

      {open ? (
        <div aria-label="Audio mixer" className="audioMixerPopover" role="dialog">
          <button className="audioMuteButton" onClick={onToggleSound} type="button">
            {soundEnabled ? "Mute" : "Unmute"}
          </button>

          <div className="audioSliderGrid">
            <label className="audioSliderColumn">
              <span>Music</span>
              <input
                aria-label="Music volume"
                className="audioVerticalSlider"
                max="1"
                min="0"
                onChange={(event) => onSetMusicVolume(Number(event.currentTarget.value))}
                step="0.01"
                type="range"
                value={musicVolume}
              />
              <strong>{formatVolume(musicVolume)}</strong>
            </label>

            <label className="audioSliderColumn">
              <span>SFX</span>
              <input
                aria-label="SFX volume"
                className="audioVerticalSlider"
                max="1"
                min="0"
                onChange={(event) => onSetSfxVolume(Number(event.currentTarget.value))}
                step="0.01"
                type="range"
                value={sfxVolume}
              />
              <strong>{formatVolume(sfxVolume)}</strong>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
