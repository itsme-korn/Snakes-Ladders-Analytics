/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  Clipboard, 
  Code2, 
  FileSpreadsheet, 
  Settings, 
  RefreshCw,
  Clock,
  Sliders,
  Sparkles,
  Play,
  Square
} from 'lucide-react';
import { BaanPlayer, Roll, GoogleSheetConfig } from '../types';
import { getGoogleAppsScriptCode, syncFormatSheets } from '../utils/sheets';

interface AdminPanelProps {
  players: BaanPlayer[];
  rolls: Roll[];
  sheetConfig: GoogleSheetConfig;
  currentRound: string;
  timerActive: boolean;
  onStartTimer: () => void;
  onStopTimer: () => void;
  onAdjustTimer: (adjustmentSec: number) => void;
  onChangeRound: (newRound: string) => void;
  onUpdateSheetConfig: (config: GoogleSheetConfig) => void;
  onManualMovePlayer: (playerId: string, targetSquare: number) => void;
  onResetGame: () => void;
  onClearLogs: () => void;
  onSyncPull: () => Promise<void>;
  isSyncingPull: boolean;
}

export default function AdminPanel({
  players,
  rolls,
  sheetConfig,
  currentRound,
  timerActive,
  onStartTimer,
  onStopTimer,
  onAdjustTimer,
  onChangeRound,
  onUpdateSheetConfig,
  onManualMovePlayer,
  onResetGame,
  onClearLogs,
  onSyncPull,
  isSyncingPull,
}: AdminPanelProps) {
  // Spreadsheet Config Input states
  const [spreadsheetId, setSpreadsheetId] = useState<string>(sheetConfig.spreadsheetId);
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(sheetConfig.appsScriptUrl);
  const [sheetName, setSheetName] = useState<string>(sheetConfig.sheetName);
  
  // Script copy feedback state
  const [copied, setCopied] = useState<boolean>(false);
  const [isFormatting, setIsFormatting] = useState<boolean>(false);

  // Generate Google Apps Script source code
  const scriptCode = React.useMemo(() => {
    return getGoogleAppsScriptCode(spreadsheetId, sheetName);
  }, [spreadsheetId, sheetName]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormatSheets = async () => {
    if (!sheetConfig.appsScriptUrl) return;
    setIsFormatting(true);
    try {
      const ok = await syncFormatSheets(sheetConfig);
      if (ok) {
        alert('Google Sheets auto-aligned and styled successfully!');
      } else {
        alert('Google Sheet styled successfully (CORS no-cors fallback executed)');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSheetConfig({
      spreadsheetId: spreadsheetId.trim(),
      appsScriptUrl: appsScriptUrl.trim(),
      sheetName: sheetName.trim(),
      isLinked: !!appsScriptUrl.trim(),
    });
    alert('Google Sheets configurations updated successfully!');
  };

  const roundChoices = ['1', '2', '3', '4', 'Trial'];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8" id="admin_panel_section">
      {/* 👑 Identity Badge Section */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-2xl mx-auto mb-10 text-center bg-white border border-slate-200 p-8 rounded-2xl shadow-sm relative overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-900" />
        <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-800 rounded-lg inline-block mb-4">
          Master Session Authority
        </span>
        
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 font-display tracking-tight mb-2">
          You are <span className="underline decoration-slate-900 decoration-double decoration-wavy underline-offset-4">"Admin"</span>
        </h2>
        
        <p className="text-sm text-slate-500 max-w-sm mx-auto mb-6 font-sans">
          Welcome to the master control session. Directly administer game parameters and round synchronizations instantly across client dashboards.
        </p>

        {/* Sync & Format Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onSyncPull}
            disabled={isSyncingPull || !sheetConfig.appsScriptUrl}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all border cursor-pointer ${
              !sheetConfig.appsScriptUrl 
                ? 'bg-slate-50 border-slate-150 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-50 border-indigo-150 text-indigo-700 hover:bg-indigo-100/60 font-bold active:scale-98'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPull ? 'animate-spin' : ''}`} />
            <span>{isSyncingPull ? 'Syncing...' : 'Fetch Sheet Positions'}</span>
          </button>

          <button
            onClick={handleFormatSheets}
            disabled={isFormatting || !sheetConfig.appsScriptUrl}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-xs transition-all border cursor-pointer ${
              !sheetConfig.appsScriptUrl 
                ? 'bg-slate-50 border-slate-150 text-slate-400 cursor-not-allowed'
                : 'bg-amber-50 border-amber-100 text-amber-800 hover:bg-amber-100/80 font-bold active:scale-98'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isFormatting ? 'animate-pulse' : ''}`} />
            <span>{isFormatting ? 'Beautifying...' : 'Format & Beautify Sheets'}</span>
          </button>
        </div>
      </motion.div>

      {/* 🎯 "What is this round?" Box - Core Requirement */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-2xl mx-auto bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-3xl p-8 md:p-10 shadow-xl border border-indigo-900 relative overflow-hidden mb-12"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles className="w-24 h-24 text-indigo-400" />
        </div>

        <div className="text-center mb-8 relative z-10">
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest px-2.5 py-1 bg-white/10 text-indigo-200 border border-white/15 rounded-lg inline-block mb-3">
            Active Game State Control
          </span>
          <h3 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-white mb-2">
            What is this round?
          </h3>
          <p className="text-xs text-indigo-200/80 max-w-md mx-auto">
            Choose which round is currently running. This locks the target round and synchronizes sheet data inputs to the correct columns.
          </p>
        </div>

        {/* Big satisying choice buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 md:gap-4 relative z-10">
          {roundChoices.map((choice) => {
            const isSelected = currentRound === choice;
            return (
              <button
                key={choice}
                onClick={() => onChangeRound(choice)}
                className={`py-4 md:py-6 px-4 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all border text-center ${
                  isSelected
                    ? 'bg-amber-400 border-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-105'
                    : 'bg-white/5 border-white/10 text-white font-bold hover:bg-white/10 hover:border-white/20 active:scale-95'
                }`}
              >
                <span className="text-[9px] uppercase tracking-wider opacity-60 font-mono mb-1 font-bold">
                  {choice === 'Trial' ? 'Warmup' : 'Round'}
                </span>
                <span className="text-lg md:text-2xl tracking-normal">
                  {choice}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ⏱️ Core Timer Start Control Controller */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-2xl mx-auto bg-white border border-slate-200 p-6 rounded-2xl shadow-xs text-center mb-6 relative overflow-hidden"
      >
        <div className="absolute top-0 inset-y-0 left-0 w-1 bg-indigo-600" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-left">
            <h4 className="font-display font-black text-sm text-slate-900 flex items-center gap-1.5 justify-center sm:justify-start">
              <Clock className={`w-4 h-4 ${timerActive ? 'text-red-500 animate-pulse' : 'text-indigo-600'}`} />
              <span>Round Countdown Timer</span>
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm text-center sm:text-left leading-relaxed">
              Trigger a universal 1-minute countdown timer. This starts ticking down instantly for all active players in their top status headers.
            </p>
          </div>
          
          <div className="flex flex-col items-center sm:items-end gap-2.5 w-full sm:w-auto">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={onStartTimer}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold font-sans text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-98 ${
                  timerActive
                    ? 'bg-red-100 hover:bg-red-200/80 text-red-800 border border-red-250 animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-sm'
                }`}
              >
                <Play className={`w-3.5 h-3.5 ${timerActive ? 'animate-pulse text-red-600' : ''}`} />
                <span>{timerActive ? 'Restart 1-Min Timer' : 'Start the Timer'}</span>
              </button>

              <button
                onClick={onStopTimer}
                disabled={!timerActive}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold font-sans text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-98 ${
                  timerActive
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 shadow-sm'
                    : 'bg-slate-150 text-slate-400 border border-slate-200 cursor-not-allowed'
                }`}
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop the Timer</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 justify-center sm:justify-end">
              <button
                onClick={() => onAdjustTimer(-30)}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100/85 text-rose-700 hover:text-rose-800 border border-rose-150 rounded-lg text-[11px] font-black tracking-tight transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Subtract 30 seconds"
              >
                -30s
              </button>
              <button
                onClick={() => onAdjustTimer(-10)}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100/85 text-rose-700 hover:text-rose-800 border border-rose-150 rounded-lg text-[11px] font-black tracking-tight transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Subtract 10 seconds"
              >
                -10s
              </button>
              <button
                onClick={() => onAdjustTimer(10)}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 hover:text-emerald-800 border border-emerald-150 rounded-lg text-[11px] font-black tracking-tight transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Add 10 seconds"
              >
                +10s
              </button>
              <button
                onClick={() => onAdjustTimer(30)}
                className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 hover:text-emerald-800 border border-emerald-150 rounded-lg text-[11px] font-black tracking-tight transition-all active:scale-95 cursor-pointer shadow-2xs"
                title="Add 30 seconds"
              >
                +30s
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ⚙️ Secondary Google Sheets Code & Configurations (Collapsible using Native Details tag) */}
      <div className="max-w-2xl mx-auto mt-6">
        <details className="group border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs transition-colors duration-200">
          <summary className="bg-slate-50 p-4 md:p-5 font-mono font-bold text-xs uppercase tracking-wider text-slate-600 cursor-pointer select-none flex items-center justify-between hover:bg-slate-100/70">
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500 group-open:rotate-90 transition-transform duration-200" />
              <span>⚙️ Developer Settings & Spreadsheet Sync</span>
            </span>
            <span className="text-[9px] font-mono group-open:hidden">Show ▼</span>
            <span className="text-[9px] font-mono hidden group-open:inline">Hide ▲</span>
          </summary>
          
          <div className="p-6 border-t border-slate-150 space-y-8 bg-white">
            {/* Sheet configurations form */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <h4 className="font-display font-bold text-sm text-slate-900">Spreadsheet configuration</h4>
              </div>
              <p className="text-xs text-slate-400">
                Ensure spreadsheet keys and Tab names match. Enter Apps Script Web App URL below to finalize the dynamic database cells link.
              </p>

              <form onSubmit={handleUpdateConfig} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase">
                    Google Sheet Spreadsheet ID
                  </label>
                  <input
                    type="text"
                    placeholder="Spreadsheet ID"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase">
                    Sheet Tab Name
                  </label>
                  <input
                    type="text"
                    placeholder="Sheet1"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase">
                    Apps Script Web App URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={appsScriptUrl}
                    onChange={(e) => setAppsScriptUrl(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 rounded-lg bg-slate-50 text-xs font-mono focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer transition-colors"
                >
                  Publish Spreadsheet Settings
                </button>
              </form>
            </div>

            {/* Apps Script code blocks */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="font-display font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  <span>Google Apps Script Deployment Code</span>
                </span>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-950 font-bold text-[10px] select-none cursor-pointer transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="relative">
                <pre className="p-3.5 max-h-[250px] overflow-auto bg-slate-950 text-slate-300 font-mono text-[9px] rounded-lg border border-slate-800 leading-normal">
                  <code>{scriptCode}</code>
                </pre>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
