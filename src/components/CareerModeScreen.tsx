import React from 'react';
import { ArrowLeft, Award, CheckCircle2, Play, Trophy } from 'lucide-react';
import { ACHIEVEMENTS_LIST, CAREER_SERIES, SAMPLE_OPPONENT_TEAMS } from '../data/sampleData';
import { CareerTier, MatchConfig, PlayerProfile } from '../types/game';

interface CareerModeScreenProps {
  profile: PlayerProfile;
  onBack: () => void;
  onStartCareerMatch: (config: MatchConfig) => void;
}

const TIERS: CareerTier[] = [
  'Club Beginner',
  'State Challenger',
  'Domestic Pro',
  'Franchise Star',
  'International Legend',
];

export const CareerModeScreen: React.FC<CareerModeScreenProps> = ({
  profile,
  onBack,
  onStartCareerMatch,
}) => {
  const currentTierIdx = TIERS.indexOf(profile.career.tier);

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#070B09]/94 p-4 sm:p-6 lg:p-10">
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F1714] border border-white/12 text-slate-200 flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
            CAREER PROGRESSION
          </h2>
          <div className="w-20" />
        </div>

        {/* Career Tier Ladder */}
        <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs text-slate-400">Current Tier</div>
              <div className="font-display text-2xl font-bold text-emerald-400">
                {profile.career.tier}
              </div>
            </div>
            <div className="text-right tabular-nums">
              <div className="text-xs text-slate-400">World Ranking · Career XP</div>
              <div className="font-mono-tabular text-lg font-bold text-white">
                #{profile.career.worldRank} · {profile.career.xp.toLocaleString()} XP
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TIERS.map((tier, idx) => (
              <div
                key={tier}
                className={`p-3 rounded-xl border text-xs ${
                  idx === currentTierIdx
                    ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold'
                    : idx < currentTierIdx
                    ? 'bg-[#090E0C] border-emerald-500/30 text-emerald-300'
                    : 'bg-[#090E0C] border-white/10 text-slate-500'
                }`}
              >
                {tier}
              </div>
            ))}
          </div>
        </div>

        {/* Career Series Contracts (Playable!) */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-white">Playable Career Fixtures</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CAREER_SERIES.map((series) => {
              const opp = SAMPLE_OPPONENT_TEAMS.find((t) => t.id === series.opponentId)!;
              const completed = profile.career.completedSeriesIds.includes(series.id);
              return (
                <div
                  key={series.id}
                  className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-amber-400 font-semibold">{series.tier}</span>
                      {completed && (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Won
                        </span>
                      )}
                    </div>
                    <div className="font-display text-2xl font-bold text-white">{series.title}</div>
                    <p className="text-xs text-slate-400">{series.description}</p>
                    <div className="text-xs text-slate-300 tabular-nums pt-1">
                      vs {opp.name} · {series.format} ({series.overs} ov) · Reward +{series.rewardPoints} pts
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      onStartCareerMatch({
                        format: series.format,
                        overs: series.overs,
                        stadiumTime: series.format === 'ODI' ? 'Day' : 'Night',
                        weather: series.format === 'ODI' ? 'Overcast' : 'Clear',
                        pitch: 'Flat',
                        opponentTeamId: series.opponentId,
                        difficulty: 'Pro',
                        isPractice: false,
                        isCareerMatch: true,
                        careerSeriesId: series.id,
                      })
                    }
                    className="min-h-[46px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#05110B] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Fixture</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trophy Cabinet & Achievements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Trophy Cabinet ({profile.career.trophies.length})</span>
            </div>
            <div className="space-y-2">
              {profile.career.trophies.map((tr) => (
                <div
                  key={tr}
                  className="p-3 rounded-xl bg-[#090E0C] border border-amber-500/25 text-sm font-semibold text-amber-200 flex items-center gap-2"
                >
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{tr}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Milestones &amp; Achievements</span>
            </div>
            <div className="space-y-2">
              {ACHIEVEMENTS_LIST.map((ach) => {
                const unlocked = profile.career.unlockedAchievements.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                      unlocked
                        ? 'bg-emerald-500/10 border-emerald-400/35 text-white'
                        : 'bg-[#090E0C] border-white/8 text-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{ach.title}</div>
                      <div>{ach.desc}</div>
                    </div>
                    <div className="font-mono-tabular font-semibold text-amber-300">
                      {unlocked ? 'Unlocked' : `+${ach.reward} pts`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
