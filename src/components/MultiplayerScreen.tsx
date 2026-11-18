import React, { useState } from 'react';
import { ArrowLeft, Info, Play, Radio, Send, UserPlus, Users } from 'lucide-react';
import { SAMPLE_MULTIPLAYER_FRIENDS, SAMPLE_OPPONENT_TEAMS } from '../data/sampleData';
import { MatchConfig, PlayerProfile } from '../types/game';

interface MultiplayerScreenProps {
  profile: PlayerProfile;
  onBack: () => void;
  onStartSimulatedOnlineMatch: (config: MatchConfig) => void;
}

export const MultiplayerScreen: React.FC<MultiplayerScreenProps> = ({
  profile,
  onBack,
  onStartSimulatedOnlineMatch,
}) => {
  const [matchmaking, setMatchmaking] = useState<'idle' | 'searching' | 'found'>('idle');
  const [invitedIds, setInvitedIds] = useState<string[]>([]);
  const [chatMsg, setChatMsg] = useState('');
  const [lobbyChat, setLobbyChat] = useState<Array<{ sender: string; text: string }>>([
    { sender: 'Vikram_XI', text: 'Ready for a 5-over T10 night match!' },
    { sender: 'KabirBlaze', text: 'Drop an invite when your squad is set.' },
  ]);

  const startQueue = () => {
    setMatchmaking('searching');
    setTimeout(() => {
      setMatchmaking('found');
    }, 1100);
  };

  const sendInvite = (id: string, name: string) => {
    if (!invitedIds.includes(id)) {
      setInvitedIds((p) => [...p, id]);
      setLobbyChat((p) => [
        { sender: 'System', text: `Simulated squad invitation sent to ${name}.` },
        ...p,
      ]);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    setLobbyChat((p) => [{ sender: profile.name, text: chatMsg.trim() }, ...p]);
    setChatMsg('');
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
            MULTIPLAYER LOBBY
          </h2>
          <div className="w-20" />
        </div>

        {/* Honest Backend Disclosure Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/35 flex items-start gap-3 text-xs text-amber-100">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-amber-300">
              Prototype Architecture Notice — Simulated Online Services
            </div>
            <p className="text-slate-300 leading-relaxed">
              Friend presence, matchmaking queues, team invites, and cross-device live voice chat require dedicated WebSocket/Matchmaker servers and a WebRTC SFU audio backend. In this browser prototype, lobbies and invites are simulated locally, and launching a match pairs you against an AI-controlled opponent XI in the 3D stadium.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Matchmaking & Online Tournaments */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Ranked 1v1 Matchmaking (Simulated Queue)</span>
                </div>
                <span className="text-xs text-slate-400">T10 Night · 5 Overs</span>
              </div>

              {matchmaking === 'idle' && (
                <button
                  onClick={startQueue}
                  className="w-full min-h-[50px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#05110B] font-bold text-sm cursor-pointer"
                >
                  Find Match (Simulated Opponent)
                </button>
              )}

              {matchmaking === 'searching' && (
                <div className="p-4 rounded-xl bg-[#090E0C] border border-white/10 text-center text-sm text-sky-300">
                  Searching simulated regional server (Asia-South · 28ms)...
                </div>
              )}

              {matchmaking === 'found' && (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-400/50 space-y-3">
                  <div className="text-sm font-bold text-emerald-300">
                    Opponent Matched: KabirBlaze (Mumbai Titans AI Proxy)
                  </div>
                  <button
                    onClick={() =>
                      onStartSimulatedOnlineMatch({
                        format: 'T10',
                        overs: 5,
                        stadiumTime: 'Night',
                        weather: 'Clear',
                        pitch: 'Flat',
                        opponentTeamId: SAMPLE_OPPONENT_TEAMS[0].id,
                        difficulty: 'Pro',
                        isPractice: false,
                      })
                    }
                    className="w-full min-h-[48px] rounded-xl bg-emerald-500 text-[#05110B] font-bold text-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Enter 3D Stadium Match</span>
                  </button>
                </div>
              )}
            </div>

            {/* Lobby Squad Chat & Voice Readiness */}
            <div className="p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>Squad Chat &amp; Voice Room (Backend Required for Live Audio)</span>
                </div>
              </div>
              <div className="h-36 overflow-y-auto p-3 rounded-xl bg-[#090E0C] border border-white/10 space-y-1.5 text-xs">
                {lobbyChat.map((m, idx) => (
                  <div key={idx} className="text-slate-300">
                    <span className="font-semibold text-emerald-400">{m.sender}:</span> {m.text}
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatMsg}
                  onChange={(e) => setChatMsg(e.target.value)}
                  placeholder="Send tactical message to lobby..."
                  className="flex-1 min-h-[44px] px-3 rounded-xl bg-[#090E0C] border border-white/15 text-white text-xs"
                />
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-500 text-[#05110B] font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          </div>

          {/* Friends List & Invitations */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#0D1411] border border-white/10 space-y-3">
            <div className="text-sm font-bold text-white">Friends &amp; Team Invitations</div>
            <div className="space-y-2.5">
              {SAMPLE_MULTIPLAYER_FRIENDS.map((f) => {
                const invited = invitedIds.includes(f.id);
                return (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-[#090E0C] border border-white/10 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{f.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {f.rank} · {f.status} · {f.ping}
                      </div>
                    </div>
                    <button
                      onClick={() => sendInvite(f.id, f.name)}
                      className={`min-h-[40px] px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                        invited
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-[#16221D] text-white hover:bg-emerald-500 hover:text-[#05110B]'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{invited ? 'Invited' : 'Invite'}</span>
                    </button>
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
