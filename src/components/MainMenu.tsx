import React from 'react';
import {
  Award,
  Play,
  Settings,
  Shield,
  ShoppingBag,
  Target,
  Trophy,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameSettings, PlayerProfile, ScreenId } from '../types/game';

interface MainMenuProps {
  profile: PlayerProfile;
  settings: GameSettings;
  onNavigate: (screen: ScreenId) => void;
  onToggleMute: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  profile,
  settings,
  onNavigate,
  onToggleMute,
}) => {
  const rupeeUnits = (profile.virtualPoints / 100).toFixed(2);

  const secondaryItems: Array<{
    id: ScreenId;
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'career',
      label: 'Career Mode',
      subtitle: profile.career.tier,
      icon: <Award className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'practice',
      label: 'Practice Nets',
      subtitle: 'Batting & Bowling',
      icon: <Target className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'team',
      label: 'My Team',
      subtitle: '11-Squad & Captain',
      icon: <Shield className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'tournaments',
      label: 'Tournaments',
      subtitle: 'T10 · T20 · ODI · Test',
      icon: <Trophy className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'multiplayer',
      label: 'Multiplayer',
      subtitle: 'Lobby & Friends',
      icon: <Users className="w-5 h-5 text-sky-400" />,
    },
    {
      id: 'shop',
      label: 'Virtual Shop',
      subtitle: `${profile.virtualPoints.toLocaleString()} pts`,
      icon: <ShoppingBag className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'profile',
      label: 'Player Profile',
      subtitle: `${profile.name} · #${profile.jerseyNumber}`,
      icon: <User className="w-5 h-5 text-slate-300" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      subtitle: 'Audio · Camera · VR',
      icon: <Settings className="w-5 h-5 text-slate-300" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6 lg:p-10 pointer-events-none bg-gradient-to-t from-[#070B09]/92 via-[#070B09]/45 to-[#070B09]/70">
      {/* Top Bar: Brand Status & Audio Toggle */}
      <div className="flex items-center justify-between gap-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Custom Cricket Brand Crest SVG */}
          <svg
            width="42"
            height="42"
            viewBox="0 0 48 48"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="24" cy="24" r="22" fill="#0A1410" stroke="#34D399" strokeWidth="2" />
            <path d="M18 35V14M24 35V13M30 35V14" stroke="#F1D49B" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M16 13.5H22.5M25.5 13.5H32" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="33" cy="27" r="4.2" fill="#DC2626" stroke="#F8FAFC" strokeWidth="1" strokeDasharray="2 1.5" />
          </svg>
          <div>
            <div className="font-display text-lg sm:text-xl font-extrabold tracking-wider text-white leading-none">
              REAL CRICKET LIFE
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center gap-2 tabular-nums">
              <span>{profile.name}</span>
              <span aria-hidden="true">·</span>
              <span>Rank #{profile.career.worldRank}</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-400 font-medium">
                {profile.virtualPoints.toLocaleString()} pts (₹{rupeeUnits} Virtual)
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onToggleMute}
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-[#0D1512]/90 border border-white/15 text-slate-200 hover:border-emerald-400/50 transition-colors flex items-center gap-2 text-xs font-medium cursor-pointer"
          aria-label={settings.muted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {settings.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          <span className="hidden sm:inline">{settings.muted ? 'Muted' : 'Sound On'}</span>
        </button>
      </div>

      {/* Center-Left Hero Lockup & Action Grid */}
      <div className="my-auto w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-end pointer-events-auto">
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-medium text-emerald-400 tracking-wide">
            3D WebGL Stadium Simulation · Android Touch & VR-Ready
          </div>
          <h1 className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight text-white leading-[0.95] text-balance">
            REAL CRICKET LIFE
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-md leading-relaxed">
            Step onto the 22-yard turf under floodlights. Time drives, swing yorkers, lead your 11-player XI as Captain, and build a career from club turf to world finals.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('quick-match-setup')}
              className="min-h-[52px] px-7 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-[#05110B] font-bold text-base tracking-wide transition-all flex items-center gap-2.5 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Quick Match</span>
            </button>
            <button
              onClick={() => onNavigate('practice')}
              className="min-h-[52px] px-5 py-3 rounded-xl bg-[#0E1713]/90 hover:bg-[#15221C] border border-white/15 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              Nets Practice
            </button>
          </div>
        </div>

        {/* 8 Secondary Feature Buttons */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {secondaryItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="min-h-[76px] p-3.5 rounded-xl bg-[#0B120F]/92 hover:bg-[#131F1A] border border-white/12 hover:border-emerald-400/45 text-left transition-all flex flex-col justify-between gap-2 active:scale-[0.98] cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                {item.icon}
              </div>
              <div>
                <div className="text-sm font-semibold text-white leading-tight truncate">
                  {item.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                  {item.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Prototype Honesty & Controls Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 pointer-events-auto">
        <div>
          Controls: Tap shot pads or 1–4 / WASD + Space · Drag in 1st-Person VR mode to look around
        </div>
        <div>
          Local prototype save · Virtual points (100 pts = ₹1 Virtual) have no cash value
        </div>
      </div>
    </div>
  );
};
