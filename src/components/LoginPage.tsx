/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, ArrowRight, Shield, AlertCircle, HelpCircle } from 'lucide-react';
import { BaanPlayer } from '../types';
import { BAAN_COLORS } from './Board';
import { getDefaultPassword } from '../utils/sheets';

interface LoginPageProps {
  players: BaanPlayer[];
  onLoginSuccess: (userId: string) => void;
  passwordsFromSheet?: { [key: string]: string }; // Custom passwords synced from Sheets
}

export default function LoginPage({ players, onLoginSuccess, passwordsFromSheet }: LoginPageProps) {
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Baan 1 to 12
  const baanOptions = React.useMemo(() => {
    return players.map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }, [players]);

  // Admin Option
  const adminOption = {
    id: 'admin',
    name: 'Admin',
  };

  const handleUserSelect = (user: { id: string; name: string }) => {
    setSelectedUser(user);
    setPasswordInput('');
    setErrorMsg(null);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    // Verify Password
    // Check if there is a custom password loaded from Google Sheet
    let correctPassword = '';
    
    if (selectedUser.id === 'admin') {
      correctPassword = '000';
    } else if (passwordsFromSheet && passwordsFromSheet[selectedUser.name]) {
      correctPassword = passwordsFromSheet[selectedUser.name];
    } else {
      correctPassword = getDefaultPassword(selectedUser.id);
    }

    setTimeout(() => {
      if (passwordInput.trim() === correctPassword) {
        onLoginSuccess(selectedUser.id);
      } else {
        setErrorMsg('Incorrect Password. Please try again.');
        setIsSubmitting(false);
      }
    }, 400); // Small, pleasant feedback delay
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-16 px-6 flex flex-col items-center">
      {/* Visual Header */}
      <motion.div
        initial={{ y: -15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center mb-16 max-w-2xl"
      >
        <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-4 tracking-tight font-display uppercase">
          Who are you???
        </h1>
        <p className="text-slate-500 text-lg uppercase tracking-[0.2em] font-medium font-sans">
          Select your team to continue
        </p>
      </motion.div>

      {/* Grid of 12 Baan Identity Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 w-full" id="login_identity_selector">
        {baanOptions.map((opt, index) => {
          const isSel = selectedUser?.id === opt.id;

          return (
            <motion.button
              key={opt.id}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.03, type: 'spring', stiffness: 200 }}
              onClick={() => handleUserSelect(opt)}
              className={`group bg-white border-2 p-6 rounded-2xl transition-all duration-300 text-center cursor-pointer transform hover:-translate-y-1 hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 ${
                isSel ? 'border-blue-500 ring-2 ring-blue-500/50' : 'border-slate-200'
              }`}
            >
              <span className="block text-xs font-bold text-slate-400 group-hover:text-blue-500 uppercase tracking-widest mb-1 transition-colors">
                Team
              </span>
              <span className="block text-2xl font-bold text-slate-800 font-display">
                {opt.name}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Admin Separator & Button */}
      <div className="mt-12 flex items-center flex-col w-full">
         <div className="w-32 h-1 bg-slate-200 rounded-full mb-8" />
         <motion.button
           initial={{ scale: 0.9, opacity: 0 }}
           animate={{ scale: 1, opacity: 1 }}
           transition={{ delay: 12 * 0.03, type: 'spring', stiffness: 200 }}
           onClick={() => handleUserSelect(adminOption)}
           className={`bg-slate-900 hover:bg-black text-white px-16 py-4 rounded-xl font-bold text-xl tracking-widest transition-all shadow-lg hover:-translate-y-1 active:scale-95 cursor-pointer ${
             selectedUser?.id === 'admin' ? 'ring-4 ring-blue-500/50' : ''
           }`}
         >
           ADMIN
         </motion.button>
      </div>

      {/* Password Overlay Modal Sheet */}
      <AnimatePresence>
        {selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs"
            onClick={() => {
              if (!isSubmitting) setSelectedUser(null);
            }}
          >
            {/* Modal Body */}
            <motion.div
              initial={{ y: 50, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-8 border-slate-100 rounded-3xl w-full max-w-md p-8 relative overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg ${
                    selectedUser.id === 'admin' 
                      ? 'bg-slate-100 text-slate-700' 
                      : 'bg-blue-50 text-blue-600'
                  }`}>
                    {selectedUser.id === 'admin' ? (
                      <Shield className="w-5 h-5" />
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-display font-extrabold text-lg text-slate-900 leading-tight">
                      Security Verification
                    </h2>
                    <p className="text-xs text-slate-500">
                      Accessing <span className="font-bold text-slate-800">{selectedUser.name}</span> portal
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  disabled={isSubmitting}
                  className="text-slate-400 hover:text-slate-600 font-bold hover:bg-slate-50 w-7 h-7 flex items-center justify-center rounded-full cursor-pointer transition-colors"
                >
                  &times;
                </button>
              </div>

              {/* Password Entry Form */}
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="auth_pwd" className="block text-xs font-mono font-medium text-slate-500 uppercase">
                    Enter Verification Key
                  </label>
                  <input
                    id="auth_pwd"
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    required
                    autoFocus
                    placeholder="••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full py-4 px-4 rounded-xl border-2 border-slate-200 font-mono text-center text-3xl tracking-[0.25em] focus:border-blue-500 focus:ring-4 focus:ring-blue-100 focus:outline-none transition-all duration-300"
                  />
                </div>

                {errorMsg && (
                  <motion.div
                    initial={{ y: -5, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-lg"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </motion.div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    disabled={isSubmitting}
                    className="flex-1 py-3 text-center text-sm font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Verify</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Mini Hint (can assist testing/admins) */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <HelpCircle className="w-3 h-3 text-slate-300" />
                <span>
                  Hint: Try "{selectedUser.id === 'admin' ? '000' : (players.findIndex((p) => p.id === selectedUser.id) + 1) * 100}"
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
