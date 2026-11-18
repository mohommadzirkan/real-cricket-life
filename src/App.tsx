import { useEffect, useMemo, useRef, useState } from 'react';
import { CareerModeScreen } from './components/CareerModeScreen';
import { MainMenu } from './components/MainMenu';
import { MatchPlayHUD } from './components/MatchPlayHUD';
import { MultiplayerScreen } from './components/MultiplayerScreen';
import { PlayerProfileScreen } from './components/PlayerProfileScreen';
import { QuickMatchSetup } from './components/QuickMatchSetup';
import { SettingsScreen } from './components/SettingsScreen';
import { TeamManagementScreen } from './components/TeamManagementScreen';
import { TournamentsScreen } from './components/TournamentsScreen';
import { VirtualShopScreen } from './components/VirtualShopScreen';
import { SAMPLE_OPPONENT_TEAMS, SHOP_CATALOG } from './data/sampleData';
import { audioEngine } from './engine/audio';
import { CricketStadiumEngine, EngineMatchVisuals } from './engine/CricketStadiumEngine';
import { useGameStore } from './state/useGameStore';
import { MatchConfig, ScreenId } from './types/game';

const DEFAULT_PRACTICE_CONFIG: MatchConfig = {
  format: 'T10',
  overs: 10,
  stadiumTime: 'Night',
  weather: 'Clear',
  pitch: 'Flat',
  opponentTeamId: SAMPLE_OPPONENT_TEAMS[0].id,
  difficulty: 'Pro',
  isPractice: true,
  practiceRole: 'Batting',
};

export default function App() {
  const {
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
  } = useGameStore();

  const [screen, setScreen] = useState<ScreenId>('menu');
  const [matchConfig, setMatchConfig] = useState<MatchConfig>(DEFAULT_PRACTICE_CONFIG);
  const [userBatsFirst, setUserBatsFirst] = useState<boolean>(true);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<CricketStadiumEngine | null>(null);

  const equippedBall = useMemo(
    () => SHOP_CATALOG.find((i) => i.id === profile.equipped.ball) || SHOP_CATALOG[3],
    [profile.equipped.ball]
  );

  const opponentTeam = useMemo(
    () =>
      SAMPLE_OPPONENT_TEAMS.find((t) => t.id === matchConfig.opponentTeamId) ||
      SAMPLE_OPPONENT_TEAMS[0],
    [matchConfig.opponentTeamId]
  );

  const visuals: EngineMatchVisuals = useMemo(
    () => ({
      stadiumTime: screen === 'menu' ? 'Night' : matchConfig.stadiumTime,
      weather: screen === 'menu' ? 'Clear' : matchConfig.weather,
      pitch: matchConfig.pitch,
      fieldPreset: userTeam.fieldPreset,
      cameraMode: settings.cameraMode,
      userJerseyColor: profile.avatar.jerseyColor,
      userAccentColor: profile.avatar.jerseyAccent,
      userHelmetColor: profile.avatar.helmetColor,
      userBatColor: profile.avatar.batColor,
      userGloveColor: profile.avatar.gloveColor,
      userLeftHanded: profile.battingHand === 'Left-Hand',
      opponentJerseyColor: opponentTeam.primaryColor,
      opponentAccentColor: opponentTeam.secondaryColor,
      ballColor:
        matchConfig.format === 'Test'
          ? '#991B1B'
          : matchConfig.format === 'T20' || matchConfig.format === 'ODI'
          ? '#F1F5F9'
          : equippedBall.previewColor,
      seamColor:
        matchConfig.format === 'T20' || matchConfig.format === 'ODI'
          ? '#1E293B'
          : equippedBall.accentColor || '#F8FAFC',
      graphicsQuality: settings.graphicsQuality,
      vrHeadlookSensitivity: settings.vrHeadlookSensitivity,
    }),
    [screen, matchConfig, userTeam.fieldPreset, settings, profile, opponentTeam, equippedBall]
  );

  // Mount WebGL stadium engine once in isolated container
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;
    const engine = new CricketStadiumEngine(mount, visuals);
    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync visuals & audio settings without tearing down canvas
  useEffect(() => {
    engineRef.current?.applyVisuals(visuals);
  }, [visuals]);

  useEffect(() => {
    audioEngine.syncSettings(settings);
  }, [settings]);

  // Switch engine between menu flyover and active 3D match mode
  useEffect(() => {
    if (screen === 'match' || screen === 'practice') {
      engineRef.current?.setMode('match');
    } else {
      engineRef.current?.setMode('showcase');
    }
  }, [screen]);

  const launchMatch = (config: MatchConfig, batsFirst: boolean) => {
    setMatchConfig(config);
    setUserBatsFirst(batsFirst);
    setScreen('match');
  };

  const handleNavigate = (next: ScreenId) => {
    audioEngine.unlock();
    if (next === 'practice') {
      setMatchConfig(DEFAULT_PRACTICE_CONFIG);
      setUserBatsFirst(true);
      setScreen('practice');
      return;
    }
    setScreen(next);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070B09]">
      {/* Isolated WebGL Stadium Canvas Container */}
      <div ref={canvasMountRef} className="absolute inset-0 w-full h-full" />

      {/* Active Screen / HUD Layer */}
      {screen === 'menu' && (
        <MainMenu
          profile={profile}
          settings={settings}
          onNavigate={handleNavigate}
          onToggleMute={() => {
            audioEngine.unlock();
            setSettings((s) => ({ ...s, muted: !s.muted }));
          }}
        />
      )}

      {screen === 'quick-match-setup' && (
        <QuickMatchSetup
          onBack={() => setScreen('menu')}
          onStartMatch={(cfg, batsFirst) => launchMatch(cfg, batsFirst)}
        />
      )}

      {(screen === 'match' || screen === 'practice') && (
        <MatchPlayHUD
          engineRef={engineRef}
          config={matchConfig}
          userBatsFirst={userBatsFirst}
          userTeam={userTeam}
          profile={profile}
          settings={settings}
          onUpdateSettings={setSettings}
          onUpdateFieldPreset={updateTeamTactics}
          onRecordMatch={recordMatchResult}
          onExitToMenu={() => setScreen('menu')}
        />
      )}

      {screen === 'career' && (
        <CareerModeScreen
          profile={profile}
          onBack={() => setScreen('menu')}
          onStartCareerMatch={(cfg) => launchMatch(cfg, true)}
        />
      )}

      {screen === 'team' && (
        <TeamManagementScreen
          userTeam={userTeam}
          onBack={() => setScreen('menu')}
          onUpdateOrder={updateSquadOrder}
          onSetCaptainVice={setCaptainAndVice}
          onUpdateBowlingOrder={updateBowlingOrder}
          onUpdateTactics={updateTeamTactics}
        />
      )}

      {screen === 'tournaments' && (
        <TournamentsScreen
          onBack={() => setScreen('menu')}
          onLaunchMatch={(cfg) => launchMatch(cfg, true)}
        />
      )}

      {screen === 'multiplayer' && (
        <MultiplayerScreen
          profile={profile}
          onBack={() => setScreen('menu')}
          onStartSimulatedOnlineMatch={(cfg) => launchMatch(cfg, true)}
        />
      )}

      {screen === 'shop' && (
        <VirtualShopScreen
          profile={profile}
          onBack={() => setScreen('menu')}
          onBuy={buyShopItem}
          onEquip={equipShopItem}
        />
      )}

      {screen === 'profile' && (
        <PlayerProfileScreen
          profile={profile}
          onBack={() => setScreen('menu')}
          onUpdateProfile={updateProfile}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onBack={() => setScreen('menu')}
          onUpdateSettings={setSettings}
          onResetProgress={resetProgress}
        />
      )}
    </div>
  );
}
