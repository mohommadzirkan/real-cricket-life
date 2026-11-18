import React, { useEffect, useState } from 'react';
import { ArrowLeft, Eye, RotateCcw, Volume2 } from 'lucide-react';
import { CameraMode, GameSettings } from '../types/game';

interface SettingsScreenProps {
  settings: GameSettings;
  onBack: () => void;
  onUpdateSettings: (updater: (prev: GameSettings) => GameSettings) => void;
  onResetProgress: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onBack,
  onUpdateSettings,
  onResetProgress,
}) => {
  const [xrSupported, setXrSupported] = useState<string>('Checking browser WebXR API...');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & {
      xr?: { isSessionSupported?: (mode: string) => Promise<boolean> };
    };
    if (!nav.xr || !nav.xr.isSessionSupported) {
      setXrSupported('WebXR headset session not active in standard Android browser (First-Person Camera Ready)');
      return;
    }
    nav.xr
      .isSessionSupported('immersive-vr')
      .then((ok) =>
        setXrSupported(
          ok
            ? 'WebXR API detected on device (Prototype uses 3D First-Person Helmet Cam)'
            : 'Immersive VR headset not attached — First-Person Camera & Touch Look enabled'
        )
      )
      .catch(() =>
        setXrSupported('Immersive VR unavailable in standard browser — First-Person Camera Ready')
      );
  }, []);

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#070B09]/94 p-4 sm:p-6 lg:p-10">
      <div className="max-w-3xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F1714] border border-white/12 text-slate-200 flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            SETTINGS &amp; VR ARCHITECTURE
          </h2>
          <div className="w-20" />
        </div>

        {/* Audio Settings */}
        <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-4">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            <span>Audio &amp; Commentary</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-4 text-xs text-slate-300">
              <span>Master Volume ({Math.round(settings.masterVolume * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.masterVolume}
                onChange={(e) =>
                  onUpdateSettings((s) => ({ ...s, masterVolume: Number(e.target.value) }))
                }
                className="w-44 accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between gap-4 text-xs text-slate-300">
              <span>Bat / Wicket SFX ({Math.round(settings.sfxVolume * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.sfxVolume}
                onChange={(e) =>
                  onUpdateSettings((s) => ({ ...s, sfxVolume: Number(e.target.value) }))
                }
                className="w-44 accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between gap-4 text-xs text-slate-300">
              <span>Stadium Crowd &amp; Rain ({Math.round(settings.crowdVolume * 100)}%)</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.crowdVolume}
                onChange={(e) =>
                  onUpdateSettings((s) => ({ ...s, crowdVolume: Number(e.target.value) }))
                }
                className="w-44 accent-emerald-500"
              />
            </label>

            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={() => onUpdateSettings((s) => ({ ...s, muted: !s.muted }))}
                className={`min-h-[42px] px-4 rounded-xl border text-xs font-semibold cursor-pointer ${
                  settings.muted
                    ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                    : 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                }`}
              >
                {settings.muted ? 'Audio Muted' : 'Audio Enabled'}
              </button>
              <button
                onClick={() =>
                  onUpdateSettings((s) => ({ ...s, commentaryVoice: !s.commentaryVoice }))
                }
                className={`min-h-[42px] px-4 rounded-xl border text-xs font-semibold cursor-pointer ${
                  settings.commentaryVoice
                    ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                    : 'bg-[#090E0C] border-white/10 text-slate-300'
                }`}
              >
                Speech Commentary: {settings.commentaryVoice ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Camera & VR-Ready Architecture */}
        <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-4">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Camera &amp; Future VR Compatibility</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'Broadcast', label: 'Broadcast TV' },
                { id: 'FirstPersonVR', label: '1st-Person VR' },
                { id: 'BowlerCam', label: 'Bowler Cam' },
                { id: 'Drone', label: 'Stadium Drone' },
              ] as Array<{ id: CameraMode; label: string }>
            ).map((cam) => (
              <button
                key={cam.id}
                onClick={() => onUpdateSettings((s) => ({ ...s, cameraMode: cam.id }))}
                className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                  settings.cameraMode === cam.id
                    ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                    : 'bg-[#090E0C] border-white/10 text-slate-300'
                }`}
              >
                {cam.label}
              </button>
            ))}
          </div>

          <label className="flex items-center justify-between gap-4 text-xs text-slate-300">
            <span>1st-Person Look Sensitivity ({settings.vrHeadlookSensitivity.toFixed(1)}x)</span>
            <input
              type="range"
              min={0.4}
              max={2.0}
              step={0.1}
              value={settings.vrHeadlookSensitivity}
              onChange={(e) =>
                onUpdateSettings((s) => ({
                  ...s,
                  vrHeadlookSensitivity: Number(e.target.value),
                }))
              }
              className="w-44 accent-emerald-500"
            />
          </label>

          <button
            onClick={() =>
              onUpdateSettings((s) => ({ ...s, timingIndicator: !s.timingIndicator }))
            }
            className={`min-h-[42px] px-4 rounded-xl border text-xs font-semibold cursor-pointer ${
              settings.timingIndicator
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                : 'bg-[#090E0C] border-white/10 text-slate-300'
            }`}
          >
            Batting Timing Bar: {settings.timingIndicator ? 'Shown' : 'Hidden (Pro)'}
          </button>

          <div className="p-3.5 rounded-xl bg-[#090E0C] border border-white/10 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-white">VR Architecture Status</div>
            <div className="text-emerald-400">{xrSupported}</div>
            <p className="text-slate-400 leading-relaxed pt-1">
              The 3D scene separates helmet eye-level camera transforms from bat swing actions so future WebXR 6DoF headset/controller bindings can plug directly into the bat pivot. Standard Android browsers render the flat/touch 1st-Person camera rather than active stereoscopic VR.
            </p>
          </div>
        </div>

        {/* Local Save Reset */}
        <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white">Local Prototype Save</div>
            <div className="text-xs text-slate-400">
              Profile, squad order, stats, and virtual shop unlocks persist in browser storage.
            </div>
          </div>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="min-h-[42px] px-4 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Save</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onResetProgress();
                  setConfirmReset(false);
                }}
                className="min-h-[42px] px-4 rounded-xl bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Reset
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="min-h-[42px] px-3 rounded-xl bg-[#16221D] text-slate-300 text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
