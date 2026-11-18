export type ScreenId =
  | 'menu'
  | 'quick-match-setup'
  | 'match'
  | 'career'
  | 'multiplayer'
  | 'practice'
  | 'team'
  | 'tournaments'
  | 'shop'
  | 'profile'
  | 'settings';

export type MatchFormat = 'T10' | 'T20' | 'ODI' | 'Test';

export type BattingHand = 'Right-Hand' | 'Left-Hand';

export type BowlingStyle =
  | 'Right-Arm Fast'
  | 'Left-Arm Fast'
  | 'Right-Arm Medium'
  | 'Off-Spin'
  | 'Leg-Spin';

export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicketkeeper';

export type StadiumTime = 'Day' | 'Twilight' | 'Night';
export type WeatherCondition = 'Clear' | 'Overcast' | 'Light Rain' | 'Heavy Rain';
export type PitchCondition = 'Flat' | 'Green' | 'Dry' | 'Damp';

export type FieldPreset = 'Attacking' | 'Balanced' | 'Defensive' | 'Powerplay' | 'Death';
export type TeamStrategy = 'Aggressive' | 'Balanced' | 'Anchor';
export type CameraMode = 'Broadcast' | 'FirstPersonVR' | 'BowlerCam' | 'Drone';

export type ShotType = 'Defend' | 'Drive' | 'Pull' | 'Lofted';
export type ShotDirection = 'Leg' | 'Straight' | 'Off';
export type DeliveryType =
  | 'Fast'
  | 'Inswing'
  | 'Outswing'
  | 'Yorker'
  | 'Bouncer'
  | 'Off-Spin'
  | 'Leg-Spin';

export interface PlayerAvatar {
  skinTone: string;
  hairStyle: 'Short Fade' | 'Curly' | 'Buzz' | 'Swept';
  jerseyColor: string;
  jerseyAccent: string;
  helmetColor: string;
  batColor: string;
  gloveColor: string;
}

export interface PlayerStats {
  matches: number;
  innings: number;
  notOuts: number;
  runs: number;
  ballsFaced: number;
  highScore: number;
  fifties: number;
  hundreds: number;
  fours: number;
  sixes: number;
  wickets: number;
  oversBowled: number;
  runsConceded: number;
  bestBowlingWickets: number;
  bestBowlingRuns: number;
  catches: number;
  runOuts: number;
}

export type CareerTier =
  | 'Club Beginner'
  | 'State Challenger'
  | 'Domestic Pro'
  | 'Franchise Star'
  | 'International Legend';

export interface CareerProgress {
  tier: CareerTier;
  xp: number;
  worldRank: number;
  trophies: string[];
  unlockedAchievements: string[];
  completedSeriesIds: string[];
}

export interface EquippedLoadout {
  bat: string;
  ball: string;
  helmet: string;
  gloves: string;
  jersey: string;
  accessory: string;
}

export interface PlayerProfile {
  name: string;
  jerseyNumber: number;
  battingHand: BattingHand;
  bowlingStyle: BowlingStyle;
  role: PlayerRole;
  avatar: PlayerAvatar;
  stats: PlayerStats;
  career: CareerProgress;
  equipped: EquippedLoadout;
  ownedItemIds: string[];
  virtualPoints: number; // 100 points = 1 virtual rupee unit
  recentMatches: MatchHistoryEntry[];
}

export interface MatchHistoryEntry {
  id: string;
  date: string;
  opponent: string;
  format: MatchFormat;
  result: string;
  userRuns: number;
  userBalls: number;
  userWickets: number;
  pointsEarned: number;
}

export interface SquadPlayer {
  id: string;
  name: string;
  jerseyNumber: number;
  role: PlayerRole;
  battingHand: BattingHand;
  bowlingStyle: BowlingStyle;
  battingRating: number;
  bowlingRating: number;
  fieldingRating: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isUser?: boolean;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  players: SquadPlayer[];
  bowlingOrderIds: string[];
  fieldPreset: FieldPreset;
  strategy: TeamStrategy;
}

export type ShopCategory = 'bat' | 'ball' | 'helmet' | 'gloves' | 'jersey' | 'accessory';

export interface ShopItem {
  id: string;
  name: string;
  category: ShopCategory;
  pricePoints: number;
  description: string;
  statBoost: string;
  previewColor: string;
  accentColor?: string;
}

export interface MatchConfig {
  format: MatchFormat;
  overs: number; // e.g., 2, 5, 10, 20, 50, or 90 (Test day)
  stadiumTime: StadiumTime;
  weather: WeatherCondition;
  pitch: PitchCondition;
  opponentTeamId: string;
  difficulty: 'Amateur' | 'Pro' | 'Legend';
  isPractice: boolean;
  practiceRole?: 'Batting' | 'Bowling';
  isCareerMatch?: boolean;
  careerSeriesId?: string;
  tournamentId?: string;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  crowdVolume: number;
  muted: boolean;
  commentaryVoice: boolean;
  cameraMode: CameraMode;
  vrHeadlookSensitivity: number;
  graphicsQuality: 'High' | 'Balanced';
  timingIndicator: boolean;
}

export interface LiveBallEvent {
  overBall: string;
  runs: number;
  isFour: boolean;
  isSix: boolean;
  isWicket: boolean;
  wicketType?: string;
  isWide?: boolean;
  isNoBall?: boolean;
  timingLabel: string;
  shotName: string;
  speedKmh: number;
  commentary: string;
}

export interface BatterLiveScore {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  outText?: string;
}

export interface BowlerLiveScore {
  playerId: string;
  name: string;
  ballsBowled: number;
  runsConceded: number;
  wickets: number;
}
