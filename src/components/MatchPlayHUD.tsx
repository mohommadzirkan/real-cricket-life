import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Mic,
  MicOff,
  Pause,
  Radio,
  RotateCcw,
  Shield,
  Sliders,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { SAMPLE_OPPONENT_TEAMS } from '../data/sampleData';
import { audioEngine } from '../engine/audio';
import {
  CricketStadiumEngine,
  DeliveryCommand,
  DeliveryOutcome,
  LiveBallTelemetry,
} from '../engine/CricketStadiumEngine';
import {
  BatterLiveScore,
  BowlerLiveScore,
  CameraMode,
  DeliveryType,
  FieldPreset,
  GameSettings,
  LiveBallEvent,
  MatchConfig,
  PlayerProfile,
  ShotDirection,
  ShotType,
  SquadPlayer,
  Team,
  TeamStrategy,
} from '../types/game';

interface MatchPlayHUDProps {
  engineRef: React.RefObject<CricketStadiumEngine | null>;
  config: MatchConfig;
  userBatsFirst: boolean;
  userTeam: Team;
  profile: PlayerProfile;
  settings: GameSettings;
  onUpdateSettings: (updater: (prev: GameSettings) => GameSettings) => void;
  onUpdateFieldPreset: (preset: FieldPreset, strategy: TeamStrategy) => void;
  onRecordMatch: (payload: {
    opponent: string;
    format: MatchConfig['format'];
    won: boolean;
    resultText: string;
    userRuns: number;
    userBalls: number;
    userFours: number;
    userSixes: number;
    userOut: boolean;
    userWickets: number;
    userOversBowled: number;
    userRunsConceded: number;
    catches: number;
    runOuts: number;
    pointsEarned: number;
    careerSeriesId?: string;
  }) => void;
  onExitToMenu: () => void;
}

const DELIVERY_TYPES: DeliveryType[] = [
  'Fast',
  'Inswing',
  'Outswing',
  'Yorker',
  'Bouncer',
  'Off-Spin',
  'Leg-Spin',
];

const VOICE_CALLOUTS = [
  'Hold the crease, rotate strike',
  'Bring mid-on inside the ring',
  'Target wide yorker channel',
  'Push hard for the second run',
];

export const MatchPlayHUD: React.FC<MatchPlayHUDProps> = ({
  engineRef,
  config,
  userBatsFirst,
  userTeam,
  profile,
  settings,
  onUpdateSettings,
  onUpdateFieldPreset,
  onRecordMatch,
  onExitToMenu,
}) => {
  const opponentTeam = useMemo(
    () => SAMPLE_OPPONENT_TEAMS.find((t) => t.id === config.opponentTeamId) || SAMPLE_OPPONENT_TEAMS[0],
    [config.opponentTeamId]
  );

  // Innings & Match State
  const [innings, setInnings] = useState<1 | 2>(1);
  const [userIsBatting, setUserIsBatting] = useState<boolean>(
    config.isPractice ? config.practiceRole !== 'Bowling' : userBatsFirst
  );
  const [runs, setRuns] = useState(0);
  const [wickets, setWickets] = useState(0);
  const [legalBalls, setLegalBalls] = useState(0);
  const [firstInningsScore, setFirstInningsScore] = useState<number | null>(null);
  const [firstInningsWickets, setFirstInningsWickets] = useState<number>(0);

  // Active striker, non-striker, bowler indices
  const battingSquad = userIsBatting ? userTeam.players : opponentTeam.players;
  const bowlingSquad = userIsBatting ? opponentTeam.players : userTeam.players;
  const [strikerIdx, setStrikerIdx] = useState(0);
  const [nonStrikerIdx, setNonStrikerIdx] = useState(1);
  const [nextBatterIdx, setNextBatterIdx] = useState(2);
  const [activeBowlerId, setActiveBowlerId] = useState<string>(
    (userIsBatting ? opponentTeam.bowlingOrderIds[0] : userTeam.bowlingOrderIds[0]) || bowlingSquad[10].id
  );

  // Scorecard maps
  const [batterStats, setBatterStats] = useState<Record<string, BatterLiveScore>>({});
  const [bowlerStats, setBowlerStats] = useState<Record<string, BowlerLiveScore>>({});
  const [recentEvents, setRecentEvents] = useState<LiveBallEvent[]>([]);

  // User stats accrued specifically in this match for Career/Profile update
  const userMatchStatsRef = useRef({
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    out: false,
    wickets: 0,
    ballsBowled: 0,
    runsConceded: 0,
    catches: 0,
    runOuts: 0,
  });

  // UI & Delivery flow
  const [telemetry, setTelemetry] = useState<LiveBallTelemetry>({
    phase: 'idle',
    ballDistanceToCrease: 18,
    runsAvailableByRunning: 0,
    battersCurrentlyRunning: false,
    canRunMore: false,
    ballSpeedKmh: 0,
  });
  const [shotDir, setShotDir] = useState<ShotDirection>('Straight');
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryType>('Fast');
  const [bowlTarget, setBowlTarget] = useState<{ x: number; z: number }>({ x: 0.08, z: 4.6 });
  const [lastBanner, setLastBanner] = useState<{ title: string; subtitle: string } | null>(null);

  // Drawers & Modals
  const [modal, setModal] = useState<'none' | 'pause' | 'inningsBreak' | 'matchOver'>('none');
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'tactics' | 'voice' | 'camera'>('none');
  const [micActive, setMicActive] = useState(false);
  const [voiceLog, setVoiceLog] = useState<Array<{ sender: string; text: string }>>([
    { sender: 'Vice-Captain', text: 'Pitch looks true. Keep the seam upright early on.' },
  ]);
  const [matchResultSummary, setMatchResultSummary] = useState<{
    won: boolean;
    headline: string;
    pointsEarned: number;
  } | null>(null);

  const totalBallsLimit = config.overs * 6;
  const targetScore = firstInningsScore !== null ? firstInningsScore + 1 : null;

  const currentStriker: SquadPlayer = battingSquad[strikerIdx] || battingSquad[0];
  const currentNonStriker: SquadPlayer = battingSquad[nonStrikerIdx] || battingSquad[1];
  const currentBowler: SquadPlayer =
    bowlingSquad.find((p) => p.id === activeBowlerId) || bowlingSquad[bowlingSquad.length - 1];

  const formatOvers = (balls: number) => `${Math.floor(balls / 6)}.${balls % 6}`;

  const endMatch = useCallback(
    (won: boolean, headline: string) => {
      const u = userMatchStatsRef.current;
      const pts =
        (won ? 250 : 90) +
        u.runs * 3 +
        u.fours * 8 +
        u.sixes * 15 +
        u.wickets * 40 +
        (config.isPractice ? 40 : 0);

      if (!config.isPractice) {
        onRecordMatch({
          opponent: opponentTeam.name,
          format: config.format,
          won,
          resultText: headline,
          userRuns: u.runs,
          userBalls: u.balls,
          userFours: u.fours,
          userSixes: u.sixes,
          userOut: u.out,
          userWickets: u.wickets,
          userOversBowled: Number((Math.floor(u.ballsBowled / 6) + (u.ballsBowled % 6) / 10).toFixed(1)),
          userRunsConceded: u.runsConceded,
          catches: u.catches,
          runOuts: u.runOuts,
          pointsEarned: pts,
          careerSeriesId: config.careerSeriesId,
        });
      }
      setMatchResultSummary({ won, headline, pointsEarned: pts });
      setModal('matchOver');
    },
    [config, opponentTeam.name, onRecordMatch]
  );

  // Handle delivery outcome from 3D physics engine
  const handleDeliveryOutcome = useCallback(
    (out: DeliveryOutcome) => {
      const bannerTitle = out.isWicket
        ? `WICKET! ${out.wicketType || 'OUT'}`
        : out.isSix
        ? 'MAXIMUM! 6 RUNS'
        : out.isFour
        ? 'BOUNDARY! 4 RUNS'
        : out.isWide
        ? 'WIDE BALL (+1)'
        : `${out.runs} ${out.runs === 1 ? 'RUN' : 'RUNS'}`;

      setLastBanner({
        title: bannerTitle,
        subtitle: `${out.timingLabel} · ${out.speedKmh} km/h — ${out.commentary}`,
      });

      const isLegal = !out.isWide && !out.isNoBall;
      const nextRuns = runs + out.runs;
      const nextWickets = wickets + (out.isWicket ? 1 : 0);
      const nextBalls = legalBalls + (isLegal ? 1 : 0);

      // Update user stats if user's player is striker or bowler
      const u = userMatchStatsRef.current;
      if (userIsBatting && currentStriker.isUser) {
        if (isLegal) u.balls += 1;
        if (!out.isWide) u.runs += out.runs;
        if (out.isFour) u.fours += 1;
        if (out.isSix) u.sixes += 1;
        if (out.isWicket) u.out = true;
      } else if (!userIsBatting) {
        if (isLegal) u.ballsBowled += 1;
        u.runsConceded += out.runs;
        if (out.isWicket) {
          u.wickets += 1;
          if (out.wicketType === 'Caught') u.catches += 1;
          if (out.wicketType === 'Run Out') u.runOuts += 1;
        }
      }

      // Update live batter & bowler scorecards
      setBatterStats((prev) => {
        const curr = prev[currentStriker.id] || {
          playerId: currentStriker.id,
          name: currentStriker.name,
          runs: 0,
          balls: 0,
          fours: 0,
          sixes: 0,
        };
        return {
          ...prev,
          [currentStriker.id]: {
            ...curr,
            runs: curr.runs + (out.isWide ? 0 : out.runs),
            balls: curr.balls + (isLegal ? 1 : 0),
            fours: curr.fours + (out.isFour ? 1 : 0),
            sixes: curr.sixes + (out.isSix ? 1 : 0),
            outText: out.isWicket ? out.wicketType || 'Out' : curr.outText,
          },
        };
      });

      setBowlerStats((prev) => {
        const curr = prev[currentBowler.id] || {
          playerId: currentBowler.id,
          name: currentBowler.name,
          ballsBowled: 0,
          runsConceded: 0,
          wickets: 0,
        };
        return {
          ...prev,
          [currentBowler.id]: {
            ...curr,
            ballsBowled: curr.ballsBowled + (isLegal ? 1 : 0),
            runsConceded: curr.runsConceded + out.runs,
            wickets: curr.wickets + (out.isWicket ? 1 : 0),
          },
        };
      });

      setRecentEvents((prev) => [
        {
          overBall: formatOvers(legalBalls),
          runs: out.runs,
          isFour: out.isFour,
          isSix: out.isSix,
          isWicket: out.isWicket,
          wicketType: out.wicketType,
          isWide: out.isWide,
          isNoBall: out.isNoBall,
          timingLabel: out.timingLabel,
          shotName: out.shotName,
          speedKmh: out.speedKmh,
          commentary: out.commentary,
        },
        ...prev.slice(0, 17),
      ]);

      setRuns(nextRuns);
      setWickets(nextWickets);
      setLegalBalls(nextBalls);

      // Strike rotation & wickets
      if (out.isWicket && !config.isPractice) {
        if (nextBatterIdx < battingSquad.length) {
          setStrikerIdx(nextBatterIdx);
          setNextBatterIdx((i) => i + 1);
        }
      } else {
        const oddRuns = out.runs % 2 === 1;
        const endOfOver = isLegal && nextBalls % 6 === 0;
        if (oddRuns !== endOfOver) {
          setStrikerIdx(nonStrikerIdx);
          setNonStrikerIdx(strikerIdx);
        }
      }

      // Rotate bowler at over end
      if (isLegal && nextBalls % 6 === 0) {
        const order = userIsBatting ? opponentTeam.bowlingOrderIds : userTeam.bowlingOrderIds;
        const currIdx = order.indexOf(activeBowlerId);
        const nextId = order[(currIdx + 1) % order.length];
        if (nextId) setActiveBowlerId(nextId);
      }

      // Check Innings / Match Completion (skip in Practice Nets)
      if (!config.isPractice) {
        const allOut = nextWickets >= 10;
        const oversDone = nextBalls >= totalBallsLimit;

        if (innings === 1 && (allOut || oversDone)) {
          setFirstInningsScore(nextRuns);
          setFirstInningsWickets(nextWickets);
          setModal('inningsBreak');
          return;
        }

        if (innings === 2 && targetScore !== null) {
          if (nextRuns >= targetScore) {
            const battingWon = userIsBatting;
            const wktsLeft = 10 - nextWickets;
            endMatch(
              battingWon,
              `${userIsBatting ? userTeam.name : opponentTeam.name} won by ${wktsLeft} wicket${wktsLeft !== 1 ? 's' : ''}`
            );
            return;
          }
          if (allOut || oversDone) {
            if (nextRuns === targetScore - 1) {
              endMatch(true, 'Match Tied! Super performance under pressure');
            } else {
              const bowlingWon = !userIsBatting;
              const margin = targetScore - 1 - nextRuns;
              endMatch(
                bowlingWon,
                `${!userIsBatting ? userTeam.name : opponentTeam.name} won by ${margin} run${margin !== 1 ? 's' : ''}`
              );
            }
            return;
          }
        }
      }
    },
    [
      runs,
      wickets,
      legalBalls,
      userIsBatting,
      currentStriker,
      currentBowler,
      config.isPractice,
      nextBatterIdx,
      battingSquad.length,
      nonStrikerIdx,
      strikerIdx,
      opponentTeam.bowlingOrderIds,
      opponentTeam.name,
      userTeam.bowlingOrderIds,
      userTeam.name,
      activeBowlerId,
      innings,
      totalBallsLimit,
      targetScore,
      endMatch,
    ]
  );

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setCallbacks(handleDeliveryOutcome, setTelemetry);
  }, [engineRef, handleDeliveryOutcome]);

  // Launch next ball (AI bowls if user batting, or user bowls with selected target)
  const triggerNextBall = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || modal !== 'none') return;
    audioEngine.unlock();
    setLastBanner(null);

    if (userIsBatting) {
      // AI picks realistic delivery based on bowler style & difficulty
      const bowlerStyle = currentBowler.bowlingStyle;
      const isSpinner = bowlerStyle.includes('Spin');
      const choices: DeliveryType[] = isSpinner
        ? ['Off-Spin', 'Leg-Spin', 'Yorker']
        : ['Fast', 'Inswing', 'Outswing', 'Yorker', 'Bouncer'];
      const dType = choices[Math.floor(Math.random() * choices.length)];

      let targetZ = 4.2 + Math.random() * 2.2; // Good length
      if (dType === 'Yorker') targetZ = 8.15;
      else if (dType === 'Bouncer') targetZ = -0.8;

      const targetX = (Math.random() - 0.5) * 0.65;
      const speedKmh = isSpinner
        ? Math.round(82 + Math.random() * 14)
        : dType === 'Bouncer'
        ? Math.round(138 + Math.random() * 12)
        : Math.round(130 + Math.random() * 18);

      const swingFactor =
        dType === 'Inswing' ? -0.85 : dType === 'Outswing' ? 0.85 : (Math.random() - 0.5) * 0.25;
      const spinTurn =
        dType === 'Off-Spin' ? -0.9 : dType === 'Leg-Spin' ? 0.9 : (Math.random() - 0.5) * 0.2;

      const cmd: DeliveryCommand = {
        deliveryType: dType,
        targetX,
        targetZ,
        speedKmh,
        swingFactor,
        spinTurn,
        isUserBowling: false,
        aiDifficulty: config.difficulty,
      };
      engine.startDelivery(cmd);
    } else {
      // User is bowling!
      const isSpinner = selectedDelivery.includes('Spin');
      const speedKmh = isSpinner
        ? Math.round(84 + Math.random() * 10)
        : selectedDelivery === 'Yorker'
        ? 143
        : selectedDelivery === 'Bouncer'
        ? 146
        : 138;
      const swingFactor =
        selectedDelivery === 'Inswing' ? -0.95 : selectedDelivery === 'Outswing' ? 0.95 : 0;
      const spinTurn =
        selectedDelivery === 'Off-Spin' ? -1.0 : selectedDelivery === 'Leg-Spin' ? 1.0 : 0.1;

      engine.startDelivery({
        deliveryType: selectedDelivery,
        targetX: bowlTarget.x,
        targetZ: bowlTarget.z,
        speedKmh,
        swingFactor,
        spinTurn,
        isUserBowling: true,
        aiDifficulty: config.difficulty,
      });
    }
  }, [engineRef, modal, userIsBatting, currentBowler, config.difficulty, selectedDelivery, bowlTarget]);

  const handleBatShot = useCallback(
    (shotType: ShotType) => {
      const engine = engineRef.current;
      if (!engine) return;
      audioEngine.unlock();
      engine.triggerBatSwing({ shotType, direction: shotDir });
    },
    [engineRef, shotDir]
  );

  // Keyboard shortcuts for desktop play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modal !== 'none') return;
      if (e.key === 'Escape') {
        setModal((m) => (m === 'pause' ? 'none' : 'pause'));
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (telemetry.phase === 'idle' || telemetry.phase === 'dead') {
          triggerNextBall();
        } else if (userIsBatting && telemetry.canRunMore) {
          engineRef.current?.triggerRunBetweenWickets();
        }
      }
      if (userIsBatting) {
        if (e.key === '1' || e.key.toLowerCase() === 's') handleBatShot('Defend');
        if (e.key === '2' || e.key.toLowerCase() === 'w') handleBatShot('Drive');
        if (e.key === '3' || e.key.toLowerCase() === 'a') handleBatShot('Pull');
        if (e.key === '4' || e.key.toLowerCase() === 'd') handleBatShot('Lofted');
        if (e.key === 'ArrowLeft') setShotDir('Leg');
        if (e.key === 'ArrowUp') setShotDir('Straight');
        if (e.key === 'ArrowRight') setShotDir('Off');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modal, telemetry.phase, telemetry.canRunMore, userIsBatting, triggerNextBall, handleBatShot, engineRef]);

  const startSecondInnings = () => {
    setInnings(2);
    const nextUserBat = !userIsBatting;
    setUserIsBatting(nextUserBat);
    setRuns(0);
    setWickets(0);
    setLegalBalls(0);
    setStrikerIdx(0);
    setNonStrikerIdx(1);
    setNextBatterIdx(2);
    setRecentEvents([]);
    setLastBanner(null);
    const nextBowlOrder = nextUserBat ? opponentTeam.bowlingOrderIds : userTeam.bowlingOrderIds;
    setActiveBowlerId(nextBowlOrder[0] || bowlingSquad[10].id);
    setModal('none');
    engineRef.current?.resetPositionsForNextBall();
  };

  // Handle interactive pitch target pad click/tap when bowling
  const handlePitchPadClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width; // 0..1
    const ny = (e.clientY - rect.top) / rect.height; // 0..1 (top=short/bouncer, bottom=yorker)
    const x = (nx - 0.5) * 1.4; // -0.7..+0.7
    const z = -1.2 + ny * 9.8; // -1.2 (bouncer) .. +8.6 (yorker)
    setBowlTarget({ x: Number(x.toFixed(2)), z: Number(z.toFixed(2)) });
  };

  const timingPct = Math.max(0, Math.min(100, ((18.5 - telemetry.ballDistanceToCrease) / 18.5) * 100));
  const isSweetSpot = telemetry.ballDistanceToCrease >= 0.4 && telemetry.ballDistanceToCrease <= 3.1;

  const battingTeamShort = userIsBatting ? userTeam.shortName : opponentTeam.shortName;
  const runRate = legalBalls > 0 ? ((runs / legalBalls) * 6).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3 sm:p-4">
      {/* TOP BAR: Broadcast Scorebug (Left) + Utility Icons (Right) */}
      <div className="flex items-start justify-between gap-2">
        {/* Minimal Broadcast Scorebug */}
        <div className="pointer-events-auto rounded-xl bg-[#070C0A]/92 border border-white/15 px-3.5 py-2.5 shadow-lg max-w-[330px] sm:max-w-[420px]">
          <div className="flex items-baseline gap-3">
            <span className="font-display text-xl font-extrabold tracking-wide text-emerald-400">
              {battingTeamShort}
            </span>
            <span className="font-mono-tabular text-2xl font-bold text-white">
              {runs}/{wickets}
            </span>
            <span className="font-mono-tabular text-xs text-slate-300">
              ({formatOvers(legalBalls)}/{config.isPractice ? '∞' : config.overs})
            </span>
            <span className="text-xs text-slate-400 tabular-nums ml-auto">
              CRR {runRate}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-300 tabular-nums">
            <span>
              {currentStriker.name.split(' ')[0]}* {batterStats[currentStriker.id]?.runs ?? 0}({batterStats[currentStriker.id]?.balls ?? 0})
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-400">
              {currentBowler.name.split(' ')[0]} {bowlerStats[currentBowler.id]?.wickets ?? 0}-{bowlerStats[currentBowler.id]?.runsConceded ?? 0}
            </span>
            {targetScore !== null && !config.isPractice && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-medium">
                  Need {Math.max(0, targetScore - runs)} off {Math.max(0, totalBallsLimit - legalBalls)}b
                </span>
              </>
            )}
          </div>

          {/* Ball-by-ball mini strip */}
          {recentEvents.length > 0 && (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono-tabular">
              {recentEvents.slice(0, 6).map((ev, i) => (
                <span
                  key={i}
                  className={
                    ev.isWicket
                      ? 'text-rose-400 font-bold'
                      : ev.isSix || ev.isFour
                      ? 'text-emerald-400 font-bold'
                      : 'text-slate-300'
                  }
                >
                  {ev.isWicket ? 'W' : ev.isWide ? 'Wd' : ev.runs}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Top-Right Compact Utility Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
          {config.isPractice && (
            <button
              onClick={() => {
                setUserIsBatting((b) => !b);
                engineRef.current?.resetPositionsForNextBall();
              }}
              className="min-h-[44px] px-3 rounded-xl bg-amber-500 text-[#07110C] font-bold text-xs cursor-pointer"
            >
              Switch to {userIsBatting ? 'Bowling' : 'Batting'}
            </button>
          )}
          <button
            onClick={() => setActiveDrawer((d) => (d === 'camera' ? 'none' : 'camera'))}
            className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
              activeDrawer === 'camera'
                ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                : 'bg-[#070C0A]/92 border-white/15 text-slate-200'
            }`}
            title="Camera & VR View"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden md:inline">
              {settings.cameraMode === 'FirstPersonVR' ? '1st-Person VR' : settings.cameraMode}
            </span>
          </button>
          <button
            onClick={() => setActiveDrawer((d) => (d === 'tactics' ? 'none' : 'tactics'))}
            className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
              activeDrawer === 'tactics'
                ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                : 'bg-[#070C0A]/92 border-white/15 text-slate-200'
            }`}
            title="Captain Tactics & Field"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden md:inline">Captain</span>
          </button>
          <button
            onClick={() => setActiveDrawer((d) => (d === 'voice' ? 'none' : 'voice'))}
            className={`min-h-[44px] min-w-[44px] px-2.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
              activeDrawer === 'voice'
                ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                : 'bg-[#070C0A]/92 border-white/15 text-slate-200'
            }`}
            title="Squad Voice Comms"
          >
            <Radio className="w-4 h-4" />
          </button>
          <button
            onClick={() => onUpdateSettings((s) => ({ ...s, muted: !s.muted }))}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#070C0A]/92 border border-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
            aria-label="Toggle Mute"
          >
            {settings.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => setModal('pause')}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-[#070C0A]/92 border border-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
            aria-label="Pause Menu"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER FEEDBACK BANNER (Brief Delivery Result) */}
      {lastBanner && (telemetry.phase === 'dead' || telemetry.phase === 'idle') && (
        <div className="mx-auto max-w-md px-5 py-3 rounded-xl bg-[#070C0A]/92 border border-emerald-400/40 text-center shadow-xl">
          <div className="font-display text-2xl font-extrabold tracking-wide text-emerald-400">
            {lastBanner.title}
          </div>
          <div className="text-xs text-slate-300 mt-0.5">{lastBanner.subtitle}</div>
        </div>
      )}

      {/* ACTIVE DRAWERS (Camera / Captain Tactics / Squad Voice) */}
      {activeDrawer !== 'none' && (
        <div className="pointer-events-auto mx-auto w-full max-w-md rounded-2xl bg-[#0A110E]/95 border border-white/15 p-4 shadow-2xl space-y-3">
          {activeDrawer === 'camera' && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-white">Camera &amp; VR-Ready Viewpoint</div>
                <button
                  onClick={() => setActiveDrawer('none')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'Broadcast', label: 'Broadcast TV' },
                    { id: 'FirstPersonVR', label: '1st-Person VR Cam' },
                    { id: 'BowlerCam', label: 'Bowler Run-Up' },
                    { id: 'Drone', label: 'Stadium Drone' },
                  ] as Array<{ id: CameraMode; label: string }>
                ).map((cam) => (
                  <button
                    key={cam.id}
                    onClick={() => onUpdateSettings((s) => ({ ...s, cameraMode: cam.id }))}
                    className={`min-h-[44px] px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                      settings.cameraMode === cam.id
                        ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                        : 'bg-[#0E1713] border-white/10 text-slate-200'
                    }`}
                  >
                    {cam.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                1st-Person VR Cam places you inside the helmet with drag-to-look head rotation. Full 6DoF WebXR headset/controller input is not active in standard Android browsers.
              </p>
            </>
          )}

          {activeDrawer === 'tactics' && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Captain Tactics &amp; Field</span>
                </div>
                <button
                  onClick={() => setActiveDrawer('none')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-1.5">Field Placement (updates 3D fielders live)</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Attacking', 'Balanced', 'Defensive', 'Powerplay', 'Death'] as FieldPreset[]).map((fp) => (
                    <button
                      key={fp}
                      onClick={() => onUpdateFieldPreset(fp, userTeam.strategy)}
                      className={`min-h-[40px] px-2 rounded-lg border text-xs font-medium cursor-pointer ${
                        userTeam.fieldPreset === fp
                          ? 'bg-emerald-500 text-[#05110B] border-emerald-400'
                          : 'bg-[#0E1713] border-white/10 text-slate-200'
                      }`}
                    >
                      {fp}
                    </button>
                  ))}
                </div>
              </div>
              {!userIsBatting && (
                <div>
                  <div className="text-xs text-slate-400 mb-1.5">Bowling Change</div>
                  <div className="flex flex-wrap gap-1.5">
                    {userTeam.players
                      .filter((p) => p.role === 'Bowler' || p.role === 'All-Rounder')
                      .map((b) => (
                        <button
                          key={b.id}
                          onClick={() => setActiveBowlerId(b.id)}
                          className={`min-h-[38px] px-2.5 rounded-lg border text-xs cursor-pointer ${
                            activeBowlerId === b.id
                              ? 'bg-amber-500 text-[#05110B] border-amber-400 font-bold'
                              : 'bg-[#0E1713] border-white/10 text-slate-200'
                          }`}
                        >
                          {b.name.split(' ')[0]} ({b.bowlingStyle.replace('Right-Arm ', '').replace('Left-Arm ', 'L-')})
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}

          {activeDrawer === 'voice' && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Live Squad Voice Comms</span>
                </div>
                <button
                  onClick={() => setActiveDrawer('none')}
                  className="text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-[#0E1713] border border-white/10">
                <div className="text-xs text-slate-300">
                  Squad Channel · {userTeam.shortName} On-Field
                </div>
                <button
                  onClick={() => setMicActive((m) => !m)}
                  className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                    micActive ? 'bg-emerald-500 text-[#05110B]' : 'bg-[#17231E] text-slate-200'
                  }`}
                >
                  {micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
                  <span>{micActive ? 'Mic Live (Local)' : 'Push to Talk'}</span>
                </button>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto text-xs">
                {voiceLog.map((msg, i) => (
                  <div key={i} className="text-slate-300">
                    <span className="text-emerald-400 font-semibold">{msg.sender}:</span> {msg.text}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {VOICE_CALLOUTS.map((call) => (
                  <button
                    key={call}
                    onClick={() =>
                      setVoiceLog((prev) => [{ sender: profile.name, text: call }, ...prev].slice(0, 6))
                    }
                    className="min-h-[38px] px-2.5 rounded-lg bg-[#121D18] hover:bg-[#192822] text-[11px] text-slate-200 text-left truncate cursor-pointer"
                  >
                    {call}
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-amber-300/90 leading-snug">
                Prototype Notice: Multi-user live audio transmission requires a WebRTC/SFU signaling backend server. This interface simulates squad tactical callouts locally.
              </div>
            </>
          )}
        </div>
      )}

      {/* BOTTOM THUMB-ZONE GAMEPLAY CONTROLS */}
      <div className="pointer-events-auto w-full max-w-3xl mx-auto">
        {userIsBatting ? (
          /* BATTING CONTROLS */
          <div className="rounded-2xl bg-[#070C0A]/92 border border-white/15 p-3 space-y-2.5 shadow-xl">
            {/* Timing Meter during delivery flight */}
            {settings.timingIndicator && telemetry.phase === 'in_flight' && (
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-slate-300 tabular-nums">
                  <span>Timing Window</span>
                  <span className={isSweetSpot ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                    {isSweetSpot ? 'SWING NOW!' : `${telemetry.ballDistanceToCrease.toFixed(1)}m`}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-[#131F1A] overflow-hidden relative">
                  <div className="absolute left-[76%] width-[18%] w-[18%] inset-y-0 bg-emerald-500/40 border-x border-emerald-400" />
                  <div
                    className="h-full bg-amber-400 transition-none"
                    style={{ width: `${timingPct}%` }}
                  />
                </div>
              </div>
            )}

            {telemetry.phase === 'idle' || telemetry.phase === 'dead' ? (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-300">
                  Ready at crease · Select direction &amp; tap Next Ball
                </div>
                <button
                  onClick={triggerNextBall}
                  className="min-h-[48px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#05110B] font-bold text-sm cursor-pointer shrink-0"
                >
                  Bowl Next Ball (Space)
                </button>
              </div>
            ) : telemetry.phase === 'after_hit' ? (
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-slate-300 tabular-nums">
                  {telemetry.battersCurrentlyRunning
                    ? 'Sprinting between wickets...'
                    : `Runs completed: ${telemetry.runsAvailableByRunning}`}
                </div>
                <button
                  onClick={() => engineRef.current?.triggerRunBetweenWickets()}
                  disabled={!telemetry.canRunMore}
                  className={`min-h-[50px] px-7 rounded-xl font-bold text-sm cursor-pointer ${
                    telemetry.canRunMore
                      ? 'bg-amber-500 hover:bg-amber-400 text-[#05110B]'
                      : 'bg-[#141F1A] text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {telemetry.battersCurrentlyRunning ? 'Running...' : 'RUN (+1)'}
                </button>
              </div>
            ) : (
              /* Active Shot Controls */
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {(['Leg', 'Straight', 'Off'] as ShotDirection[]).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => setShotDir(dir)}
                      className={`min-h-[40px] rounded-lg text-xs font-semibold border cursor-pointer ${
                        shotDir === dir
                          ? 'bg-emerald-500/25 border-emerald-400 text-white'
                          : 'bg-[#0D1512] border-white/10 text-slate-400'
                      }`}
                    >
                      Aim: {dir}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { id: 'Defend', hint: '1 / S' },
                      { id: 'Drive', hint: '2 / W' },
                      { id: 'Pull', hint: '3 / A' },
                      { id: 'Lofted', hint: '4 / D' },
                    ] as Array<{ id: ShotType; hint: string }>
                  ).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleBatShot(s.id)}
                      className="min-h-[52px] px-2 rounded-xl bg-[#111D18] hover:bg-emerald-500 hover:text-[#05110B] active:scale-[0.97] border border-white/15 text-white font-bold text-sm transition-all flex flex-col items-center justify-center cursor-pointer"
                    >
                      <span>{s.id}</span>
                      <span className="text-[10px] opacity-65 font-normal">{s.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* BOWLING CONTROLS */
          <div className="rounded-2xl bg-[#070C0A]/92 border border-white/15 p-3 space-y-2.5 shadow-xl">
            {telemetry.phase === 'idle' || telemetry.phase === 'dead' ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                {/* Interactive Pitch Line & Length Pad */}
                <div className="sm:col-span-4 flex items-center gap-3">
                  <div
                    onClick={handlePitchPadClick}
                    className="w-24 h-28 rounded-lg bg-[#B89E74] border border-white/30 relative cursor-crosshair shrink-0 overflow-hidden"
                    title="Tap to set Line & Length"
                  >
                    {/* Stumps line */}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-white" />
                    <div className="absolute bottom-5 inset-x-1 h-px bg-white/60" />
                    {/* Marker */}
                    <div
                      className="w-3.5 h-3.5 rounded-full bg-rose-500 border-2 border-white absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                      style={{
                        left: `${((bowlTarget.x / 1.4) + 0.5) * 100}%`,
                        top: `${((bowlTarget.z + 1.2) / 9.8) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-slate-300 space-y-1">
                    <div className="font-semibold text-white">Line &amp; Length</div>
                    <div className="text-slate-400">
                      {bowlTarget.z > 7.2
                        ? 'Yorker'
                        : bowlTarget.z > 4.8
                        ? 'Full Length'
                        : bowlTarget.z > 1.5
                        ? 'Good Length'
                        : 'Short / Bouncer'}
                    </div>
                    <div className="text-slate-400">
                      {bowlTarget.x > 0.2 ? 'Outside Off' : bowlTarget.x < -0.2 ? 'Leg Side' : 'At Stumps'}
                    </div>
                  </div>
                </div>

                {/* Delivery Type Pills */}
                <div className="sm:col-span-5 flex flex-wrap gap-1.5">
                  {DELIVERY_TYPES.map((dt) => (
                    <button
                      key={dt}
                      onClick={() => setSelectedDelivery(dt)}
                      className={`min-h-[38px] px-2.5 rounded-lg border text-xs font-medium cursor-pointer ${
                        selectedDelivery === dt
                          ? 'bg-emerald-500 text-[#05110B] border-emerald-400 font-bold'
                          : 'bg-[#0E1713] border-white/10 text-slate-200'
                      }`}
                    >
                      {dt}
                    </button>
                  ))}
                </div>

                <div className="sm:col-span-3">
                  <button
                    onClick={triggerNextBall}
                    className="w-full min-h-[52px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#05110B] font-bold text-sm cursor-pointer"
                  >
                    BOWL (Space)
                  </button>
                </div>
              </div>
            ) : telemetry.phase === 'after_hit' ? (
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-slate-300">Fielders chasing — choose throw end:</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => engineRef.current?.triggerManualThrowEnd('striker')}
                    className="min-h-[46px] px-4 rounded-xl bg-amber-500 text-[#05110B] font-bold text-xs cursor-pointer"
                  >
                    Throw Striker End
                  </button>
                  <button
                    onClick={() => engineRef.current?.triggerManualThrowEnd('bowler')}
                    className="min-h-[46px] px-4 rounded-xl bg-[#16221D] border border-white/15 text-white font-bold text-xs cursor-pointer"
                  >
                    Throw Bowler End
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-2 text-xs text-slate-300">
                Delivery in flight · {selectedDelivery} at {telemetry.ballSpeedKmh} km/h...
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALS: Pause / Innings Break / Match Over */}
      {modal !== 'none' && (
        <div className="fixed inset-0 z-30 pointer-events-auto bg-[#050907]/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0D1512] border border-white/15 p-6 space-y-5 shadow-2xl">
            {modal === 'pause' && (
              <>
                <div className="font-display text-3xl font-bold text-white">MATCH PAUSED</div>
                <div className="text-sm text-slate-300 tabular-nums">
                  {battingTeamShort} {runs}/{wickets} ({formatOvers(legalBalls)} ov) · {config.format} · {config.stadiumTime} · {config.weather}
                </div>
                <div className="max-h-48 overflow-y-auto rounded-xl bg-[#090E0C] border border-white/10 p-3 space-y-1.5 text-xs tabular-nums">
                  <div className="font-semibold text-emerald-400">Live Batting Card</div>
                  {Object.values(batterStats).length === 0 ? (
                    <div className="text-slate-500">No balls faced yet.</div>
                  ) : (
                    Object.values(batterStats).map((b) => (
                      <div key={b.playerId} className="flex justify-between text-slate-200">
                        <span>
                          {b.name} {b.outText ? `(${b.outText})` : '*'}
                        </span>
                        <span>
                          {b.runs} ({b.balls}) · 4s:{b.fours} · 6s:{b.sixes}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setModal('none')}
                    className="min-h-[48px] rounded-xl bg-emerald-500 text-[#05110B] font-bold text-sm cursor-pointer"
                  >
                    Resume Match
                  </button>
                  <button
                    onClick={onExitToMenu}
                    className="min-h-[48px] rounded-xl bg-[#16221D] border border-white/15 text-white font-semibold text-sm cursor-pointer"
                  >
                    Exit to Menu
                  </button>
                </div>
              </>
            )}

            {modal === 'inningsBreak' && (
              <>
                <div className="font-display text-3xl font-bold text-amber-400">INNINGS BREAK</div>
                <p className="text-sm text-slate-200 tabular-nums">
                  {userIsBatting ? userTeam.name : opponentTeam.name} posted{' '}
                  <strong className="text-white">
                    {firstInningsScore}/{firstInningsWickets}
                  </strong>{' '}
                  in {config.overs} overs.
                </p>
                <div className="p-4 rounded-xl bg-[#090E0C] border border-white/10 text-sm text-slate-300 tabular-nums">
                  Target for 2nd Innings: <strong className="text-emerald-400">{(firstInningsScore ?? 0) + 1} runs</strong>
                </div>
                <button
                  onClick={startSecondInnings}
                  className="w-full min-h-[52px] rounded-xl bg-emerald-500 text-[#05110B] font-bold text-base cursor-pointer"
                >
                  Start 2nd Innings ({userIsBatting ? 'Now Bowling' : 'Now Batting'})
                </button>
              </>
            )}

            {modal === 'matchOver' && matchResultSummary && (
              <>
                <div
                  className={`font-display text-3xl font-extrabold ${
                    matchResultSummary.won ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {matchResultSummary.won ? 'VICTORY!' : 'MATCH COMPLETE'}
                </div>
                <p className="text-base text-white font-semibold">{matchResultSummary.headline}</p>
                <div className="p-4 rounded-xl bg-[#090E0C] border border-white/10 space-y-2 text-sm tabular-nums">
                  <div className="flex justify-between text-slate-300">
                    <span>Your Runs / Wickets</span>
                    <span className="text-white font-bold">
                      {userMatchStatsRef.current.runs} ({userMatchStatsRef.current.balls}b) · {userMatchStatsRef.current.wickets} wkts
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span>Virtual Points Earned</span>
                    <span>
                      +{matchResultSummary.pointsEarned} pts (₹{(matchResultSummary.pointsEarned / 100).toFixed(2)} Virtual)
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setInnings(1);
                      setRuns(0);
                      setWickets(0);
                      setLegalBalls(0);
                      setFirstInningsScore(null);
                      setBatterStats({});
                      setBowlerStats({});
                      setRecentEvents([]);
                      setModal('none');
                      engineRef.current?.resetPositionsForNextBall();
                    }}
                    className="min-h-[48px] rounded-xl bg-emerald-500 text-[#05110B] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Rematch</span>
                  </button>
                  <button
                    onClick={onExitToMenu}
                    className="min-h-[48px] rounded-xl bg-[#16221D] border border-white/15 text-white font-semibold text-sm cursor-pointer"
                  >
                    Main Menu
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
