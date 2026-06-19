/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Dices, 
  CheckCircle
} from 'lucide-react';
import { BaanPlayer, Roll, GoogleSheetConfig } from '../types';
import { BAAN_COLORS } from './Board';
import DiceRoller from './DiceRoller';
import { checkBoardTransition, syncRollToGoogleSheet } from '../utils/sheets';

interface UserDashboardProps {
  player: BaanPlayer;
  players: BaanPlayer[];
  rolls: Roll[];
  sheetConfig: GoogleSheetConfig;
  currentRound: string;
  onRollComplete: (rollVal: string, stand1: number, stand2: number, beforeSq: number, afterSq: number) => void;
  onLogout: () => void;
  standPositionsFromSheet?: { [key: string]: { stand1: number; stand2: number } };
  summaryRows?: any[][];
}

export default function UserDashboard({
  player,
  players,
  rolls,
  sheetConfig,
  currentRound,
  onRollComplete,
  onLogout,
  standPositionsFromSheet,
  summaryRows,
}: UserDashboardProps) {
  const roundRoll = rolls.find((r) => r.user === player.name && r.round === currentRound);
  const alreadyConfirmed = !!roundRoll;

  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [pendingRoll, setPendingRoll] = useState<{ die1: number; die2: number } | null>(null);
  const [stand1Die, setStand1Die] = useState<'A' | 'B'>('A');
  const [stand1Dir, setStand1Dir] = useState<'forward' | 'backward'>('forward');
  const [stand2Dir, setStand2Dir] = useState<'forward' | 'backward'>('forward');
  
  const [rollResult, setRollResult] = useState<{
    value: string;
    stand1: number;
    stand2: number;
  } | null>(null);

  const displayResult = rollResult || (roundRoll ? {
    value: roundRoll.value,
    stand1: roundRoll.stand1 ?? 0,
    stand2: roundRoll.stand2 ?? 0,
  } : null);

  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<{ success: boolean; msg: string } | null>(null);

  // Calculate Stand บน (Stand 1) and Stand ล่าง (Stand 2) previous totals
  const getPrevStandPositions = () => {
    // 1. Calculate local fallback from historical rolls first
    const ROUND_ORDER = ["Trial", ...Array.from({ length: 25 }, (_, i) => `Round ${i + 1}`)];
    const currentIndex = ROUND_ORDER.indexOf(currentRound);
    
    let localPrevS1 = 0;
    let localPrevS2 = 0;
    
    const stepRule = (val: number) => {
      if (val === 4) return 8;
      if (val === 8) return 4;
      return val;
    };
    
    if (currentIndex > 0) {
      for (let i = 0; i < currentIndex; i++) {
        const rName = ROUND_ORDER[i];
        const match = rolls.find((r) => r.user === player.name && r.round === rName);
        if (match) {
          localPrevS1 = stepRule(localPrevS1 + (match.stand1 ?? 0));
          localPrevS2 = stepRule(localPrevS2 + (match.stand2 ?? 0));
        }
      }
    }

    // 2. Try to calculate from summaryRows directly if available (most robust, handles custom formatting & duplicate tables)
    if (summaryRows && summaryRows.length > 3) {
      // Helper to normalize Baan name (same as Google Sheet)
      const normalizeLocalBaan = (nameStr: string) => {
        if (!nameStr) return "";
        let s = String(nameStr).trim();
        s = s.replace("บ้าน", "Baan");
        s = s.replace(/\s+/g, " ");
        s = s.replace(/Baan\s*(\d+)/i, "Baan $1");
        return s;
      };

      const normalizedPlayerName = normalizeLocalBaan(player.name);

      // Find the player's row in summaryRows (matching Column A - index 0)
      let playerRowIndex = -1;
      for (let i = 3; i < summaryRows.length; i++) {
        const rawName = summaryRows[i][0];
        if (rawName && normalizeLocalBaan(rawName) === normalizedPlayerName) {
          playerRowIndex = i;
          // Note: we don't break - this gets the LAST match row, supporting duplicate tables / Group 2 perfectly!
        }
      }

      if (playerRowIndex !== -1) {
        const row = summaryRows[playerRowIndex];
        let pS1 = 0;
        let pS2 = 0;
        
        // Helper to compute 1-based column indices for any round
        const getColumnsForRoundIndex = (r: number) => {
          if (r === 0) {
            return {
              stand1Col: 2,
              stand1PosCol: 3,
              stand2Col: 4,
              stand2PosCol: 5
            };
          }
          let col = 7;
          for (let i = 2; i <= r; i++) {
            if (i % 2 === 0) {
              col += 7;
            } else {
              col += 5;
            }
          }
          return {
            stand1Col: col,
            stand1PosCol: col + 1,
            specialCol: col + 2,
            stand2Col: col + 3,
            stand2PosCol: col + 4
          };
        };

        if (currentIndex >= 1) {
          const targetPrevRound = currentIndex - 1;
          for (let rIdx = targetPrevRound; rIdx >= 0; rIdx--) {
            let s1Val = 0;
            let s2Val = 0;
            
            if (rIdx === 0) {
              // Trial: Column indices 1 and 3
              s1Val = parseFloat(row[1]) || 0;
              s2Val = parseFloat(row[3]) || 0;
              s1Val = stepRule(s1Val);
              s2Val = stepRule(s2Val);
            } else {
              // Round rIdx: using the dynamic 6-column repeating mapping
              const cols = getColumnsForRoundIndex(rIdx);
              s1Val = parseFloat(row[cols.stand1PosCol - 1]) || 0;
              s2Val = parseFloat(row[cols.stand2PosCol - 1]) || 0;
            }

            if (pS1 === 0 && s1Val !== 0) {
              pS1 = s1Val;
            }
            if (pS2 === 0 && s2Val !== 0) {
              pS2 = s2Val;
            }
            if (pS1 !== 0 && pS2 !== 0) {
              break;
            }
          }
        }
        
        return {
          prevStand1: pS1,
          prevStand2: pS2
        };
      }
    }

    // 3. Fallback to standPositionsFromSheet (the older sheet endpoint) as backup
    if (standPositionsFromSheet) {
      const nameKey = player.name; // "Baan 16"
      const idKey = player.id; // "baan-12"
      const normalizedKey = player.id ? player.id.replace('baan-', 'Baan ') : ''; // "Baan 12"
      
      const match = standPositionsFromSheet[nameKey] || 
                    standPositionsFromSheet[idKey] || 
                    standPositionsFromSheet[normalizedKey] ||
                    standPositionsFromSheet[player.name.replace("บ้าน ", "Baan ")];
      
      if (match) {
        const s1 = (match.stand1 === 0 && localPrevS1 !== 0) ? localPrevS1 : match.stand1;
        const s2 = (match.stand2 === 0 && localPrevS2 !== 0) ? localPrevS2 : match.stand2;
        return {
          prevStand1: s1,
          prevStand2: s2
        };
      }
    }

    return { prevStand1: localPrevS1, prevStand2: localPrevS2 };
  };

  const { prevStand1, prevStand2 } = getPrevStandPositions();

  const handleRollComplete = (die1: number, die2: number) => {
    setPendingRoll({ die1, die2 });
    setStand1Die('A');
    setStand1Dir('forward');
    setStand2Dir('forward');
    setRollResult(null); // clear old result log
    setIsRolling(false);
  };

  const handleConfirmAssignment = async () => {
    if (alreadyConfirmed) return;
    if (!pendingRoll) return;

    const { die1, die2 } = pendingRoll;
    const s1Val = stand1Die === 'A' ? die1 : die2;
    const s2Val = stand1Die === 'A' ? die2 : die1;

    const stand1Signed = stand1Dir === 'forward' ? s1Val : -s1Val;
    const stand2Signed = stand2Dir === 'forward' ? s2Val : -s2Val;

    const valueStr = `Stand บน: ${stand1Dir === 'forward' ? '+' : '-'}${s1Val} | Stand ล่าง: ${stand2Dir === 'forward' ? '+' : '-'}${s2Val}`;
    const beforeSq = player.currentSquare;
    const finalSq = player.currentSquare;

    // Record local display choice
    setRollResult({
      value: valueStr,
      stand1: stand1Signed,
      stand2: stand2Signed,
    });

    // Reset choices state
    setPendingRoll(null);

    // Call state update callback
    onRollComplete(valueStr, stand1Signed, stand2Signed, beforeSq, finalSq);

    // Sync to Google Sheet Apps Script if integrated
    if (sheetConfig.appsScriptUrl) {
      setSyncing(true);
      setSyncResult(null);
      const ok = await syncRollToGoogleSheet(sheetConfig, {
        baan: player.name,
        value: valueStr,
        stand1: stand1Signed,
        stand2: stand2Signed,
        squareBefore: beforeSq,
        squareAfter: finalSq,
      }, currentRound);

      setSyncing(false);
      if (ok) {
        setSyncResult({ success: true, msg: 'Saved to Google Sheet!' });
      } else {
        setSyncResult({ success: false, msg: 'Saved locally. Sheet connection failing.' });
      }
    }
  };

  const getRecentRolls = () => {
    return rolls
      .filter((r) => r.user === player.name)
      .slice(-3)
      .reverse();
  };

  const myColor = BAAN_COLORS[player.id] || { bg: 'bg-indigo-600', text: 'text-white' };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-8">
      {/* Centered Identity Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-xl mx-auto mb-10 text-center bg-white border border-slate-200 p-8 rounded-2xl shadow-sm relative overflow-hidden"
      >
        <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-1 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg inline-block mb-4">
          Session Identity
        </span>
        
        {/* Satisfies the custom centering requirement exactly */}
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight mb-2">
          You are <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent underline decoration-purple-400 decoration-wavy underline-offset-4">"{player.name}"</span>
        </h2>
        
        <p className="text-sm text-slate-500 max-w-md mx-auto font-sans">
          Welcome back to the team dashboard. You can start rolling now to update Vercel servers and Google Sheets.
        </p>
      </motion.div>

      {/* Main Column: Controls & Logs (Centered) */}
      <div className="max-w-xl mx-auto space-y-6">
        {/* Section A: Dice Roller Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h3 className="font-display font-bold text-base text-slate-900 mb-4 flex items-center gap-2 justify-center">
            <Dices className="w-5 h-5 text-blue-600" />
            <span>Roll Your Dice</span>
          </h3>

          <DiceRoller
            onRollComplete={handleRollComplete}
            isRolling={isRolling}
            setIsRolling={setIsRolling}
            disabled={isRolling || !!pendingRoll || alreadyConfirmed}
          />

          {alreadyConfirmed && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-center space-y-1">
              <div className="font-extrabold text-xs uppercase tracking-wider text-amber-800 flex items-center justify-center gap-1.5">
                <span>🔒 Choice Locked ({currentRound})</span>
              </div>
              <p className="text-[11px] text-amber-700 font-medium">
                You have already confirmed your allocation for this round. Your choices cannot be changed.
              </p>
            </div>
          )}

          {/* New Stand Choice Option block */}
          <AnimatePresence>
          {/* Interactive Stand Allocation & Direction Selection */}
          <AnimatePresence>
            {pendingRoll && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-6 pt-5 border-t border-slate-100 space-y-5"
              >
                <div className="text-center">
                  <span className="text-[11px] font-mono uppercase bg-slate-100 text-slate-600 font-bold tracking-wider py-1 px-3 rounded-full border border-slate-200">
                    Allocate Dice & Select Directions
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Stand บน Container */}
                  <div
                    id="stand_1_config_box"
                    className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-4 relative"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase font-mono font-bold tracking-widest text-indigo-600">Stand บน</span>
                    </div>

                    {/* Die Value Selection in Box 1 */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase font-mono font-bold text-slate-400 block">เลือกแต้มลูกเต๋า</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id="s1_die_a_btn"
                          onClick={() => setStand1Die('A')}
                          className={`py-2 px-3 rounded-xl border font-bold text-sm transition-all flex flex-col items-center justify-center ${
                            stand1Die === 'A'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-mono opacity-80 tracking-tight">Die A</span>
                          <span className="text-base font-display font-black">{pendingRoll.die1}</span>
                        </button>
                        <button
                          type="button"
                          id="s1_die_b_btn"
                          onClick={() => setStand1Die('B')}
                          className={`py-2 px-3 rounded-xl border font-bold text-sm transition-all flex flex-col items-center justify-center ${
                            stand1Die === 'B'
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-mono opacity-80 tracking-tight">Die B</span>
                          <span className="text-base font-display font-black">{pendingRoll.die2}</span>
                        </button>
                      </div>
                    </div>

                    {/* Direction Selection in Box 1 */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase font-mono font-bold text-slate-400 block">Choose Direction</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id="s1_forward_btn"
                          onClick={() => setStand1Dir('forward')}
                          className={`py-1.5 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
                            stand1Dir === 'forward'
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-250 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Forward (+)
                        </button>
                        <button
                          type="button"
                          id="s1_backward_btn"
                          onClick={() => setStand1Dir('backward')}
                          className={`py-1.5 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
                            stand1Dir === 'backward'
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-250 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Backward (-)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Stand ล่าง Container */}
                  <div
                    id="stand_2_config_box"
                    className="p-5 rounded-2xl border-2 border-slate-200 bg-slate-50/50 space-y-4 relative"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-xs uppercase font-mono font-bold tracking-widest text-emerald-600">Stand ล่าง</span>
                    </div>

                    {/* Die Value Selection in Box 2 */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase font-mono font-bold text-slate-400 block">เลือกแต้มลูกเต๋า</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id="s2_die_a_btn"
                          onClick={() => setStand1Die('B')}
                          className={`py-2 px-3 rounded-xl border font-bold text-sm transition-all flex flex-col items-center justify-center ${
                            stand1Die === 'B'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-mono opacity-80 tracking-tight">Die A</span>
                          <span className="text-base font-display font-black">{pendingRoll.die1}</span>
                        </button>
                        <button
                          type="button"
                          id="s2_die_b_btn"
                          onClick={() => setStand1Die('A')}
                          className={`py-2 px-3 rounded-xl border font-bold text-sm transition-all flex flex-col items-center justify-center ${
                            stand1Die === 'A'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <span className="text-[9px] uppercase font-mono opacity-80 tracking-tight">Die B</span>
                          <span className="text-base font-display font-black">{pendingRoll.die2}</span>
                        </button>
                      </div>
                    </div>

                    {/* Direction Selection in Box 2 */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] uppercase font-mono font-bold text-slate-400 block">Choose Direction</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          id="s2_forward_btn"
                          onClick={() => setStand2Dir('forward')}
                          className={`py-1.5 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
                            stand2Dir === 'forward'
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-250 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Forward (+)
                        </button>
                        <button
                          type="button"
                          id="s2_backward_btn"
                          onClick={() => setStand2Dir('backward')}
                          className={`py-1.5 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all ${
                            stand2Dir === 'backward'
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-250 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          Backward (-)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submitting with explicit direction values */}
                {(() => {
                  const s1Val = stand1Die === 'A' ? pendingRoll.die1 : pendingRoll.die2;
                  const s2Val = stand1Die === 'B' ? pendingRoll.die1 : pendingRoll.die2;
                  const stand1Signed = stand1Dir === 'forward' ? s1Val : -s1Val;
                  const stand2Signed = stand2Dir === 'forward' ? s2Val : -s2Val;
                  const nextStand1Pos = prevStand1 + stand1Signed;
                  const nextStand2Pos = prevStand2 + stand2Signed;
                  
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl text-center text-xs font-mono">
                      สรุป: &nbsp;
                      <span className="text-indigo-300 font-bold block sm:inline">
                        Stand บน: {stand1Dir === 'forward' ? '+' : '-'}{s1Val}
                      </span>
                      <span className="hidden sm:inline"> &nbsp; | &nbsp; </span>
                      <span className="text-emerald-300 font-bold block sm:inline">
                        Stand ล่าง: {stand2Dir === 'forward' ? '+' : '-'}{s2Val}
                      </span>
                    </div>
                  );
                })()}

                <div className="mt-4">
                  <button
                    id="confirm_assignment_btn"
                    onClick={handleConfirmAssignment}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>Confirm Allocation & Submit Move</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </AnimatePresence>

          {/* Syncing/Connection State */}
          {sheetConfig.appsScriptUrl && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
              <span>Google Sheet Mode:</span>
              {syncing ? (
                <span className="flex items-center gap-1 text-blue-600 font-semibold">
                  <span className="w-2.5 h-2.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                  Syncing...
                </span>
              ) : syncResult ? (
                <span className={`flex items-center gap-1 font-semibold ${
                  syncResult.success ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  <CheckCircle className="w-3.5 h-3.5" />
                  {syncResult.msg}
                </span>
              ) : (
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Active Bridge Connected
                </span>
              )}
            </div>
          )}
        </div>

        {/* Section B: Roll Results Animating feedback */}
        <AnimatePresence>
          {displayResult && (
            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              className="bg-slate-950 text-white rounded-xl p-5 border-2 border-slate-900 overflow-hidden relative shadow-md"
            >
              <div className="absolute top-3 right-4 text-[10px] font-mono font-bold uppercase text-slate-500">
                {alreadyConfirmed ? "Choice Locked" : "Current Stand Values"}
              </div>

              <div className="text-left mt-1">
                <div className="text-slate-400 text-xs font-mono mb-2">
                  {alreadyConfirmed ? `Confirmed Allocation for ${currentRound}:` : "Confirmed Stand Allocation:"}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Stand บน</span>
                    <span className="font-display font-black text-2xl text-indigo-400">
                      {displayResult.stand1 > 0 ? `+${displayResult.stand1}` : displayResult.stand1}
                    </span>
                  </div>
                  <div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                    <span className="text-[10px] font-mono text-slate-500 block uppercase mb-1">Stand ล่าง</span>
                    <span className="font-display font-black text-2xl text-emerald-400">
                      {displayResult.stand2 > 0 ? `+${displayResult.stand2}` : displayResult.stand2}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>


      </div>
    </div>
  );
}
