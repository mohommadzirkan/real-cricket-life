import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import {
  BattingHand,
  BowlingStyle,
  PlayerProfile,
  PlayerRole,
} from '../types/game';

interface PlayerProfileScreenProps {
  profile: PlayerProfile;
  onBack: () => void;
  onUpdateProfile: (updater: (prev: PlayerProfile) => PlayerProfile) => void;
}

const SKIN_TONES = ['#F3D2B3', '#D9A77C', '#C68B59', '#8D5524', '#5C3317'];
const KIT_COLORS = ['#065F46', '#1E3A8A', '#7F1D1D', '#0F172A', '#B45309'];

export const PlayerProfileScreen: React.FC<PlayerProfileScreenProps> = ({
  profile,
  onBack,
  onUpdateProfile,
}) => {
  const [tab, setTab] = useState<'stats' | 'create'>('stats');
  const [savedNotice, setSavedNotice] = useState(false);

  const s = profile.stats;
  const dismissals = Math.max(1, s.innings - s.notOuts);
  const batAvg = s.innings > 0 ? (s.runs / dismissals).toFixed(2) : '0.00';
  const strikeRate = s.ballsFaced > 0 ? ((s.runs / s.ballsFaced) * 100).toFixed(1) : '0.0';
  const economy = s.oversBowled > 0 ? (s.runsConceded / s.oversBowled).toFixed(2) : '0.00';

  const saveEdit = (patch: Partial<PlayerProfile>) => {
    onUpdateProfile((prev) => ({ ...prev, ...patch }));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1400);
  };

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#070B09]/94 p-4 sm:p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F1714] border border-white/12 text-slate-200 flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            PLAYER PROFILE &amp; STATS
          </h2>
          <div className="w-20" />
        </div>

        {/* Hero Identity Card */}
        <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar Preview SVG */}
            <div
              className="w-16 h-16 rounded-2xl border border-white/20 flex items-center justify-center font-display text-2xl font-extrabold text-white shrink-0"
              style={{
                background: `linear-gradient(135deg, ${profile.avatar.jerseyColor}, #070B09)`,
              }}
            >
              #{profile.jerseyNumber}
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-white">{profile.name}</div>
              <div className="text-xs text-slate-300 mt-0.5">
                {profile.role} · {profile.battingHand} · {profile.bowlingStyle}
              </div>
              <div className="text-xs text-emerald-400 mt-0.5">
                {profile.career.tier} · World Rank #{profile.career.worldRank}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090E0C] border border-white/10">
            <button
              onClick={() => setTab('stats')}
              className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === 'stats' ? 'bg-emerald-500 text-[#05110B]' : 'text-slate-300'
              }`}
            >
              Career Statistics
            </button>
            <button
              onClick={() => setTab('create')}
              className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold cursor-pointer ${
                tab === 'create' ? 'bg-emerald-500 text-[#05110B]' : 'text-slate-300'
              }`}
            >
              Edit Player &amp; Avatar
            </button>
          </div>
        </div>

        {tab === 'stats' ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
              {[
                { label: 'Matches', value: s.matches },
                { label: 'Total Runs', value: s.runs },
                { label: 'Batting Average', value: batAvg },
                { label: 'Strike Rate', value: strikeRate },
                { label: 'High Score', value: `${s.highScore}` },
                { label: 'Wickets', value: s.wickets },
                { label: 'Bowling Economy', value: economy },
                { label: 'Catches / Run-Outs', value: `${s.catches} / ${s.runOuts}` },
              ].map((m) => (
                <div
                  key={m.label}
                  className="p-4 rounded-2xl bg-[#0D1411] border border-white/10"
                >
                  <div className="text-xs text-slate-400">{m.label}</div>
                  <div className="font-mono-tabular text-2xl font-bold text-white mt-1">
                    {m.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
              <div className="text-sm font-semibold text-white">Best Performances &amp; Milestones</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                <div>
                  <span className="text-slate-400">50s / 100s:</span>{' '}
                  <strong className="text-white">{s.fifties} / {s.hundreds}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Fours / Sixes:</span>{' '}
                  <strong className="text-white">{s.fours} / {s.sixes}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Best Bowling:</span>{' '}
                  <strong className="text-white">
                    {s.bestBowlingWickets}/{s.bestBowlingRuns}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Not Outs:</span>{' '}
                  <strong className="text-white">{s.notOuts}</strong>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
              <div className="text-sm font-semibold text-white">Recent Matches</div>
              <div className="space-y-2">
                {profile.recentMatches.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-[#090E0C] border border-white/8 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums"
                  >
                    <div>
                      <span className="font-semibold text-white">{m.format} vs {m.opponent}</span>
                      <span className="text-slate-400 ml-2">{m.date}</span>
                    </div>
                    <div className="text-slate-300">
                      {m.userRuns}({m.userBalls}) · {m.userWickets}w
                    </div>
                    <div className="text-emerald-400 font-semibold">
                      {m.result} (+{m.pointsEarned} pts)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Player Creation & Avatar Customizer */
          <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1.5 block">
                <span className="text-xs text-slate-400">Player Name</span>
                <input
                  type="text"
                  value={profile.name}
                  maxLength={24}
                  onChange={(e) => saveEdit({ name: e.target.value })}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#090E0C] border border-white/15 text-white text-sm"
                />
              </label>

              <label className="space-y-1.5 block">
                <span className="text-xs text-slate-400">Jersey Number (1–99)</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={profile.jerseyNumber}
                  onChange={(e) =>
                    saveEdit({
                      jerseyNumber: Math.max(1, Math.min(99, Number(e.target.value) || 1)),
                    })
                  }
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#090E0C] border border-white/15 text-white text-sm font-mono-tabular"
                />
              </label>

              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 block">Batting Hand</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['Right-Hand', 'Left-Hand'] as BattingHand[]).map((hand) => (
                    <button
                      key={hand}
                      onClick={() => saveEdit({ battingHand: hand })}
                      className={`min-h-[44px] rounded-xl border text-xs font-semibold cursor-pointer ${
                        profile.battingHand === hand
                          ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                          : 'bg-[#090E0C] border-white/10 text-slate-300'
                      }`}
                    >
                      {hand}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 block">Player Role</span>
                <div className="grid grid-cols-2 gap-2">
                  {(['Batsman', 'Bowler', 'All-Rounder', 'Wicketkeeper'] as PlayerRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => saveEdit({ role })}
                      className={`min-h-[42px] rounded-xl border text-xs font-semibold cursor-pointer ${
                        profile.role === role
                          ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                          : 'bg-[#090E0C] border-white/10 text-slate-300'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 block">Bowling Style</span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    'Right-Arm Fast',
                    'Left-Arm Fast',
                    'Right-Arm Medium',
                    'Off-Spin',
                    'Leg-Spin',
                  ] as BowlingStyle[]
                ).map((bs) => (
                  <button
                    key={bs}
                    onClick={() => saveEdit({ bowlingStyle: bs })}
                    className={`min-h-[42px] px-3.5 rounded-xl border text-xs font-semibold cursor-pointer ${
                      profile.bowlingStyle === bs
                        ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                        : 'bg-[#090E0C] border-white/10 text-slate-300'
                    }`}
                  >
                    {bs}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Avatar Skin Tone</span>
                <div className="flex gap-2.5">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone}
                      onClick={() =>
                        saveEdit({ avatar: { ...profile.avatar, skinTone: tone } })
                      }
                      className={`w-10 h-10 rounded-full border-2 cursor-pointer ${
                        profile.avatar.skinTone === tone ? 'border-emerald-400 scale-110' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: tone }}
                      aria-label={`Skin tone ${tone}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs text-slate-400 block">Primary Match Kit Color</span>
                <div className="flex gap-2.5">
                  {KIT_COLORS.map((col) => (
                    <button
                      key={col}
                      onClick={() =>
                        saveEdit({ avatar: { ...profile.avatar, jerseyColor: col } })
                      }
                      className={`w-10 h-10 rounded-xl border-2 cursor-pointer ${
                        profile.avatar.jerseyColor === col ? 'border-emerald-400 scale-110' : 'border-white/20'
                      }`}
                      style={{ backgroundColor: col }}
                      aria-label={`Kit color ${col}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {savedNotice && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <Check className="w-4 h-4" />
                <span>Saved locally to your 3D cricketer rig.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
