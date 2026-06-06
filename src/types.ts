/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Roll {
  id: string;
  user: string; // "Baan 1" to "Baan 12", "Admin"
  value: string; // Display string like "S1:X, S2:Y"
  stand1?: number;
  stand2?: number;
  squareBefore: number;
  squareAfter: number;
  timestamp: string;
  round?: string;
}

export interface BaanPlayer {
  id: string;
  name: string; // "Baan 1", etc.
  currentSquare: number; // 1 to 100
  password: string; // e.g., "100" (or loaded from sheet)
  lastRoll: string | null; // e.g. "S1:X, S2:Y"
  lastRollTime: string | null;
  lastStand1?: number | null;
  lastStand2?: number | null;
}

export interface GoogleSheetConfig {
  spreadsheetId: string;
  appsScriptUrl: string; // The primary, foolproof way to read/write without complex OAuth
  sheetName: string;
  isLinked: boolean;
}

export interface SystemState {
  players: BaanPlayer[];
  rolls: Roll[];
  sheetConfig: GoogleSheetConfig;
}

// Minimal snakes and ladders coordinate mapping
export interface BoardElement {
  id: string;
  type: 'snake' | 'ladder';
  from: number;
  to: number;
}
