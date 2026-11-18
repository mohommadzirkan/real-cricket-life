import React, { useState } from 'react';
import { ArrowLeft, Play, Trophy } from 'lucide-react';
import { SAMPLE_OPPONENT_TEAMS } from '../data/sampleData';
import { MatchConfig, MatchFormat } from '../types/game';

interface TournamentsScreenProps {
  onBack: () => void;
  onLaunchMatch: (config: MatchConfig) => void;
}

const TOURNAMENTS: Array<{
  id: string;
  name: string;
  format: MatchFormat;
  overs: number;
  prizePoints: number;
  stages: string[];
}> = [
  {
    id: 'tour_t10',
    name: 'Floodlight T10 Super Cup',
    format: 'T10',
    overs: 10,
    prizePoints: 1800,
    stages: ['Quarter-Final vs London Royals', 'Semi-Final vs Lahore Lions', 'Final vs Mumbai Titans'],
  },
  {
    id: 'tour_t20',
    name: 'Global Premier T20 League',
    format: 'T20',
    overs: 20,
    prizePoints: 3200,
    stages: ['Group Clash vs Mumbai Titans', 'Qualifier vs Sydney Thunderbolts', 'Grand Final'],
  },
  {
    id: 'tour_odi',
    name: 'Champions ODI World Cup',
    format: 'ODI',
    overs: 50,
    prizePoints: 5000,
    stages: ['Pool Match vs Lahore Lions', 'Semi-Final vs London Royals', 'Lords Final vs Sydney'],
  },
  {
    id: 'tour_test',
    name: 'World Test Championship Mace',
    format: 'Test',
    overs: 90,
    prizePoints: 6500,
    stages: ['1st Test vs London Royals', '2nd Test vs Sydney Thunderbolts'],
  },
];

export const TournamentsScreen: React.FC<TournamentsScreenProps> = ({
  onBack,
  onLaunchMatch,
}) => {
  const [selectedId, setSelectedId] = useState(TOURNAMENTS[0].id);
  const selected = TOURNAMENTS.find((t) => t.id === selectedId)!;

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
            TOURNAMENTS
          </h2>
          <div className="w-20" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          <div className="md:col-span-5 space-y-3">
            {TOURNAMENTS.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`w-full p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  selectedId === t.id
                    ? 'bg-emerald-500/15 border-emerald-400 text-white'
                    : 'bg-[#0D1411] border-white/10 text-slate-300 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400">{t.format}</span>
                  <span className="text-xs font-mono-tabular text-emerald-400">
                    +{t.prizePoints.toLocaleString()} pts
                  </span>
                </div>
                <div className="font-display text-xl font-bold mt-1">{t.name}</div>
              </button>
            ))}
          </div>

          <div className="md:col-span-7 p-6 rounded-2xl bg-[#0D1411] border border-white/10 space-y-5">
            <div className="flex items-center gap-3">
              <Trophy className="w-7 h-7 text-amber-400" />
              <div>
                <div className="font-display text-2xl font-bold text-white">{selected.name}</div>
                <div className="text-xs text-slate-400">
                  {selected.format} Format · {selected.overs} Overs · Prize {selected.prizePoints.toLocaleString()} Virtual Points
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-slate-400">Knockout Bracket &amp; Fixtures</div>
              {selected.stages.map((stage, idx) => (
                <div
                  key={stage}
                  className="p-3.5 rounded-xl bg-[#090E0C] border border-white/10 flex items-center justify-between gap-3"
                >
                  <div className="text-sm text-white font-medium">
                    <span className="text-emerald-400 font-mono-tabular mr-2">R{idx + 1}</span>
                    {stage}
                  </div>
                  <button
                    onClick={() =>
                      onLaunchMatch({
                        format: selected.format,
                        overs: selected.overs,
                        stadiumTime: selected.format === 'Test' ? 'Day' : 'Night',
                        weather: selected.format === 'Test' ? 'Overcast' : 'Clear',
                        pitch: selected.format === 'Test' ? 'Green' : 'Flat',
                        opponentTeamId: SAMPLE_OPPONENT_TEAMS[idx % SAMPLE_OPPONENT_TEAMS.length].id,
                        difficulty: idx === selected.stages.length - 1 ? 'Legend' : 'Pro',
                        isPractice: false,
                        tournamentId: selected.id,
                      })
                    }
                    className="min-h-[40px] px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#05110B] font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
