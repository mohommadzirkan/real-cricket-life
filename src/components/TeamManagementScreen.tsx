import React, { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Crown, Shield } from 'lucide-react';
import { SAMPLE_OPPONENT_TEAMS } from '../data/sampleData';
import { FieldPreset, SquadPlayer, Team, TeamStrategy } from '../types/game';

interface TeamManagementScreenProps {
  userTeam: Team;
  onBack: () => void;
  onUpdateOrder: (players: SquadPlayer[]) => void;
  onSetCaptainVice: (captainId: string, viceId: string) => void;
  onUpdateBowlingOrder: (bowlingOrderIds: string[]) => void;
  onUpdateTactics: (field: FieldPreset, strategy: TeamStrategy) => void;
}

export const TeamManagementScreen: React.FC<TeamManagementScreenProps> = ({
  userTeam,
  onBack,
  onUpdateOrder,
  onSetCaptainVice,
  onUpdateBowlingOrder,
  onUpdateTactics,
}) => {
  const [tab, setTab] = useState<'squad' | 'bowling' | 'opponents'>('squad');

  const captain = userTeam.players.find((p) => p.isCaptain) || userTeam.players[0];
  const vice = userTeam.players.find((p) => p.isViceCaptain) || userTeam.players[2];

  const moveBatter = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= userTeam.players.length) return;
    const copy = [...userTeam.players];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onUpdateOrder(copy);
  };

  const toggleBowlerInRotation = (playerId: string) => {
    const exists = userTeam.bowlingOrderIds.includes(playerId);
    if (exists) {
      if (userTeam.bowlingOrderIds.length <= 2) return;
      onUpdateBowlingOrder(userTeam.bowlingOrderIds.filter((id) => id !== playerId));
    } else {
      onUpdateBowlingOrder([...userTeam.bowlingOrderIds, playerId]);
    }
  };

  const moveBowlerOrder = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= userTeam.bowlingOrderIds.length) return;
    const copy = [...userTeam.bowlingOrderIds];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onUpdateBowlingOrder(copy);
  };

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
            MY TEAM · {userTeam.name}
          </h2>
          <div className="w-20" />
        </div>

        {/* Captain & Vice-Captain Summary + Tactics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Leadership (1 Captain &amp; 1 Vice-Captain)</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl bg-[#090E0C] border border-white/10">
                <div className="text-xs text-amber-400 font-semibold">Captain (C)</div>
                <div className="text-white font-bold mt-0.5 truncate">{captain.name}</div>
                <div className="text-xs text-slate-400">Controls order, bowling &amp; field</div>
              </div>
              <div className="p-3 rounded-xl bg-[#090E0C] border border-white/10">
                <div className="text-xs text-emerald-400 font-semibold">Vice-Captain (VC)</div>
                <div className="text-white font-bold mt-0.5 truncate">{vice.name}</div>
                <div className="text-xs text-slate-400">On-field tactical deputy</div>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
            <div className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Captain Strategy &amp; Default Field</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['Attacking', 'Balanced', 'Defensive', 'Powerplay', 'Death'] as FieldPreset[]).map((fp) => (
                <button
                  key={fp}
                  onClick={() => onUpdateTactics(fp, userTeam.strategy)}
                  className={`min-h-[38px] px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                    userTeam.fieldPreset === fp
                      ? 'bg-emerald-500 text-[#05110B] border-emerald-400 font-bold'
                      : 'bg-[#090E0C] border-white/10 text-slate-300'
                  }`}
                >
                  {fp}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['Aggressive', 'Balanced', 'Anchor'] as TeamStrategy[]).map((st) => (
                <button
                  key={st}
                  onClick={() => onUpdateTactics(userTeam.fieldPreset, st)}
                  className={`min-h-[38px] px-3 rounded-lg border text-xs font-medium cursor-pointer ${
                    userTeam.strategy === st
                      ? 'bg-amber-500 text-[#05110B] border-amber-400 font-bold'
                      : 'bg-[#090E0C] border-white/10 text-slate-300'
                  }`}
                >
                  Strategy: {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0D1411] border border-white/10 w-fit">
          {[
            { id: 'squad', label: '11-Player Batting Order' },
            { id: 'bowling', label: 'Bowling Attack Order' },
            { id: 'opponents', label: 'Sample Opponents' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                tab === t.id ? 'bg-emerald-500 text-[#05110B]' : 'text-slate-300 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'squad' && (
          <div className="rounded-2xl bg-[#0D1411] border border-white/10 divide-y divide-white/8">
            {userTeam.players.map((p, idx) => (
              <div
                key={p.id}
                className="p-3.5 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-[200px]">
                  <span className="font-mono-tabular text-xs text-slate-400 w-5">
                    {idx + 1}.
                  </span>
                  <div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{p.name}</span>
                      <span className="text-xs font-mono-tabular text-slate-400">#{p.jerseyNumber}</span>
                      {p.isCaptain && <span className="text-xs font-bold text-amber-400">(C)</span>}
                      {p.isViceCaptain && <span className="text-xs font-bold text-emerald-400">(VC)</span>}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.role} · {p.battingHand} · {p.bowlingStyle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 tabular-nums text-xs">
                  <span className="text-slate-300 mr-2">
                    BAT {p.battingRating} · BWL {p.bowlingRating}
                  </span>
                  <button
                    onClick={() => onSetCaptainVice(p.id, vice.id === p.id ? captain.id : vice.id)}
                    className={`min-h-[38px] px-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      p.isCaptain
                        ? 'bg-amber-500 text-[#05110B] border-amber-400'
                        : 'bg-[#090E0C] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    Make C
                  </button>
                  <button
                    onClick={() => onSetCaptainVice(captain.id === p.id ? vice.id : captain.id, p.id)}
                    className={`min-h-[38px] px-2.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                      p.isViceCaptain
                        ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                        : 'bg-[#090E0C] border-white/10 text-slate-300 hover:text-white'
                    }`}
                  >
                    Make VC
                  </button>
                  <button
                    onClick={() => moveBatter(idx, -1)}
                    disabled={idx === 0}
                    className="min-h-[38px] min-w-[38px] rounded-lg bg-[#090E0C] border border-white/10 text-slate-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                    aria-label="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => moveBatter(idx, 1)}
                    disabled={idx === userTeam.players.length - 1}
                    className="min-h-[38px] min-w-[38px] rounded-lg bg-[#090E0C] border border-white/10 text-slate-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                    aria-label="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bowling' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
              <div className="text-sm font-semibold text-white">Active Over Rotation</div>
              {userTeam.bowlingOrderIds.map((bid, idx) => {
                const bowler = userTeam.players.find((p) => p.id === bid);
                if (!bowler) return null;
                return (
                  <div
                    key={bid}
                    className="p-3 rounded-xl bg-[#090E0C] border border-white/10 flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <span className="font-mono-tabular text-emerald-400 mr-2">#{idx + 1}</span>
                      <span className="font-semibold text-white">{bowler.name}</span>
                      <span className="text-xs text-slate-400 ml-2">{bowler.bowlingStyle}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => moveBowlerOrder(idx, -1)}
                        disabled={idx === 0}
                        className="min-h-[36px] min-w-[36px] rounded-lg bg-[#121C17] text-slate-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => moveBowlerOrder(idx, 1)}
                        disabled={idx === userTeam.bowlingOrderIds.length - 1}
                        className="min-h-[36px] min-w-[36px] rounded-lg bg-[#121C17] text-slate-300 disabled:opacity-30 flex items-center justify-center cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-2xl bg-[#0D1411] border border-white/10 space-y-2.5">
              <div className="text-sm font-semibold text-white">Toggle Squad Bowlers</div>
              {userTeam.players.map((p) => {
                const active = userTeam.bowlingOrderIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleBowlerInRotation(p.id)}
                    className={`w-full min-h-[44px] px-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer ${
                      active
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-[#090E0C] border-white/10 text-slate-400'
                    }`}
                  >
                    <span>
                      {p.name} · {p.bowlingStyle}
                    </span>
                    <span className="font-mono-tabular">BWL {p.bowlingRating}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'opponents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SAMPLE_OPPONENT_TEAMS.map((team) => (
              <div key={team.id} className="p-4 rounded-2xl bg-[#0D1411] border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-4 h-4 rounded-sm"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <span className="font-display text-xl font-bold text-white">{team.name}</span>
                  </div>
                  <span className="text-xs font-mono-tabular text-slate-400">{team.shortName}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Preset: {team.fieldPreset} · Strategy: {team.strategy}
                </div>
                <div className="pt-1 text-xs text-slate-300 space-y-0.5">
                  {team.players.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex justify-between">
                      <span>
                        {p.name} {p.isCaptain ? '(C)' : p.isViceCaptain ? '(VC)' : ''}
                      </span>
                      <span className="text-slate-400">{p.role}</span>
                    </div>
                  ))}
                  <div className="text-slate-500 pt-1">+ 6 more squad players</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
