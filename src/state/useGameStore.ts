import { useCallback, useEffect, useState } from 'react';
import {
  CAREER_SERIES,
  DEFAULT_USER_TEAM,
  INITIAL_PLAYER_PROFILE,
  SHOP_CATALOG,
} from '../data/sampleData';
import {
  CareerTier,
  FieldPreset,
  GameSettings,
  MatchHistoryEntry,
  PlayerProfile,
  ShopCategory,
  SquadPlayer,
  Team,
  TeamStrategy,
} from '../types/game';

const STORAGE_KEY_PROFILE = 'rcl_profile_v1';
const STORAGE_KEY_TEAM = 'rcl_user_team_v1';
const STORAGE_KEY_SETTINGS = 'rcl_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.8,
  sfxVolume: 0.85,
  crowdVolume: 0.7,
  muted: false,
  commentaryVoice: false,
  cameraMode: 'Broadcast',
  vrHeadlookSensitivity: 1.0,
  graphicsQuality: 'High',
  timingIndicator: true,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export function getTierFromXp(xp: number): CareerTier {
  if (xp >= 2500) return 'International Legend';
  if (xp >= 1500) return 'Franchise Star';
  if (xp >= 900) return 'Domestic Pro';
  if (xp >= 400) return 'State Challenger';
  return 'Club Beginner';
}

export function useGameStore() {
  const [profile, setProfile] = useState<PlayerProfile>(() =>
    loadJson(STORAGE_KEY_PROFILE, INITIAL_PLAYER_PROFILE)
  );
  const [userTeam, setUserTeam] = useState<Team>(() =>
    loadJson(STORAGE_KEY_TEAM, DEFAULT_USER_TEAM)
  );
  const [settings, setSettings] = useState<GameSettings>(() =>
    loadJson(STORAGE_KEY_SETTINGS, DEFAULT_SETTINGS)
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore storage quota errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TEAM, JSON.stringify(userTeam));
    } catch {
      // ignore
    }
  }, [userTeam]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const updateProfile = useCallback((updater: (prev: PlayerProfile) => PlayerProfile) => {
    setProfile((prev) => {
      const next = updater(prev);
      // Sync user player inside userTeam
      setUserTeam((teamPrev) => ({
        ...teamPrev,
        players: teamPrev.players.map((p) =>
          p.isUser
            ? {
                ...p,
                name: next.name,
                jerseyNumber: next.jerseyNumber,
                battingHand: next.battingHand,
                bowlingStyle: next.bowlingStyle,
                role: next.role,
              }
            : p
        ),
      }));
      return next;
    });
  }, []);

  const buyShopItem = useCallback((itemId: string): { ok: boolean; message: string } => {
    const item = SHOP_CATALOG.find((i) => i.id === itemId);
    if (!item) return { ok: false, message: 'Item not found' };

    let result = { ok: false, message: 'Insufficient points' };
    setProfile((prev) => {
      if (prev.ownedItemIds.includes(itemId)) {
        result = { ok: true, message: 'Already owned' };
        return prev;
      }
      if (prev.virtualPoints < item.pricePoints) {
        result = { ok: false, message: `Need ${item.pricePoints - prev.virtualPoints} more pts` };
        return prev;
      }
      result = { ok: true, message: `Purchased ${item.name}` };
      const nextEquipped = { ...prev.equipped, [item.category]: item.id };
      const nextAvatar = { ...prev.avatar };
      if (item.category === 'bat') nextAvatar.batColor = item.previewColor;
      if (item.category === 'helmet') nextAvatar.helmetColor = item.previewColor;
      if (item.category === 'gloves') nextAvatar.gloveColor = item.previewColor;
      if (item.category === 'jersey') {
        nextAvatar.jerseyColor = item.previewColor;
        if (item.accentColor) nextAvatar.jerseyAccent = item.accentColor;
      }
      return {
        ...prev,
        virtualPoints: prev.virtualPoints - item.pricePoints,
        ownedItemIds: [...prev.ownedItemIds, itemId],
        equipped: nextEquipped,
        avatar: nextAvatar,
      };
    });
    return result;
  }, []);

  const equipShopItem = useCallback((itemId: string, category: ShopCategory) => {
    const item = SHOP_CATALOG.find((i) => i.id === itemId);
    if (!item) return;
    setProfile((prev) => {
      if (!prev.ownedItemIds.includes(itemId)) return prev;
      const nextAvatar = { ...prev.avatar };
      if (category === 'bat') nextAvatar.batColor = item.previewColor;
      if (category === 'helmet') nextAvatar.helmetColor = item.previewColor;
      if (category === 'gloves') nextAvatar.gloveColor = item.previewColor;
      if (category === 'jersey') {
        nextAvatar.jerseyColor = item.previewColor;
        if (item.accentColor) nextAvatar.jerseyAccent = item.accentColor;
      }
      return {
        ...prev,
        equipped: { ...prev.equipped, [category]: itemId },
        avatar: nextAvatar,
      };
    });
  }, []);

  const setCaptainAndVice = useCallback((captainId: string, viceId: string) => {
    if (captainId === viceId) return;
    setUserTeam((prev) => ({
      ...prev,
      players: prev.players.map((p) => ({
        ...p,
        isCaptain: p.id === captainId,
        isViceCaptain: p.id === viceId,
      })),
    }));
  }, []);

  const updateSquadOrder = useCallback((newPlayers: SquadPlayer[]) => {
    setUserTeam((prev) => ({ ...prev, players: newPlayers }));
  }, []);

  const updateBowlingOrder = useCallback((bowlingOrderIds: string[]) => {
    setUserTeam((prev) => ({ ...prev, bowlingOrderIds }));
  }, []);

  const updateTeamTactics = useCallback((fieldPreset: FieldPreset, strategy: TeamStrategy) => {
    setUserTeam((prev) => ({ ...prev, fieldPreset, strategy }));
  }, []);

  const recordMatchResult = useCallback(
    (payload: {
      opponent: string;
      format: MatchHistoryEntry['format'];
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
    }) => {
      setProfile((prev) => {
        const s = prev.stats;
        const newHigh = Math.max(s.highScore, payload.userRuns);
        const newFifty = payload.userRuns >= 50 && payload.userRuns < 100 ? 1 : 0;
        const newHundred = payload.userRuns >= 100 ? 1 : 0;
        const betterBowling =
          payload.userWickets > s.bestBowlingWickets ||
          (payload.userWickets === s.bestBowlingWickets &&
            payload.userRunsConceded < s.bestBowlingRuns);

        const newAchievements = new Set(prev.career.unlockedAchievements);
        if (payload.userFours + payload.userSixes > 0) newAchievements.add('First Boundary');
        if (payload.userRuns >= 50) newAchievements.add('Half-Century Debut');
        if (payload.userRuns >= 100) newAchievements.add('Century Club');
        if (payload.userSixes > 0) newAchievements.add('Maximum Overdrive');
        if (payload.won) newAchievements.add('Sharp Skipper');

        const newTrophies = new Set(prev.career.trophies);
        const completedSeries = new Set(prev.career.completedSeriesIds);
        let bonusXp = payload.won ? 220 : 90;
        if (payload.careerSeriesId && payload.won) {
          const series = CAREER_SERIES.find((cs) => cs.id === payload.careerSeriesId);
          if (series) {
            newTrophies.add(series.trophy);
            completedSeries.add(series.id);
            bonusXp += series.xpReward;
          }
        }

        const nextXp = prev.career.xp + bonusXp + payload.userRuns * 2 + payload.userWickets * 25;
        const nextTier = getTierFromXp(nextXp);
        const nextRank = Math.max(1, prev.career.worldRank - (payload.won ? 4 : 1));

        const entry: MatchHistoryEntry = {
          id: `m_${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          opponent: payload.opponent,
          format: payload.format,
          result: payload.resultText,
          userRuns: payload.userRuns,
          userBalls: payload.userBalls,
          userWickets: payload.userWickets,
          pointsEarned: payload.pointsEarned,
        };

        return {
          ...prev,
          virtualPoints: prev.virtualPoints + payload.pointsEarned,
          stats: {
            matches: s.matches + 1,
            innings: s.innings + 1,
            notOuts: s.notOuts + (payload.userOut ? 0 : 1),
            runs: s.runs + payload.userRuns,
            ballsFaced: s.ballsFaced + payload.userBalls,
            highScore: newHigh,
            fifties: s.fifties + newFifty,
            hundreds: s.hundreds + newHundred,
            fours: s.fours + payload.userFours,
            sixes: s.sixes + payload.userSixes,
            wickets: s.wickets + payload.userWickets,
            oversBowled: Number((s.oversBowled + payload.userOversBowled).toFixed(1)),
            runsConceded: s.runsConceded + payload.userRunsConceded,
            bestBowlingWickets: betterBowling ? payload.userWickets : s.bestBowlingWickets,
            bestBowlingRuns: betterBowling ? payload.userRunsConceded : s.bestBowlingRuns,
            catches: s.catches + payload.catches,
            runOuts: s.runOuts + payload.runOuts,
          },
          career: {
            tier: nextTier,
            xp: nextXp,
            worldRank: nextRank,
            trophies: Array.from(newTrophies),
            unlockedAchievements: Array.from(newAchievements),
            completedSeriesIds: Array.from(completedSeries),
          },
          recentMatches: [entry, ...prev.recentMatches].slice(0, 12),
        };
      });
    },
    []
  );

  const resetProgress = useCallback(() => {
    setProfile(INITIAL_PLAYER_PROFILE);
    setUserTeam(DEFAULT_USER_TEAM);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return {
    profile,
    userTeam,
    settings,
    setSettings,
    updateProfile,
    buyShopItem,
    equipShopItem,
    setCaptainAndVice,
    updateSquadOrder,
    updateBowlingOrder,
    updateTeamTactics,
    recordMatchResult,
    resetProgress,
  };
}
