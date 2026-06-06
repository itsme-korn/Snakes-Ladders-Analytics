/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BaanPlayer, BoardElement } from '../types';
import { BOARD_ELEMENTS } from '../utils/sheets';
import { ArrowUp, Play } from 'lucide-react';

interface BoardProps {
  players: BaanPlayer[];
  onPlayerClick?: (player: BaanPlayer) => void;
  activeBaanId?: string | null;
}

// Colors for the 12 Baans to make them easily distinguishable on the board
export const BAAN_COLORS: { [key: string]: { bg: string; text: string; border: string; accent: string } } = {
  'baan-1': { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-700', accent: '#10b981' },
  'baan-2': { bg: 'bg-violet-500', text: 'text-white', border: 'border-violet-700', accent: '#8b5cf6' },
  'baan-3': { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-700', accent: '#f59e0b' },
  'baan-4': { bg: 'bg-pink-500', text: 'text-white', border: 'border-pink-700', accent: '#ec4899' },
  'baan-5': { bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-700', accent: '#06b6d4' },
  'baan-6': { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-700', accent: '#f43f5e' },
  'baan-7': { bg: 'bg-indigo-500', text: 'text-white', border: 'border-indigo-700', accent: '#6366f1' },
  'baan-8': { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-700', accent: '#f97316' },
  'baan-9': { bg: 'bg-teal-500', text: 'text-white', border: 'border-teal-700', accent: '#14b8a6' },
  'baan-10': { bg: 'bg-purple-500', text: 'text-white', border: 'border-purple-700', accent: '#a855f7' },
  'baan-11': { bg: 'bg-lime-500', text: 'text-slate-900', border: 'border-lime-700', accent: '#84cc16' },
  'baan-12': { bg: 'bg-fuchsia-500', text: 'text-white', border: 'border-fuchsia-700', accent: '#d946ef' },
};

export const getBaanInitial = (name: string): string => {
  const parts = name.split(' ');
  if (parts.length > 1) {
    return `B${parts[1]}`;
  }
  return name.substring(0, 2).toUpperCase();
};

export default function Board({ players, onPlayerClick, activeBaanId }: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to obtain square row/col in boustrophedon layout
  // r is row (0 at bottom, 9 at top)
  // c is col (0 at left, 9 at right)
  const getSquareCoords = (square: number) => {
    const zeroBased = square - 1;
    const r = Math.floor(zeroBased / 10);
    const colRemainder = zeroBased % 10;
    const c = r % 2 === 0 ? colRemainder : 9 - colRemainder;
    return { r, c };
  };

  // Helper to calculate center percentage of any square (used to draw dynamic responsive SVGs)
  const getSquareCenterPercent = (square: number) => {
    const { r, c } = getSquareCoords(square);
    // Center point in grid cell
    const x = (c + 0.5) * 10;
    const y = (9 - r + 0.5) * 10; // SVG 0,0 is top-left, so we flip row
    return { x, y };
  };

  // Map players to their current positions
  const playersBySquare = useMemo(() => {
    const map: { [key: number]: BaanPlayer[] } = {};
    for (let i = 1; i <= 100; i++) {
      map[i] = [];
    }
    players.forEach((p) => {
      const sq = Math.min(100, Math.max(1, p.currentSquare));
      if (!map[sq]) map[sq] = [];
      map[sq].push(p);
    });
    return map;
  }, [players]);

  // Construct a list of cells from top-left of the visual grid (Square 100 to 91 in row 9) to bottom-left (1 to 10 in row 0)
  const cells = useMemo(() => {
    const grid: number[] = [];
    // We visualize row 9 down to row 0, and column 0 to 9 within each row
    for (let r = 9; r >= 0; r--) {
      for (let c = 0; c < 10; c++) {
        const rowIsEven = r % 2 === 0;
        const squareNum = rowIsEven ? r * 10 + c + 1 : r * 10 + (9 - c) + 1;
        grid.push(squareNum);
      }
    }
    return grid;
  }, []);

  return (
    <div className="flex flex-col items-center w-full max-w-2xl mx-auto" id="snakes_snakes_board">
      {/* Board Title Card */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>S&L Interactive Arena Board</span>
        </div>
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-indigo-500 inline-block"></span> Ladder
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-rose-500 inline-block"></span> Snake
          </span>
        </div>
      </div>

      {/* Main Board Container */}
      <div
        ref={containerRef}
        className="relative w-full aspect-square bg-slate-950 border-4 border-slate-900 rounded-xl overflow-hidden shadow-2xl p-1 select-none"
      >
        {/* SVG Drawing Layer for Snakes and Ladders */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* Custom SVG Defs for Gradients and Markers */}
          <defs>
            <linearGradient id="ladder-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="snake-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fda4af" stopOpacity="0.6" />
            </linearGradient>
            <marker id="snake-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <circle cx="5" cy="5" r="4" fill="#f43f5e" />
              <circle cx="5" cy="5" r="2" fill="#fff" />
            </marker>
          </defs>

          {/* Render Ladders */}
          {BOARD_ELEMENTS.filter((e) => e.type === 'ladder').map((l) => {
            const fromPt = getSquareCenterPercent(l.from);
            const toPt = getSquareCenterPercent(l.to);

            // Calculate offset parallel paths to make a realistic ladder look
            const dx = toPt.x - fromPt.x;
            const dy = toPt.y - fromPt.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const ux = -dy / length; // perpendicular unit vector
            const uy = dx / length;
            const separation = 0.8; // ladder width

            const l1x1 = fromPt.x - ux * separation;
            const l1y1 = fromPt.y - uy * separation;
            const l1x2 = toPt.x - ux * separation;
            const l1y2 = toPt.y - uy * separation;

            const l2x1 = fromPt.x + ux * separation;
            const l2y1 = fromPt.y + uy * separation;
            const l2x2 = toPt.x + ux * separation;
            const l2y2 = toPt.y + uy * separation;

            // Generate rungs
            const rungsCount = Math.max(3, Math.floor(length / 4));
            const rungs = [];
            for (let i = 1; i < rungsCount; i++) {
              const t = i / rungsCount;
              const rx1 = fromPt.x - ux * separation + dx * t;
              const ry1 = fromPt.y - uy * separation + dy * t;
              const rx2 = fromPt.x + ux * separation + dx * t;
              const ry2 = fromPt.y + uy * separation + dy * t;
              rungs.push(<line key={i} x1={rx1} y1={ry1} x2={rx2} y2={ry2} stroke="#34d399" strokeWidth="0.3" strokeOpacity="0.7" />);
            }

            return (
              <g key={l.id} className="opacity-70 hover:opacity-100 transition-opacity duration-300">
                {/* Visual Ladder Rail left */}
                <line x1={l1x1} y1={l1y1} x2={l1x2} y2={l1y2} stroke="url(#ladder-grad)" strokeWidth="0.5" />
                {/* Visual Ladder Rail right */}
                <line x1={l2x1} y1={l2y1} x2={l2x2} y2={l2x2} stroke="url(#ladder-grad)" strokeWidth="0.5" />
                {/* Rungs */}
                {rungs}
                {/* Anchor Circles */}
                <circle cx={fromPt.x} cy={fromPt.y} r="0.7" fill="#10b981" />
                <circle cx={toPt.x} cy={toPt.y} r="0.7" fill="#10b981" />
              </g>
            );
          })}

          {/* Render Snakes */}
          {BOARD_ELEMENTS.filter((e) => e.type === 'snake').map((s) => {
            const headPt = getSquareCenterPercent(s.from); // Snake starts at higher, falls back
            const tailPt = getSquareCenterPercent(s.to);

            const dx = tailPt.x - headPt.x;
            const dy = tailPt.y - headPt.y;

            // Draw beautiful curved snakes using cubic bezier pathways to wiggle!
            // Control points pull away to create a pleasant wavy serpent curve
            const cx1 = headPt.x + dx * 0.25 + dy * 0.15;
            const cy1 = headPt.y + dy * 0.25 - dx * 0.15;
            const cx2 = headPt.x + dx * 0.75 - dy * 0.15;
            const cy2 = headPt.y + dy * 0.75 + dx * 0.15;

            const pathData = `M ${headPt.x} ${headPt.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${tailPt.x} ${tailPt.y}`;

            return (
              <g key={s.id} className="opacity-70 hover:opacity-100 transition-opacity duration-300">
                {/* Subtle outer glow effect for snake */}
                <path d={pathData} fill="none" stroke="#f43f5e" strokeWidth="1.2" strokeOpacity="0.25" strokeLinecap="round" />
                {/* Inner snake body */}
                <path d={pathData} fill="none" stroke="url(#snake-grad)" strokeWidth="0.7" strokeLinecap="round" markerStart="url(#snake-head)" />
                {/* Tail marker */}
                <circle cx={tailPt.x} cy={tailPt.y} r="0.6" fill="#ef4444" />
              </g>
            );
          })}
        </svg>

        {/* 10x10 Grid View */}
        <div className="grid grid-cols-10 grid-rows-10 h-full w-full relative z-20">
          {cells.map((squareNum) => {
            const { r } = getSquareCoords(squareNum);
            const bgClass =
              squareNum % 2 === 0
                ? 'bg-slate-900/90 text-slate-300'
                : 'bg-slate-950/90 text-slate-400';

            const activePlayers = playersBySquare[squareNum] || [];

            // Distinct highlighted background for active player's square or Special triggers
            const isSpecialCell = BOARD_ELEMENTS.some((el) => el.from === squareNum);
            const isDestinationCell = BOARD_ELEMENTS.some((el) => el.to === squareNum);

            let borderStyle = 'border-slate-800/60';
            if (isSpecialCell) {
              const type = BOARD_ELEMENTS.find((el) => el.from === squareNum)?.type;
              borderStyle = type === 'ladder' ? 'border-emerald-500/20' : 'border-rose-500/20';
            }

            return (
              <div
                key={squareNum}
                className={`board-cell border flex flex-col justify-between p-1 transition-all ${bgClass} ${borderStyle}`}
                title={`Square ${squareNum}`}
              >
                {/* Square Number Label */}
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-mono leading-none ${
                    squareNum === 100 
                      ? 'text-amber-400 font-bold scale-110' 
                      : squareNum === 1 
                      ? 'text-emerald-400 font-bold scale-110' 
                      : 'text-slate-500'
                  }`}>
                    {squareNum === 100 ? '👑 100' : squareNum === 1 ? 'Start' : squareNum}
                  </span>

                  {/* Little special indicators */}
                  {isSpecialCell && (
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      BOARD_ELEMENTS.find((e) => e.from === squareNum)?.type === 'ladder' 
                        ? 'bg-emerald-500 animate-ping' 
                        : 'bg-rose-500 animate-pulse'
                    }`} />
                  )}
                </div>

                {/* Tokens Stack - clusters players inside */}
                <div className="h-6 flex flex-wrap gap-0.5 items-end justify-center overflow-visible">
                  <AnimatePresence>
                    {activePlayers.map((p) => {
                      const colorInfo = BAAN_COLORS[p.id] || { bg: 'bg-indigo-500', text: 'text-white' };
                      const isActive = p.id === activeBaanId;

                      return (
                        <motion.button
                          key={p.id}
                          layoutId={`token-${p.id}`}
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ 
                            scale: isActive ? 1.2 : 1, 
                            opacity: 1,
                            z: isActive ? 50 : 10
                          }}
                          exit={{ scale: 0.4, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          onClick={() => onPlayerClick?.(p)}
                          className={`w-[13px] h-[13px] rounded-full flex items-center justify-center text-[7px] font-bold shadow-md cursor-pointer transition-transform hover:scale-135 truncate ${colorInfo.bg} ${colorInfo.text} ${
                            isActive ? 'ring-1 ring-white ring-offset-1 scale-125 animate-bounce' : ''
                          }`}
                          title={`${p.name} - Square ${p.currentSquare}`}
                        >
                          {p.id.replace('baan-', '')}
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Board Mini Legend / Quick Stats */}
      <div className="w-full mt-3 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300">
        <h4 className="font-medium text-slate-200 mb-1.5 font-display">Current Standings:</h4>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 text-[11px] font-mono">
          {players.map((p) => {
            const colorInfo = BAAN_COLORS[p.id] || { bg: 'bg-slate-700' };
            const isActive = p.id === activeBaanId;
            return (
              <div 
                key={p.id} 
                onClick={() => onPlayerClick?.(p)}
                className={`p-1 rounded flex items-center gap-1 cursor-pointer transition-colors ${
                  isActive ? 'bg-slate-800 text-amber-200 border border-slate-700' : 'hover:bg-slate-800/40'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${colorInfo.bg}`}></span>
                <span className="truncate max-w-[40px]">Baan {p.id.replace('baan-', '')}</span>
                <span className="ml-auto font-bold text-slate-400">#{p.currentSquare}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
