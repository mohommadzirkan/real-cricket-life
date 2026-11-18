import React, { useState } from 'react';
import { ArrowLeft, CloudRain, Play, Sun, Sunset, Moon } from 'lucide-react';
import { SAMPLE_OPPONENT_TEAMS } from '../data/sampleData';
import {
  MatchConfig,
  MatchFormat,
  PitchCondition,
  StadiumTime,
  WeatherCondition,
} from '../types/game';

interface QuickMatchSetupProps {
  onBack: () => void;
  onStartMatch: (config: MatchConfig, userBatsFirst: boolean) => void;
}

const FORMAT_OPTIONS: Array<{ format: MatchFormat; defaultOvers: number; oversChoices: number[]; desc: string }> = [
  { format: 'T10', defaultOvers: 5, oversChoices: [2, 5, 10], desc: 'Fast-paced 10-over shootout' },
  { format: 'T20', defaultOvers: 20, oversChoices: [5, 10, 20], desc: 'Standard 20-over franchise battle' },
  { format: 'ODI', defaultOvers: 50, oversChoices: [20, 50], desc: 'One-Day tactical 50-over match' },
  { format: 'Test', defaultOvers: 90, oversChoices: [15, 90], desc: 'Red-ball Test innings & declaration' },
];

export const QuickMatchSetup: React.FC<QuickMatchSetupProps> = ({
  onBack,
  onStartMatch,
}) => {
  const [format, setFormat] = useState<MatchFormat>('T10');
  const [overs, setOvers] = useState<number>(5);
  const [opponentTeamId, setOpponentTeamId] = useState<string>(SAMPLE_OPPONENT_TEAMS[0].id);
  const [stadiumTime, setStadiumTime] = useState<StadiumTime>('Night');
  const [weather, setWeather] = useState<WeatherCondition>('Clear');
  const [pitch, setPitch] = useState<PitchCondition>('Flat');
  const [difficulty, setDifficulty] = useState<'Amateur' | 'Pro' | 'Legend'>('Pro');

  const [tossStep, setTossStep] = useState<'setup' | 'toss'>('setup');
  const [tossResult, setTossResult] = useState<'won' | 'lost' | null>(null);
  const [userChoice, setUserChoice] = useState<boolean>(true);

  const selectedFmt = FORMAT_OPTIONS.find((f) => f.format === format)!;

  const handleFormatChange = (fmt: MatchFormat) => {
    setFormat(fmt);
    const meta = FORMAT_OPTIONS.find((f) => f.format === fmt)!;
    setOvers(meta.defaultOvers);
  };

  const handleCallCoin = (call: 'Heads' | 'Tails') => {
    const coin = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const won = coin === call;
    setTossResult(won ? 'won' : 'lost');
    if (!won) {
      setUserChoice(Math.random() < 0.5);
    }
  };

  const launch = (batsFirst: boolean) => {
    onStartMatch(
      {
        format,
        overs,
        stadiumTime,
        weather,
        pitch,
        opponentTeamId,
        difficulty,
        isPractice: false,
      },
      batsFirst
    );
  };

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-[#070B09]/92 p-4 sm:p-6 lg:p-10">
      <div className="max-w-4xl mx-auto space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onBack}
            className="min-h-[44px] px-4 rounded-xl bg-[#0F1714] border border-white/12 text-slate-200 hover:border-emerald-400/50 flex items-center gap-2 text-sm font-medium cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">
            MATCH SETUP &amp; TOSS
          </h2>
          <div className="w-20" />
        </div>

        {tossStep === 'setup' ? (
          <div className="space-y-6">
            {/* Format & Overs */}
            <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-4">
              <div className="text-sm font-semibold text-white">1. Match Format &amp; Overs</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.format}
                    onClick={() => handleFormatChange(opt.format)}
                    className={`min-h-[68px] p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      format === opt.format
                        ? 'bg-emerald-500/15 border-emerald-400 text-white'
                        : 'bg-[#090E0C] border-white/10 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div className="font-display text-xl font-bold">{opt.format}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{opt.desc}</div>
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-400 mr-2">Overs Length:</span>
                {selectedFmt.oversChoices.map((ov) => (
                  <button
                    key={ov}
                    onClick={() => setOvers(ov)}
                    className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold tabular-nums cursor-pointer ${
                      overs === ov
                        ? 'bg-emerald-500 text-[#05110B]'
                        : 'bg-[#141E1A] text-slate-300 hover:text-white'
                    }`}
                  >
                    {format === 'Test' && ov === 90 ? 'Unlimited (90 ov/day)' : `${ov} Overs`}
                  </button>
                ))}
              </div>
            </div>

            {/* Opponent & Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
                <div className="text-sm font-semibold text-white">2. Opponent XI</div>
                <div className="space-y-2">
                  {SAMPLE_OPPONENT_TEAMS.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => setOpponentTeamId(team.id)}
                      className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-sm transition-all cursor-pointer ${
                        opponentTeamId === team.id
                          ? 'bg-emerald-500/15 border-emerald-400 text-white'
                          : 'bg-[#090E0C] border-white/10 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3.5 h-3.5 rounded-sm shrink-0"
                          style={{ backgroundColor: team.primaryColor }}
                        />
                        <span className="font-semibold">{team.name}</span>
                      </div>
                      <span className="text-xs text-slate-400 font-mono-tabular">{team.shortName}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Stadium, Weather & Pitch */}
              <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-4">
                <div className="text-sm font-semibold text-white">3. Stadium, Pitch &amp; Weather</div>

                <div className="space-y-1.5">
                  <div className="text-xs text-slate-400">Time of Day</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'Day', icon: <Sun className="w-3.5 h-3.5" /> },
                        { id: 'Twilight', icon: <Sunset className="w-3.5 h-3.5" /> },
                        { id: 'Night', icon: <Moon className="w-3.5 h-3.5" /> },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setStadiumTime(t.id)}
                        className={`min-h-[44px] rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer ${
                          stadiumTime === t.id
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : 'bg-[#090E0C] border-white/10 text-slate-300'
                        }`}
                      >
                        {t.icon}
                        <span>{t.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-slate-400">Weather</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['Clear', 'Overcast', 'Light Rain', 'Heavy Rain'] as WeatherCondition[]).map((w) => (
                      <button
                        key={w}
                        onClick={() => setWeather(w)}
                        className={`min-h-[42px] px-2 rounded-xl border text-xs font-medium flex items-center justify-center gap-1 cursor-pointer ${
                          weather === w
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : 'bg-[#090E0C] border-white/10 text-slate-300'
                        }`}
                      >
                        {w.includes('Rain') && <CloudRain className="w-3.5 h-3.5 text-sky-400" />}
                        <span className="truncate">{w}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-slate-400">Pitch Surface</div>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Flat', 'Green', 'Dry', 'Damp'] as PitchCondition[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPitch(p)}
                        className={`min-h-[42px] rounded-xl border text-xs font-medium cursor-pointer ${
                          pitch === p
                            ? 'bg-emerald-500/20 border-emerald-400 text-white'
                            : 'bg-[#090E0C] border-white/10 text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs text-slate-400">AI Difficulty</div>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Amateur', 'Pro', 'Legend'] as const).map((d) => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`min-h-[42px] rounded-xl border text-xs font-medium cursor-pointer ${
                          difficulty === d
                            ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                            : 'bg-[#090E0C] border-white/10 text-slate-300'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => {
                  setTossResult(null);
                  setTossStep('toss');
                }}
                className="min-h-[52px] w-full sm:w-auto px-8 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#05110B] font-bold text-base flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Proceed to Pitch Toss</span>
              </button>
            </div>
          </div>
        ) : (
          /* Toss Screen */
          <div className="max-w-lg mx-auto p-6 rounded-2xl bg-[#0D1411] border border-white/12 text-center space-y-6">
            <div className="font-display text-3xl font-bold text-white">COIN TOSS</div>
            <p className="text-sm text-slate-300">
              {format} ({overs} Overs) · {stadiumTime} · {pitch} Pitch · {weather}
            </p>

            {tossResult === null ? (
              <div className="space-y-4">
                <div className="text-sm text-slate-400">Captain, call the coin in the air:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleCallCoin('Heads')}
                    className="min-h-[52px] rounded-xl bg-amber-500/20 border border-amber-400/60 text-amber-200 font-bold text-base hover:bg-amber-500/30 cursor-pointer"
                  >
                    Heads
                  </button>
                  <button
                    onClick={() => handleCallCoin('Tails')}
                    className="min-h-[52px] rounded-xl bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 font-bold text-base hover:bg-emerald-500/30 cursor-pointer"
                  >
                    Tails
                  </button>
                </div>
              </div>
            ) : tossResult === 'won' ? (
              <div className="space-y-4">
                <div className="text-lg font-bold text-emerald-400">You Won the Toss!</div>
                <div className="text-sm text-slate-300">Elect to Bat or Bowl first:</div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => launch(true)}
                    className="min-h-[52px] rounded-xl bg-emerald-500 text-[#05110B] font-bold text-base cursor-pointer"
                  >
                    Bat First
                  </button>
                  <button
                    onClick={() => launch(false)}
                    className="min-h-[52px] rounded-xl bg-[#16221D] border border-white/15 text-white font-bold text-base cursor-pointer"
                  >
                    Bowl First
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-lg font-bold text-amber-400">Opponent Won the Toss</div>
                <p className="text-sm text-slate-300">
                  They elected to {userChoice ? 'bowl first — your XI will bat first!' : 'bat first — your XI will bowl first!'}
                </p>
                <button
                  onClick={() => launch(userChoice)}
                  className="w-full min-h-[52px] rounded-xl bg-emerald-500 text-[#05110B] font-bold text-base cursor-pointer"
                >
                  Walk Out to the Pitch
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
