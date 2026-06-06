/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Clock, 
  LogOut, 
  HelpCircle, 
  Layers, 
  FileSpreadsheet, 
  ShieldCheck,
  Award
} from 'lucide-react';
import { BaanPlayer, Roll, GoogleSheetConfig } from './types';
import LoginPage from './components/LoginPage';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import { 
  getInitialPlayers, 
  getInitialRolls, 
  getInitialSheetConfig, 
  saveLocalState, 
  fetchGoogleSheetState,
  syncActiveRoundToGoogleSheet,
  syncTimerToGoogleSheet
} from './utils/sheets';

// @ts-ignore
import buttonSound from '@/assets/Button.mp3';

export default function App() {
  // Core game states
  const [currentUser, setCurrentUser] = useState<string | null>(null); // "admin", "baan-1", ..., or null
  const [players, setPlayers] = useState<BaanPlayer[]>(() => getInitialPlayers());
  const [rolls, setRolls] = useState<Roll[]>(() => getInitialRolls());
  const [sheetConfig, setSheetConfig] = useState<GoogleSheetConfig>(() => getInitialSheetConfig());
  const [currentRound, setCurrentRound] = useState<string>(() => {
    return localStorage.getItem('snakes_n_ladders_active_round') || 'Trial';
  });

  // Dynamic remote-loaded data from Google Sheet
  const [passwordsFromSheet, setPasswordsFromSheet] = useState<{ [key: string]: string } | undefined>(undefined);
  const [isPulling, setIsPulling] = useState<boolean>(false);

  // Timer countdown state
  const [timerEnd, setTimerEnd] = useState<number | null>(() => {
    const saved = localStorage.getItem('snakes_n_ladders_timer_end');
    if (saved) {
      const end = parseInt(saved, 10);
      if (end > Date.now()) {
        return end;
      }
    }
    return null;
  });

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!timerEnd) return 60;
    return Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
  });

  const timerEndRef = React.useRef<number | null>(timerEnd);
  useEffect(() => {
    timerEndRef.current = timerEnd;
  }, [timerEnd]);

  const lastSecRef = React.useRef<number>(60);
  const lastFastTickRef = React.useRef<number>(0);

  // Global button and clickable element sound trigger
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      let target = event.target as HTMLElement | null;
      while (target && target !== document.body) {
        if (
          target.tagName === 'BUTTON' ||
          target.getAttribute('role') === 'button' ||
          target.classList.contains('cursor-pointer') ||
          target.id?.toLowerCase().includes('btn') ||
          target.className?.toString().toLowerCase().includes('btn')
        ) {
          try {
            const audioObj = new Audio(buttonSound);
            audioObj.play().catch((err) => {
              console.warn('Primary button click audio failed, trying path fallback...', err);
              const fb1 = new Audio('/assets/Button.mp3');
              fb1.play().catch((err2) => {
                console.warn('Path fallback failed', err2);
              });
            });
          } catch (soundErr) {
            console.error('Audio initialization failed for button click:', soundErr);
          }
          break;
        }
        target = target.parentElement;
      }
    };

    window.addEventListener('click', handleGlobalClick, { capture: true });
    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true });
    };
  }, []);

  // Synchronized timer ticks & countdown
  useEffect(() => {
    const interval = setInterval(() => {
      if (timerEnd) {
        const diff = timerEnd - Date.now();
        if (diff <= 0) {
          setTimerEnd(null);
          localStorage.removeItem('snakes_n_ladders_timer_end');
          setTimeLeft(60);
          
          // Play finished sound
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
              const ctx = new AudioContextClass();
              const osc1 = ctx.createOscillator();
              const osc2 = ctx.createOscillator();
              const gain = ctx.createGain();
              osc1.connect(gain);
              osc2.connect(gain);
              gain.connect(ctx.destination);
              
              osc1.frequency.setValueAtTime(330, ctx.currentTime);
              osc2.frequency.setValueAtTime(335, ctx.currentTime);
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
              
              osc1.start();
              osc2.start();
              osc1.stop(ctx.currentTime + 0.6);
              osc2.stop(ctx.currentTime + 0.6);
            }
          } catch (soundErr) {
            console.warn(soundErr);
          }
        } else {
          const sec = Math.ceil(diff / 1000);
          setTimeLeft(sec);

          // Audio ticking feedback
          if (sec <= 5) {
            // Last 5 seconds: tick faster (every 300ms)
            const now = Date.now();
            if (now - lastFastTickRef.current >= 300) {
              lastFastTickRef.current = now;
              try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                  const ctx = new AudioContextClass();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.frequency.setValueAtTime(1000, ctx.currentTime);
                  osc.type = 'sine';
                  gain.gain.setValueAtTime(0.08, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.05);
                }
              } catch (e) {}
            }
          } else {
            // Normal section: tick every second decrease
            if (sec !== lastSecRef.current) {
              lastSecRef.current = sec;
              try {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                  const ctx = new AudioContextClass();
                  const osc = ctx.createOscillator();
                  const gain = ctx.createGain();
                  osc.connect(gain);
                  gain.connect(ctx.destination);
                  osc.frequency.setValueAtTime(650, ctx.currentTime);
                  osc.type = 'sine';
                  gain.gain.setValueAtTime(0.05, ctx.currentTime);
                  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
                  osc.start();
                  osc.stop(ctx.currentTime + 0.07);
                }
              } catch (e) {}
            }
          }
        }
      } else {
        setTimeLeft(60);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerEnd]);

  // Synchronize timer end timestamp across browser tabs/frames using localStorage listener
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'snakes_n_ladders_timer_end') {
        if (e.newValue) {
          const end = parseInt(e.newValue, 10);
          if (end > Date.now()) {
            setTimerEnd(end);
          } else {
            setTimerEnd(null);
          }
        } else {
          setTimerEnd(null);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleStartTimer = () => {
    const endTime = Date.now() + 60000; // 1-minute default duration
    setTimerEnd(endTime);
    localStorage.setItem('snakes_n_ladders_timer_end', String(endTime));
    syncTimerToGoogleSheet(sheetConfig, endTime);
  };

  const handleStopTimer = () => {
    setTimerEnd(null);
    localStorage.removeItem('snakes_n_ladders_timer_end');
    setTimeLeft(60);
    syncTimerToGoogleSheet(sheetConfig, null);
  };

  const handleAdjustTimer = (adjustmentSec: number) => {
    let newEndTime: number;
    if (timerEnd) {
      newEndTime = timerEnd + (adjustmentSec * 1000);
    } else {
      newEndTime = Date.now() + ((60 + adjustmentSec) * 1000);
    }
    
    if (newEndTime <= Date.now()) {
      setTimerEnd(null);
      localStorage.removeItem('snakes_n_ladders_timer_end');
      setTimeLeft(60);
      syncTimerToGoogleSheet(sheetConfig, null);
    } else {
      setTimerEnd(newEndTime);
      localStorage.setItem('snakes_n_ladders_timer_end', String(newEndTime));
      setTimeLeft(Math.max(0, Math.ceil((newEndTime - Date.now()) / 1000)));
      syncTimerToGoogleSheet(sheetConfig, newEndTime);
    }
  };

  const formatTimeLeft = (secondsCount: number) => {
    const mm = String(Math.floor(secondsCount / 60)).padStart(2, '0');
    const ss = String(secondsCount % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // Save changes locally whenever state changes
  useEffect(() => {
    saveLocalState(players, rolls, sheetConfig);
  }, [players, rolls, sheetConfig]);

  // Persist current active round inside localStorage
  useEffect(() => {
    localStorage.setItem('snakes_n_ladders_active_round', currentRound);
  }, [currentRound]);

  // Attempt to sync pulling passwords & squares from sheet if configured on load
  const loadSheetData = async (configOverride?: GoogleSheetConfig, isSilent: boolean = false) => {
    const activeConfig = configOverride || sheetConfig;
    if (!activeConfig.appsScriptUrl) return;

    if (!isSilent) setIsPulling(true);
    try {
      const data = await fetchGoogleSheetState(activeConfig);
      if (data) {
        // Apply synchronized passwords if present
        if (data.passwords) {
          setPasswordsFromSheet(data.passwords);
          if (!isSilent) console.log('Successfully synced custom passwords from sheet:', data.passwords);
        }

        // Apply synchronized coordinates if present
        if (data.positions) {
          setPlayers((prevPlayers) =>
            prevPlayers.map((player) => {
              const matchedPosition = data.positions?.[player.name];
              if (matchedPosition !== undefined && !isNaN(matchedPosition)) {
                return {
                  ...player,
                  currentSquare: matchedPosition,
                };
              }
              return player;
            })
          );
          if (!isSilent) console.log('Successfully synced player coordinates from sheet:', data.positions);
        }

        // Apply synchronized active round if present
        if (data.activeRound) {
          setCurrentRound(data.activeRound);
          localStorage.setItem('snakes_n_ladders_active_round', data.activeRound);
        }

        // Apply synchronized timer if present in database payload
        if (data.timerEnd !== undefined) {
          const remoteTime = parseInt(data.timerEnd, 10);
          const currentLocalTime = timerEndRef.current;
          if (remoteTime > 0) {
            if (!currentLocalTime || Math.abs(currentLocalTime - remoteTime) > 1500) {
              if (remoteTime > Date.now()) {
                setTimerEnd(remoteTime);
                localStorage.setItem('snakes_n_ladders_timer_end', String(remoteTime));
              } else {
                setTimerEnd(null);
                localStorage.removeItem('snakes_n_ladders_timer_end');
                setTimeLeft(60);
              }
            }
          } else if (currentLocalTime !== null) {
            setTimerEnd(null);
            localStorage.removeItem('snakes_n_ladders_timer_end');
            setTimeLeft(60);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to pull initial state from Google Sheets web app:', err);
    } finally {
      if (!isSilent) setIsPulling(false);
    }
  };

  // Run on mount
  useEffect(() => {
    loadSheetData();
  }, []);

  // Automated background polling loop to keep players and admin synchronized across separate screens!
  useEffect(() => {
    if (!sheetConfig.appsScriptUrl) return;

    // Pull every 6 seconds softly in the background
    const interval = setInterval(() => {
      loadSheetData(sheetConfig, true);
    }, 6000);

    return () => clearInterval(interval);
  }, [sheetConfig.appsScriptUrl]);

  // Actions
  const handleRollComplete = (val: string, stand1: number, stand2: number, before: number, after: number) => {
    if (!currentUser) return;

    // Find user name
    let actingUser = 'Admin';
    if (currentUser !== 'admin') {
      const targetP = players.find((p) => p.id === currentUser);
      if (targetP) actingUser = targetP.name;
    }

    // Append new Roll entry
    const newRoll: Roll = {
      id: `roll-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      user: actingUser,
      value: val,
      stand1: stand1,
      stand2: stand2,
      squareBefore: before,
      squareAfter: after,
      timestamp: new Date().toISOString(),
      round: currentRound,
    };

    setRolls((prev) => [...prev, newRoll]);

    // Update coordinates in-state for target
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === currentUser) {
          return {
            ...p,
            currentSquare: after,
            lastRoll: val,
            lastRollTime: newRoll.timestamp,
            lastStand1: stand1,
            lastStand2: stand2,
          };
        }
        return p;
      })
    );
  };

  const handleManualMovePlayer = (playerId: string, targetSquare: number) => {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            currentSquare: targetSquare,
          };
        }
        return p;
      })
    );

    // Also Log this override
    const matchedP = players.find((p) => p.id === playerId);
    if (matchedP) {
      const logEntry: Roll = {
        id: `override-${Date.now()}`,
        user: 'Admin Overwrite',
        value: 'Override',
        squareBefore: matchedP.currentSquare,
        squareAfter: targetSquare,
        timestamp: new Date().toISOString(),
      };
      setRolls((prev) => [...prev, logEntry]);
    }
  };

  const handleResetGame = () => {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        currentSquare: 1,
        lastRoll: null,
        lastRollTime: null,
      }))
    );
    setRolls([]);
  };

  const handleClearLogs = () => {
    setRolls([]);
  };

  const handleUpdateSheetConfig = (newConfig: GoogleSheetConfig) => {
    setSheetConfig(newConfig);
    // Directly trigger a pull with the newly supplied config fields
    loadSheetData(newConfig);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Find active player profile
  const activePlayerProfile = players.find((p) => p.id === currentUser);

  // Get crown leader
  const currentLeader = React.useMemo(() => {
    return players.reduce((lead, cur) => (cur.currentSquare > lead.currentSquare ? cur : lead), players[0]);
  }, [players]);

  return (
    <div className="min-h-screen text-slate-900 bg-slate-50 font-sans flex flex-col justify-between" id="app_frame">
      {/* 🚨 Full Screen Warning Red Blinking Alert Overlay during the final 10 seconds of countdown */}
      {timerEnd && timeLeft <= 10 && (
        <div className="pointer-events-none fixed inset-0 z-[9999] bg-red-950/45 border-[18px] border-red-950/75 animate-fast-blink" />
      )}

      {/* 🚀 Header: Bluish to Purple Gradient at the top */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg px-8 py-5 flex items-center justify-between select-none">
        {/* Top-Left Logo Block */}
        <div>
          <h1 className="font-display font-black text-2xl tracking-tight leading-none bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
            Snakes & Ladders
          </h1>
        </div>

        {/* Top-Right Status Panel */}
        <div className="flex items-center gap-3 text-sm font-sans">
          {/* Active Round Indicator */}
          <span className="tracking-wide font-sans bg-amber-500 text-slate-900 font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm">
            <span>ROUND</span>
            <span className="px-2 py-0.5 bg-slate-950 text-white rounded font-mono text-[11px] font-black">{currentRound === 'Trial' ? 'Trial' : currentRound}</span>
          </span>

          {/* Active Identity Label */}
          <span className="bg-white/10 px-4 py-2 rounded-xl text-white font-bold tracking-wide text-xs uppercase">
            {currentUser === 'admin' ? 'Admin' : activePlayerProfile?.name || 'Guest'}
          </span>

          {/* Universal Remaining Time Countdown */}
          <span className={`tracking-wider font-mono whitespace-nowrap px-3.5 py-2 rounded-xl transition-all duration-300 flex items-center gap-1.5 border select-none ${
            timerEnd
              ? timeLeft <= 5
                ? 'bg-red-950/90 border-red-500 text-red-100 font-black shadow-[0_0_12px_rgba(239,68,68,0.5)] animate-pulse'
                : 'bg-red-900/30 border-red-900/45 text-red-200 font-bold animate-[pulse_1.5s_infinite]'
              : 'bg-black/20 border-transparent text-slate-300 text-xs'
          }`}>
            <Clock className={`w-3.5 h-3.5 ${timerEnd ? 'text-red-400 animate-pulse' : 'text-blue-200'}`} />
            <span className={timerEnd ? 'text-sm font-black' : 'text-xs font-semibold'}>
              {formatTimeLeft(timeLeft)} {timerEnd ? '' : '(Ready)'}
            </span>
          </span>

          {currentUser && (
            <button
              onClick={handleLogout}
              className="hover:bg-white/10 p-2 rounded-xl transition-colors cursor-pointer flex items-center justify-center text-red-200 hover:text-white"
              title="Log Out Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Visual Leaderboard ticker band if signed in */}
      {currentUser && (
        <div className="bg-slate-900 text-slate-300 border-b border-indigo-950 px-8 py-2 text-xs font-mono flex items-center justify-end">
          <div className="flex items-center gap-4">
            {sheetConfig.appsScriptUrl ? (
              <span className="flex items-center gap-1 text-emerald-400 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Google Sheets Synced</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 text-[11px]" title="Database settings inactive in Admin Console">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Simulation Sandbox Mode</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Content Area (White & Black clean styling theme for game panel elements) */}
      <main className="flex-1 bg-white flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!currentUser ? (
            <motion.div
              key="login"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <LoginPage 
                players={players} 
                onLoginSuccess={setCurrentUser} 
                passwordsFromSheet={passwordsFromSheet}
              />
            </motion.div>
          ) : currentUser === 'admin' ? (
            <motion.div
              key="admin"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6"
            >
              <AdminPanel
                players={players}
                rolls={rolls}
                sheetConfig={sheetConfig}
                currentRound={currentRound}
                timerActive={!!timerEnd}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                onAdjustTimer={handleAdjustTimer}
                onChangeRound={(newRound: string) => {
                  setCurrentRound(newRound);
                  syncActiveRoundToGoogleSheet(sheetConfig, newRound);
                }}
                onUpdateSheetConfig={handleUpdateSheetConfig}
                onManualMovePlayer={handleManualMovePlayer}
                onResetGame={handleResetGame}
                onClearLogs={handleClearLogs}
                onSyncPull={loadSheetData}
                isSyncingPull={isPulling}
              />
            </motion.div>
          ) : (
            activePlayerProfile && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-6"
              >
                <UserDashboard
                  player={activePlayerProfile}
                  players={players}
                  rolls={rolls}
                  sheetConfig={sheetConfig}
                  currentRound={currentRound}
                  onRollComplete={handleRollComplete}
                  onLogout={handleLogout}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </main>

      {/* Footer Design Accents */}
      <footer className="bg-slate-950 text-slate-500 border-t border-slate-900 py-6 px-6 text-center text-xs font-mono select-none">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px]">
          <span>© 2026 Snakes & Ladders Arena Dice Roller. All rights reserved.</span>
          <span className="text-slate-600">
            Engine is optimized for Google Sheet API cell integrations & Vercel serverless live hosting
          </span>
        </div>
      </footer>
    </div>
  );
}
