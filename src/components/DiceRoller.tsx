/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, useAnimation } from 'motion/react';
import { Sparkles } from 'lucide-react';

// @ts-ignore
import diceSound from '@/assets/Dice sound.mp3';

interface DiceRollerProps {
  onRollComplete: (die1: number, die2: number) => void;
  isRolling: boolean;
  setIsRolling: (val: boolean) => void;
  disabled?: boolean;
}

// Dice face definitions - pips matrix (active columns/rows)
const DICE_PIPS: { [key: number]: number[] } = {
  1: [4], // Center
  2: [0, 8], // Top-Left, Bottom-Right
  3: [0, 4, 8], // Slanted
  4: [0, 2, 6, 8], // Four Corners
  5: [0, 2, 4, 6, 8], // Four Corners + Center
  6: [0, 2, 3, 5, 6, 8], // Two Columns
  7: [0, 2, 3, 4, 5, 6, 8], // Two Columns + Center
  8: [0, 1, 2, 3, 5, 6, 7, 8], // Entire Outer Border
};

export default function DiceRoller({ onRollComplete, isRolling, setIsRolling, disabled }: DiceRollerProps) {
  const [die1, setDie1] = useState<number>(3);
  const [die2, setDie2] = useState<number>(4);
  
  const controls1 = useAnimation();
  const controls2 = useAnimation();

  const handleRoll = async () => {
    if (disabled || isRolling) return;

    setIsRolling(true);

    // Play rolling sound with multiple fallbacks
    try {
      const audioObj = new Audio(diceSound);
      audioObj.play().catch((err) => {
        console.warn('Primary audio failed, trying path fallback...', err);
        const fb1 = new Audio('/assets/Dice sound.mp3');
        fb1.play().catch((err2) => {
          console.warn('Path fallback failed, trying encoded fallback...', err2);
          const fb2 = new Audio('/assets/Dice%20sound.mp3');
          fb2.play().catch(err3 => console.error('All sound attempts failed', err3));
        });
      });
    } catch (soundErr) {
      console.error('Audio initialization failed:', soundErr);
    }

    // Dynamic rolling effect: quick cycles over 850 milliseconds
    const intervals = [60, 60, 80, 80, 100, 100, 120, 150];
    let step = 0;

    const cycleFace = () => {
      if (step < intervals.length) {
        setDie1(Math.floor(Math.random() * 8) + 1);
        setDie2(Math.floor(Math.random() * 8) + 1);
        setTimeout(cycleFace, intervals[step]);
        step++;
      } else {
        // Roll final result
        const final1 = Math.floor(Math.random() * 8) + 1;
        const final2 = Math.floor(Math.random() * 8) + 1;
        setDie1(final1);
        setDie2(final2);
        onRollComplete(final1, final2);
      }
    };

    // Spin or shake keyframes using motion for both dice
    controls1.start({
      rotate: [0, -35, 45, -90, 270, 360],
      scale: [1, 1.2, 0.85, 1.15, 0.9, 1],
      y: [0, -40, 15, -20, 5, 0],
      x: [0, -10, 15, -5, 2, 0],
      transition: { duration: 0.85, ease: 'easeInOut' },
    });

    controls2.start({
      rotate: [0, 45, -30, 120, -180, 0],
      scale: [1, 1.15, 0.9, 1.1, 0.95, 1],
      y: [0, -30, 8, -15, 3, 0],
      x: [0, 15, -10, 8, -3, 0],
      transition: { duration: 0.85, ease: 'easeInOut' },
    });

    cycleFace();
  };

  // Render dice pips for the current face
  const renderPips = (val: number) => {
    const activePips = DICE_PIPS[val] || [4];
    return (
      <div className="grid grid-cols-3 grid-rows-3 h-full w-full p-2.5 gap-1 bg-white rounded-2xl border-4 border-slate-900 shadow-inner">
        {Array.from({ length: 9 }).map((_, idx) => {
          const isActive = activePips.includes(idx);
          return (
            <div key={idx} className="flex items-center justify-center">
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-2.5 h-2.5 rounded-full bg-slate-900 shadow-sm"
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl max-w-md mx-auto shadow-sm">
      <div className="flex items-center justify-center gap-6 mb-6 relative">
        {/* Decorative Dice Shadows */}
        <div className="absolute -bottom-2 w-48 h-4 rounded-full bg-slate-300/50 blur-md"></div>

        {/* Dice 1 */}
        <motion.div
          animate={controls1}
          className="w-24 h-24 relative cursor-pointer active:scale-95"
          onClick={handleRoll}
          style={{ transformOrigin: 'center' }}
        >
          {renderPips(die1)}
        </motion.div>

        {/* Dice 2 */}
        <motion.div
          animate={controls2}
          className="w-24 h-24 relative cursor-pointer active:scale-95"
          onClick={handleRoll}
          style={{ transformOrigin: 'center' }}
        >
          {renderPips(die2)}
        </motion.div>
      </div>

      {/* Show individual values */}
      {!isRolling && (
        <div className="mb-4 text-center">
          <span className="text-xs font-mono uppercase text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full font-bold">
            Rolled: Die A: <span className="text-indigo-600 font-extrabold">{die1}</span> &nbsp;|&nbsp; Die B: <span className="text-indigo-600 font-extrabold">{die2}</span>
          </span>
        </div>
      )}

      {/* Trigger Buttons */}
      <button
        id="roll_dice_btn"
        onClick={handleRoll}
        disabled={disabled || isRolling}
        className={`w-full py-3.5 px-6 rounded-xl font-bold font-display shadow-md flex items-center justify-center gap-2 transition-all ${
          disabled || isRolling
            ? 'bg-slate-300 text-slate-500 cursor-not-allowed border-none shadow-none'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98] cursor-pointer'
        }`}
      >
        {isRolling ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Rolling Both...
          </span>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Roll 2 Dice!</span>
          </>
        )}
      </button>

      <span className="mt-2.5 text-[10px] text-slate-400 font-mono">
        {disabled ? 'Wait for turn initialization' : 'Click the button or any dice to roll'}
      </span>
    </div>
  );
}
