/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaanPlayer, Roll, GoogleSheetConfig } from '../types';

// Default password helper
export const getDefaultPassword = (id: string): string => {
  if (id === 'admin') return '000';
  const num = parseInt(id.replace('baan-', ''), 10);
  if (!isNaN(num)) {
    return (num * 100).toString();
  }
  return '999';
};

// Standard snakes and ladders positions for 100-tile board
export const BOARD_ELEMENTS = [
  // Ladders (Go Up) - Green
  { id: 'l1', type: 'ladder' as const, from: 3, to: 24 },
  { id: 'l2', type: 'ladder' as const, from: 13, to: 44 },
  { id: 'l3', type: 'ladder' as const, from: 22, to: 56 },
  { id: 'l4', type: 'ladder' as const, from: 29, to: 74 },
  { id: 'l5', type: 'ladder' as const, from: 39, to: 60 },
  { id: 'l6', type: 'ladder' as const, from: 50, to: 91 },
  { id: 'l7', type: 'ladder' as const, from: 61, to: 82 },
  { id: 'l8', type: 'ladder' as const, from: 72, to: 94 },

  // Snakes (Go Down) - Red
  { id: 's1', type: 'snake' as const, from: 27, to: 5 },
  { id: 's2', type: 'snake' as const, from: 40, to: 19 },
  { id: 's3', type: 'snake' as const, from: 43, to: 18 },
  { id: 's4', type: 'snake' as const, from: 54, to: 31 },
  { id: 's5', type: 'snake' as const, from: 66, to: 45 },
  { id: 's6', type: 'snake' as const, from: 76, to: 58 },
  { id: 's7', type: 'snake' as const, from: 89, to: 53 },
  { id: 's8', type: 'snake' as const, from: 99, to: 41 },
];

export const checkBoardTransition = (square: number): { target: number; reason: string | null; elementId: string | null } => {
  const match = BOARD_ELEMENTS.find((elem) => elem.from === square);
  if (match) {
    return {
      target: match.to,
      reason: match.type === 'ladder' ? 'Climbed a ladder!' : 'Slipped down a snake!',
      elementId: match.id,
    };
  }
  return { target: square, reason: null, elementId: null };
};

// Local storage keys
const STORAGE_PREFIX = 'snakes_n_ladders_';
const PLAYERS_KEY = `${STORAGE_PREFIX}players`;
const ROLLS_KEY = `${STORAGE_PREFIX}rolls`;
const SHEET_CONFIG_KEY = `${STORAGE_PREFIX}sheet_config`;

// Initializers
export const getInitialPlayers = (): BaanPlayer[] => {
  const saved = localStorage.getItem(PLAYERS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse players from localStorage, resetting', e);
    }
  }

  // Generate 12 player boards
  const players: BaanPlayer[] = [];
  for (let i = 1; i <= 12; i++) {
    players.push({
      id: `baan-${i}`,
      name: `Baan ${i}`,
      currentSquare: 1, // Start on Square 1
      password: getDefaultPassword(`baan-${i}`),
      lastRoll: null,
      lastRollTime: null,
    });
  }
  return players;
};

export const getInitialRolls = (): Roll[] => {
  const saved = localStorage.getItem(ROLLS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Ignore
    }
  }
  return [];
};

export const getInitialSheetConfig = (): GoogleSheetConfig => {
  const saved = localStorage.getItem(SHEET_CONFIG_KEY);
  const targetUrl = 'https://script.google.com/macros/s/AKfycbxQBhxf_3Y_MKTa40LNz0UmgnxkVed8g_r2uKTm72lelvwOk_EJrRArWfwVK8anzpmq/exec';
  const defaultSpreadsheetId = '1Q8AAE37LQ-g10B0KF9HXP6rbhNkAbmQjGTkSWokyKZw';
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed) {
        if (!parsed.spreadsheetId || parsed.spreadsheetId === '1LogSUVN7J7WzItuKwBFAuWCQe6dPJ3MwbJeuxucZNBk') {
          parsed.spreadsheetId = defaultSpreadsheetId;
        }
        // Force update if it was using any older default URL or if appsScriptUrl is empty/missing
        if (
          !parsed.appsScriptUrl || 
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbzQooBistUCyVgH3-L0A4uSG4pkqNDQssMagyt7Rk-ye4oWTk44ho2uSFvw1J0wvKASpQ/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbzFerjPz8A1FwTzx2NsqbEsxb5jbNs_WXVcaEPZUBTwAszcq8mgqGFpnHcl5S8oa3I/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbyuZckHBr6AqEWt-70Z2l90qEc4uYX9p7xvR93At9Ave4A9nVM8qk_X0LOXwKBfNQb2mg/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbwmPbnkA8I4k7d9Bna2DshLsRsQ0Oc9_8ObtyAtYyKPqc-6iZUrUOuwmejbuBC2voClNw/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbx4XHYmMzqNeS2vVLqM9xdQKkc21igDScEe9amaiUNPjiXtODlGaliI5VLzzboFfodkPQ/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycby-f6Uzu8t1aGml2xylqsTGK7Hav03sRgQeq6tup54nFScrbvMLi8m4bkJFH61VTLyAQQ/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbyK9WH6bPYvli9uzJltepl7t_C9r69b6SVcaIbQYJjVOBtRq1qBDGU6937eB-jS3k5ZvQ/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycby70GCULgIDfXN4UV7_OXcPMHPl2J22Poyn8lIWvUgiwmmvaLBoszYtD8ktfe6uHVxVnw/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbx0Bn_oZK2ycjXm_6QIzOJaORWU2qvciF_xDoP847Gk1GyG6uaTiMtpdkrqrDov7UQsAg/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbzdC_dQHLgRQjb_ZMU5YndZT5BFWFVXNYNThizL1VSmhVs9p_SiNv2sTIn8nwSI8g9vQQ/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbyYTZUQLa78Pz9Sysc_owMKKP9ossxSXIykwKtkZCmSHpbYGWgrRcZvVK07OnC52x2x/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbxRgCqIMiZ_-0f_SloEmiozR6vN6G0mex7ej1XTpCcvGmQwfN9DwAW6by1rCA88MLsG/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbyHfpk1AQNyakBAnLKjHRf0Q1UBlO6QJbRyfhb9GZXyFcxXJ--c772MOiZwqTXEk6Ss/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbzwlfFkHkgjWCK9KuACA5n_KoNmf5ViCqwzYs1_m0o6wcxTaUbLLQOJ3caKADiP0heM/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbySGcNOJnV2ds7gvC5XJbolHVl3jAJEfdmCzRkHMNKTvLGJ-_fecDelNjRq1WYczVQJ/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbxHaBXSMFY_JcntdhnSVMIlGzfVu13QfaNVEHeEr2nHuKxKvhIrk9PyBG1A2Pz7Lz_o/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbzBMm7S1y1rSPNhTwOnALkTJp1-JAf8Mc63q7ZYwvQ3tMRbDvSj2nDM-vz7K0eHN3C9/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbzT2iTjO2rKg9REahfySalGk-2WpAAQ2TGilf2HuQT-Z_vfTzt_m1k5O8b8Z4O33a56/exec' ||
          parsed.appsScriptUrl === 'https://script.google.com/macros/s/AKfycbw-Mgmp4BBk5MeDfnjZyFyt4toaZiBh-BqEA7Kx2HbHjp7p1mPuo_DiNILQ_tmio4Gj/exec'
        ) {
          parsed.appsScriptUrl = targetUrl;
          parsed.isLinked = true;
          localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
    } catch {
      // Ignore
    }
  }
  return {
    spreadsheetId: defaultSpreadsheetId,
    appsScriptUrl: targetUrl,
    sheetName: 'Sheet1',
    isLinked: true,
  };
};

export const saveLocalState = (players: BaanPlayer[], rolls: Roll[], config: GoogleSheetConfig) => {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players));
  localStorage.setItem(ROLLS_KEY, JSON.stringify(rolls));
  localStorage.setItem(SHEET_CONFIG_KEY, JSON.stringify(config));
};

/**
 * Sends a dice roll response to Google Sheets.
 * If config.appsScriptUrl is active, it POSTs to the Apps Script.
 * Otherwise, it stores and mocks inside local state.
 */
export const syncRollToGoogleSheet = async (
  config: GoogleSheetConfig,
  roll: { baan: string; value: string; stand1: number; stand2: number; squareBefore: number; squareAfter: number },
  round?: string
): Promise<boolean> => {
  if (!config.appsScriptUrl) {
    console.log('Google Sheets is not linked. Simulated sending roll:', roll);
    return false;
  }

  const selectedRound = round || localStorage.getItem('snakes_n_ladders_active_round') || 'Trial';
  const formattedRound = selectedRound !== 'Trial' && !selectedRound.toLowerCase().startsWith('round') ? `Round ${selectedRound}` : selectedRound;
  const timestamp = new Date().toISOString();

  const payload = {
    action: 'addRoll',
    baan: roll.baan,
    value: roll.value,
    stand1: roll.stand1,
    stand2: roll.stand2,
    squareBefore: roll.squareBefore,
    squareAfter: roll.squareAfter,
    round: formattedRound,
    timestamp: timestamp,
  };

  const queryParams = new URLSearchParams({
    action: 'addRoll',
    baan: roll.baan,
    value: String(roll.value),
    stand1: String(roll.stand1),
    stand2: String(roll.stand2),
    squareBefore: String(roll.squareBefore),
    squareAfter: String(roll.squareAfter),
    round: formattedRound,
    timestamp: timestamp,
  });

  try {
    // 1. Send as robust raw text POST to bypass CORS preflight restriction while carrying JSON body
    await fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    // 2. Fallback to GET to confirm submission in sandboxed environments (e.g. mobile line-browsers/iframes)
    fetch(`${config.appsScriptUrl}?${queryParams.toString()}`, {
      method: 'GET',
      mode: 'no-cors',
    }).catch(() => {});

    console.log('Dice roll sync triggered via twin POST/GET channels.');
    return true;
  } catch (error) {
    console.error('Failed to sync dice roll to Google Sheets:', error);
    try {
      // Direct GET try on error
      await fetch(`${config.appsScriptUrl}?${queryParams.toString()}`, {
        method: 'GET',
        mode: 'no-cors',
      });
      return true;
    } catch (innerErr) {
      console.error('Alternate GET channel failed too:', innerErr);
      return false;
    }
  }
};

/**
 * Sends the active round update to Google Sheets Apps Script so other players/panels synchronize instantly.
 */
export const syncActiveRoundToGoogleSheet = async (
  config: GoogleSheetConfig,
  round: string
): Promise<boolean> => {
  if (!config.appsScriptUrl) {
    console.log('Google Sheets is not linked. Simulated setting round to:', round);
    return false;
  }

  const formattedRound = round !== 'Trial' && !round.toLowerCase().startsWith('round') ? `Round ${round}` : round;

  const payload = {
    action: 'setRound',
    round: formattedRound,
  };

  try {
    await fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    fetch(`${config.appsScriptUrl}?action=setRound&round=${encodeURIComponent(formattedRound)}`, {
      method: 'GET',
      mode: 'no-cors',
    }).catch(() => {});

    return true;
  } catch (error) {
    console.error('Failed to sync active round to Google Sheets:', error);
    try {
      await fetch(`${config.appsScriptUrl}?action=setRound&round=${encodeURIComponent(formattedRound)}`, {
        method: 'GET',
        mode: 'no-cors',
      });
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Sends the active 1-minute countdown timer value to Google Sheets Apps Script.
 */
export const syncTimerToGoogleSheet = async (
  config: GoogleSheetConfig,
  timerEnd: number | null
): Promise<boolean> => {
  if (!config.appsScriptUrl) {
    console.log('Google Sheets is not linked. Simulated setting timerEnd to:', timerEnd);
    return false;
  }

  const timerVal = timerEnd ? String(timerEnd) : '0';

  const payload = {
    action: 'setTimer',
    timerEnd: timerVal,
  };

  try {
    await fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    fetch(`${config.appsScriptUrl}?action=setTimer&timerEnd=${timerVal}`, {
      method: 'GET',
      mode: 'no-cors',
    }).catch(() => {});

    return true;
  } catch (error) {
    console.error('Failed to sync timer to Google Sheets:', error);
    try {
      await fetch(`${config.appsScriptUrl}?action=setTimer&timerEnd=${timerVal}`, {
        method: 'GET',
        mode: 'no-cors',
      });
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Triggers a full beauty design and cell-resizing sweep in Google Sheets on-demand.
 * This runs all formatting scripts asynchronously to keep normal dice rolls lightning-fast.
 */
export const syncFormatSheets = async (
  config: GoogleSheetConfig
): Promise<boolean> => {
  if (!config.appsScriptUrl) {
    console.log('Google Sheets is not linked. Simulated formatting sheets.');
    return false;
  }

  const payload = {
    action: 'format',
  };

  try {
    await fetch(config.appsScriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    fetch(`${config.appsScriptUrl}?action=format`, {
      method: 'GET',
      mode: 'no-cors',
    }).catch(() => {});

    return true;
  } catch (error) {
    console.error('Failed to manually trigger sheet formatting:', error);
    try {
      await fetch(`${config.appsScriptUrl}?action=format`, {
        method: 'GET',
        mode: 'no-cors',
      });
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Pulls the latest positions or updated passwords from Google Sheets if configured.
 * This executes a simple GET request on the spreadsheet web app wrapper.
 */
export const fetchGoogleSheetState = async (
  config: GoogleSheetConfig,
  currentRound?: string
): Promise<{ 
  passwords?: { [key: string]: string }; 
  positions?: { [key: string]: number }; 
  standPositions?: { [key: string]: { stand1: number; stand2: number } };
  activeRound?: string; 
  timerEnd?: string; 
  summaryRows?: any[][];
} | null> => {
  if (!config.appsScriptUrl) return null;

  try {
    let url = `${config.appsScriptUrl}?action=getState`;
    if (currentRound) {
      const formattedRound = currentRound !== 'Trial' && !currentRound.toLowerCase().startsWith('round') ? `Round ${currentRound}` : currentRound;
      url += `&round=${encodeURIComponent(formattedRound)}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.warn('Could not load Google Sheet state:', err);
    return null;
  }
};

/**
 * Generates the robust Google Apps Script code that the admin can paste into their Sheet.
 */
export const getGoogleAppsScriptCode = (spreadsheetId?: string, sheetName: string = 'Sheet1') => {
  const targetId = spreadsheetId || '1Q8AAE37LQ-g10B0KF9HXP6rbhNkAbmQjGTkSWokyKZw';
  return `/**
 * Google Apps Script for Snakes & Ladders - Dice Roller Integration
 * Setup Instructions:
 * 1. Open your Google Spreadsheet.
 * 2. Click "Extensions" -> "Apps Script".
 * 3. Delete any default code in Code.gs and paste this entire block.
 * 4. Replace the SpreadSheet ID below if it's not pre-populated.
 * 5. In Apps Script editor, click "Deploy" (top right) -> "New deployment".
 * 6. Select type: "Web app".
 * 7. Set "Execute as": "Me" (your email) and "Who has access": "Anyone".
 * 8. Click "Deploy", approve permissions, and copy the deployment "Web app URL".
 * 9. Paste that URL into the Admin settings panel of your Snakes & Ladders app!
 */

const SPREADSHEET_ID = "${targetId}";
const SHEET_NAME = "${sheetName}";

// Helper function to format sheets beautifully
function formatSheetBeauty(sheet) {
  if (!sheet) return;
  var name = sheet.getName();
  
  if (name === "Roll Logs") {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return;
    
    sheet.setGridlines(true);
    var entireRange = sheet.getRange(1, 1, lastRow, lastCol);
    entireRange.setFontFamily("Prompt").setVerticalAlignment("middle").setFontSize(10);
    
    var headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange.setFontWeight("bold")
               .setBackground("#1e293b") // Slate 800
               .setFontColor("#ffffff") // White text
               .setHorizontalAlignment("center")
               .setFontSize(11);
               
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, lastCol).setHorizontalAlignment("center");
    }
    
    try {
      for (var col = 1; col <= lastCol; col++) {
        sheet.autoResizeColumn(col);
        var width = sheet.getColumnWidth(col);
        sheet.setColumnWidth(col, Math.max(width + 25, 110));
      }
    } catch (err) {}
  } else if (name === "Board States") {
    // Styling states sheet safely
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 1 || lastCol < 1) return;
    
    sheet.setGridlines(true);
    var entireRange = sheet.getRange(1, 1, lastRow, lastCol);
    entireRange.setFontFamily("Prompt").setVerticalAlignment("middle").setHorizontalAlignment("center").setFontSize(10);
    
    var headerRange = sheet.getRange(1, 1, 1, lastCol);
    headerRange.setFontWeight("bold").setBackground("#334155").setFontColor("#ffffff");
    
    try {
      for (var col = 1; col <= lastCol; col++) {
        sheet.autoResizeColumn(col);
        sheet.setColumnWidth(col, 130);
      }
    } catch (err) {}
  } else {
    // For our custom styled summary sheet, adjust specific columns neatly without mess
    var lastCol = sheet.getLastColumn();
    try {
      sheet.setGridlines(true);
      for (var col = 1; col <= lastCol; col++) {
        var subHeaderVal = sheet.getRange(3, col).getValue();
        if (subHeaderVal === "Stand บน" || subHeaderVal === "Stand ล่าง") {
          sheet.setColumnWidth(col, 85);
        } else if (subHeaderVal === "Current Pos" || subHeaderVal === "การ์ดพิเศษ") {
          sheet.setColumnWidth(col, 95);
        } else if (subHeaderVal === "บ้าน" || col === 1) {
          sheet.setColumnWidth(col, 75);
        } else {
          sheet.setColumnWidth(col, 30); // Spacer or other
        }
      }

      // Auto-apply conditional formatting for Current Pos (Value 8 = Soft Green, Value 4 = Soft Red)
      var lastRow = sheet.getLastRow();
      if (lastRow >= 4 && lastCol >= 2) {
        var cfRange = sheet.getRange(4, 2, lastRow - 3, lastCol - 1);
        sheet.clearConditionalFormatRules();
        
        var rule8 = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberEqualTo(8)
          .setBackground("#d1fae5") // Soft green bg
          .setFontColor("#15803d")   // Dark green text
          .setBold(true)
          .setRanges([cfRange])
          .build();

        var rule4 = SpreadsheetApp.newConditionalFormatRule()
          .whenNumberEqualTo(4)
          .setBackground("#fee2e2") // Soft red bg
          .setFontColor("#b91c1c")   // Dark red text
          .setBold(true)
          .setRanges([cfRange])
          .build();

        sheet.setConditionalFormatRules([rule8, rule4]);
      }
    } catch(err) {}
  }
}

// Function to initialize the specific analysis sheet with 8-row house layout
function initializeAnalysisSheet(sheet) {
  sheet.clear();
  sheet.setGridlines(true);
  
  // Set default body formatting
  var maxCols = 15;
  var maxRows = 55;
  var rangeAll = sheet.getRange(1, 1, maxRows, maxCols);
  rangeAll.setFontFamily("Prompt").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center").setFontColor("#334155");
  
  // 1. Title Row
  var titleRange = sheet.getRange(1, 1, 1, 11);
  titleRange.merge();
  titleRange.setValue("[บันไดงู] ชีตสรุปการลงข้อมูลฝ่ายวิเคราะห์ (8 Rows per House)")
            .setFontSize(13)
            .setFontWeight("bold")
            .setFontColor("#b45309")
            .setBackground("#fef3c7")
            .setHorizontalAlignment("center");
  sheet.setRowHeight(1, 38);
  sheet.setRowHeight(2, 24);
  
  // 2. Setup Headers for Left and Right Blocks
  function setupHeaders(startCol) {
    sheet.getRange(2, startCol).setValue("บ้าน").setFontWeight("bold").setBackground("#f1f5f9");
    sheet.getRange(2, startCol + 1).setValue("รอบ").setFontWeight("bold").setBackground("#e2e8f0");
    sheet.getRange(2, startCol + 2).setValue("Stand").setFontWeight("bold").setBackground("#ffedd5");
    sheet.getRange(2, startCol + 3).setValue("ผลการทอย").setFontWeight("bold").setBackground("#fee2e2");
    sheet.getRange(2, startCol + 4).setValue("Current Pos").setFontWeight("bold").setBackground("#e0e7ff");
    
    sheet.setColumnWidth(startCol, 65);
    sheet.setColumnWidth(startCol + 1, 55);
    sheet.setColumnWidth(startCol + 2, 85);
    sheet.setColumnWidth(startCol + 3, 85);
    sheet.setColumnWidth(startCol + 4, 95);
  }
  
  setupHeaders(1); // Col A-E
  setupHeaders(7); // Col G-K
  sheet.setColumnWidth(6, 20); // Spacer column F
  
  function wrapStr(colStr, rowNum) {
    return '=IF(OR(' + colStr + rowNum + '="", ' + colStr + rowNum + '=0), "", ' + colStr + rowNum + ')';
  }

  // 3. Render Houses
  function renderHouseBlock(h, baseRow, startCol) {
    var bg = (h % 2 === 0) ? "#e8f5e9" : "#fafafc";
    
    // House Name (Merge 8 rows)
    var houseRange = sheet.getRange(baseRow, startCol, 8, 1);
    houseRange.merge();
    houseRange.setValue("บ้าน " + h).setFontWeight("bold").setBackground(bg);
    
    // Rows
    for (var i = 0; i < 8; i++) {
      var r = baseRow + i;
      sheet.setRowHeight(r, 24);
      
      // Stand names
      var isStand1 = (i % 2 === 0);
      sheet.getRange(r, startCol + 2).setValue(isStand1 ? "Stand บน" : "Stand ล่าง")
           .setBackground(isStand1 ? "#ffedd5" : bg)
           .setFontWeight("bold");
           
      sheet.getRange(r, startCol + 3).setBackground(bg); // Result
      sheet.getRange(r, startCol + 4).setBackground("#fafaf9"); // Pos
    }
    
    // Round names (merge 2 rows each)
    for (var round = 1; round <= 4; round++) {
      var roundBaseRow = baseRow + (round - 1) * 2;
      var roundRange = sheet.getRange(roundBaseRow, startCol + 1, 2, 1);
      roundRange.merge();
      roundRange.setValue("Round " + round).setFontWeight("bold").setBackground("#e2e8f0");
      
      // Target Pos cell formulas (using wrapLadderSnake)
      var posColStr = getColLetter(startCol + 4); 
      var resultColStr = getColLetter(startCol + 3);
      var f1 = "";
      var f2 = "";
      
      if (round === 1) {
        var expr1 = '1+' + resultColStr + roundBaseRow;
        var expr2 = '1+' + resultColStr + (roundBaseRow+1);
        f1 = '=IF(OR(' + resultColStr + roundBaseRow + '="", ' + resultColStr + roundBaseRow + '=0), "", ' + wrapLadderSnake(expr1).replace(/^=/, "") + ')';
        f2 = '=IF(OR(' + resultColStr + (roundBaseRow+1) + '="", ' + resultColStr + (roundBaseRow+1) + '=0), "", ' + wrapLadderSnake(expr2).replace(/^=/, "") + ')';
      } else {
        var prevRoundBaseRow = baseRow + (round - 2) * 2;
        var expr1 = posColStr + prevRoundBaseRow + '+' + resultColStr + roundBaseRow;
        var expr2 = posColStr + (prevRoundBaseRow+1) + '+' + resultColStr + (roundBaseRow+1);
        f1 = '=IF(OR(' + resultColStr + roundBaseRow + '="", ' + resultColStr + roundBaseRow + '=0), "", ' + wrapLadderSnake(expr1).replace(/^=/, "") + ')';
        f2 = '=IF(OR(' + resultColStr + (roundBaseRow+1) + '="", ' + resultColStr + (roundBaseRow+1) + '=0), "", ' + wrapLadderSnake(expr2).replace(/^=/, "") + ')';
      }
      sheet.getRange(roundBaseRow, startCol + 4).setFormula(f1);
      sheet.getRange(roundBaseRow + 1, startCol + 4).setFormula(f2);
    }
  }

  // Generate for Houses 1 to 6 (Left)
  for (var h = 1; h <= 6; h++) {
    renderHouseBlock(h, 3 + (h - 1) * 8, 1);
  }
  
  // Generate for Houses 7 to 12 (Right)
  for (var h = 7; h <= 12; h++) {
    renderHouseBlock(h, 3 + (h - 7) * 8, 7);
  }
  
  // Conditional formatting for Green/Red squares
  try {
    var cfRange1 = sheet.getRange(3, 5, 48, 1);
    var cfRange2 = sheet.getRange(3, 11, 48, 1);
    sheet.clearConditionalFormatRules();
    
    var rule8 = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(8).setBackground("#d1fae5").setFontColor("#15803d").setBold(true)
      .setRanges([cfRange1, cfRange2]).build();
      
    var rule4 = SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(4).setBackground("#fee2e2").setFontColor("#b91c1c").setBold(true)
      .setRanges([cfRange1, cfRange2]).build();

    sheet.setConditionalFormatRules([rule8, rule4]);
  } catch(e) {}
}

// Handle HTTP POST (Recording dice rolls and analysis)
function doPost(e) {
  try {
    const rawData = e.postData.contents;
    const data = JSON.parse(rawData);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    if (data.action === "setRound") {
      try {
        PropertiesService.getScriptProperties().setProperty("activeRound", data.round || "Trial");
      } catch (err) {}
      return ContentService.createTextOutput(JSON.stringify({ status: "success", round: data.round }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "setTimer") {
      try {
        PropertiesService.getScriptProperties().setProperty("timerEnd", data.timerEnd || "0");
      } catch (err) {}
      return ContentService.createTextOutput(JSON.stringify({ status: "success", timerEnd: data.timerEnd }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === "addRoll") {
      return processAddRoll(ss, data);
    }
    
    if (data.action === "format") {
      let logSheet = ss.getSheetByName("Roll Logs");
      let stateSheet = ss.getSheetByName("Board States");
      let summarySheet = getSheetSafely(ss, SHEET_NAME);
      
      if (logSheet) formatSheetBeauty(logSheet);
      if (stateSheet) formatSheetBeauty(stateSheet);
      if (summarySheet) formatSheetBeauty(summarySheet);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Sheets stylized and auto-resized successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Unknown action" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Common function to process and log roll events to both state and visual analysis sheet
function processAddRoll(ss, data) {
  // Ensure "Roll Logs" sheet exists
  let logSheet = ss.getSheetByName("Roll Logs");
  if (!logSheet) {
    logSheet = ss.insertSheet("Roll Logs");
    logSheet.appendRow(["Timestamp", "Baan Name", "Dice Value", "Stand บน", "Stand ล่าง", "Square Before", "Square After"]);
    logSheet.setFrozenRows(1);
  }
  
  // Ensure "Board States" sheet exists for backing coordinates and authentication
  let stateSheet = ss.getSheetByName("Board States");
  if (!stateSheet) {
    stateSheet = ss.insertSheet("Board States");
    stateSheet.appendRow(["Baan Name", "Current Square", "Custom Password", "Last Roll Val", "Last Roll Time"]);
    stateSheet.setFrozenRows(1);
    
    // Default entries
    for (let i = 1; i <= 12; i++) {
      stateSheet.appendRow(["Baan " + i, 1, i * 100, "", ""]);
    }
  }
  
  // Ensure main visual analysis sheet exists safely (handles locales like Sheet1 vs ชีต1)
  let summarySheet = getSheetSafely(ss, SHEET_NAME);
  if (!summarySheet) {
    summarySheet = ss.insertSheet(SHEET_NAME);
  }

  const timestamp = data.timestamp || new Date().toISOString();
  const formatTime = Utilities.formatDate(new Date(timestamp), "GMT+7", "yyyy-MM-dd HH:mm:ss");
  
  var normalizedThaiBaan = data.baan.replace("Baan ", "บ้าน ");
  
  // 1. Log roll detailed record
  logSheet.appendRow([
    formatTime,
    normalizedThaiBaan,
    data.value,
    data.stand1,
    data.stand2,
    data.squareBefore,
    data.squareAfter
  ]);
  
  // 2. Update backend Board State
  const stateData = stateSheet.getDataRange().getValues();
  let stateFound = false;
  for (let i = 1; i < stateData.length; i++) {
    if (stateData[i][0] === data.baan || stateData[i][0] === normalizedThaiBaan) {
      stateSheet.getRange(i + 1, 2).setValue(data.squareAfter);
      stateSheet.getRange(i + 1, 4).setValue(data.value);
      stateSheet.getRange(i + 1, 5).setValue(formatTime);
      stateFound = true;
      break;
    }
  }
  if (!stateFound) {
    stateSheet.appendRow([
      data.baan,
      data.squareAfter,
      "999",
      data.value,
      formatTime
    ]);
  }
  
  // 3. Update the visual Excel analysis sheet columns (Column D or J ONLY)
  // Parse Baan/House Number
  var houseNum = 0;
  var baanStr = (data.baan || "").toString();
  var numMatch = baanStr.match(/\d+/);
  if (numMatch) {
    houseNum = parseInt(numMatch[0], 10);
  }
  
  // Parse Round selection (Supports dynamic naming like "Round 1", "Round 4", "รอบ 1", etc.)
  var roundVal = (data.round || "Round 1").toString().toLowerCase();
  var roundNum = 1;
  if (roundVal.indexOf("4") !== -1 || roundVal.indexOf("รอบ 4") !== -1) {
    roundNum = 4;
  } else if (roundVal.indexOf("3") !== -1 || roundVal.indexOf("รอบ 3") !== -1) {
    roundNum = 3;
  } else if (roundVal.indexOf("2") !== -1 || roundVal.indexOf("รอบ 2") !== -1) {
    roundNum = 2;
  } else if (roundVal.indexOf("1") !== -1 || roundVal.indexOf("รอบ 1") !== -1) {
    roundNum = 1;
  } else if (roundVal.indexOf("trial") !== -1) {
    roundNum = 0;
  }
  
  // Choose exact column and starting base row (House 1 starts at Row 3, each house block is 8 rows)
  var targetCol = -1;
  var houseBaseRow = -1;
  
  if (houseNum >= 1 && houseNum <= 6) {
    targetCol = 4; // Column D (ผลการทอย)
    houseBaseRow = 3 + (houseNum - 1) * 8;
  } else if (houseNum >= 7 && houseNum <= 12) {
    targetCol = 10; // Column J (ผลการทอย)
    houseBaseRow = 3 + (houseNum - 7) * 8;
  }
  
  // If round is Trial (0), do not update the visual analysis sheet
  if (roundNum !== 0 && targetCol !== -1 && houseBaseRow !== -1) {
    var offsetStand1 = -1;
    var offsetStand2 = -1;
    
    // Rows within the 8-row house block (Round 1 = offsets 0/1, Round 2 = offsets 2/3, Round 3 = offsets 4/5, Round 4 = offsets 6/7)
    if (roundNum === 1) {
      offsetStand1 = 0; // Row 0 of block -> Stand บน
      offsetStand2 = 1; // Row 1 of block -> Stand ล่าง
    } else if (roundNum === 2) {
      offsetStand1 = 2; // Row 2 of block -> Stand บน
      offsetStand2 = 3; // Row 3 of block -> Stand ล่าง
    } else if (roundNum === 3) {
      offsetStand1 = 4; // Row 4 of block -> Stand บน
      offsetStand2 = 5; // Row 5 of block -> Stand ล่าง
    } else if (roundNum === 4) {
      offsetStand1 = 6; // Row 6 of block -> Stand บน
      offsetStand2 = 7; // Row 7 of block -> Stand ล่าง
    }
    
    // Explicit signed strings like "+3", "-5", or "0"
    var s1ValStr = (parseInt(data.stand1, 10) > 0 ? "+" : "") + data.stand1;
    var s2ValStr = (parseInt(data.stand2, 10) > 0 ? "+" : "") + data.stand2;
    
    if (offsetStand1 !== -1) {
      summarySheet.getRange(houseBaseRow + offsetStand1, targetCol).setValue(s1ValStr);
    }
    if (offsetStand2 !== -1) {
      summarySheet.getRange(houseBaseRow + offsetStand2, targetCol).setValue(s2ValStr);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Successfully logged roll to analysis sheet" }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle HTTP GET (Retrieving passwords, positions, active round or processing roll GET fallback)
function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Support GET requests for adding rolls directly (provides 100% CORS/redirection reliability)
    if (action === "addRoll") {
      const parsedData = {
        action: "addRoll",
        baan: e.parameter.baan,
        value: e.parameter.value,
        stand1: Number(e.parameter.stand1 || 0),
        stand2: Number(e.parameter.stand2 || 0),
        squareBefore: Number(e.parameter.squareBefore || 1),
        squareAfter: Number(e.parameter.squareAfter || 1),
        round: e.parameter.round || "Trial",
        timestamp: e.parameter.timestamp || new Date().toISOString()
      };
      return processAddRoll(ss, parsedData);
    }
    
    if (action === "setRound") {
      try {
        PropertiesService.getScriptProperties().setProperty("activeRound", e.parameter.round || "Trial");
      } catch (err) {}
      return ContentService.createTextOutput(JSON.stringify({ status: "success", round: e.parameter.round }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "setTimer") {
      try {
        PropertiesService.getScriptProperties().setProperty("timerEnd", e.parameter.timerEnd || "0");
      } catch (err) {}
      return ContentService.createTextOutput(JSON.stringify({ status: "success", timerEnd: e.parameter.timerEnd }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === "format") {
      let logSheet = ss.getSheetByName("Roll Logs");
      let stateSheet = ss.getSheetByName("Board States");
      let summarySheet = getSheetSafely(ss, SHEET_NAME);
      
      if (logSheet) formatSheetBeauty(logSheet);
      if (stateSheet) formatSheetBeauty(stateSheet);
      if (summarySheet) formatSheetBeauty(summarySheet);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Sheets stylized and auto-resized successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Look first in Board States sheet
    let stateSheet = ss.getSheetByName("Board States");
    let isRealStateSheet = !!stateSheet;
    if (!stateSheet) {
      stateSheet = getSheetSafely(ss, SHEET_NAME);
    }
    
    if (!stateSheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "States sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const passwords = {};
    const positions = {};
    
    if (isRealStateSheet) {
      const data = stateSheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        const player = data[i][0]; 
        const square = data[i][1]; 
        const pass = data[i][2]; 
        
        if (player) {
          // Map back to standard "Baan X" so the client state binds perfectly
          var normalizedEnglishBaan = normalizeBaanName(player);
          passwords[normalizedEnglishBaan] = String(pass);
          positions[normalizedEnglishBaan] = Number(square) || 1;
        }
      }
    }
    
    var activeRound = "Trial";
    try {
      activeRound = PropertiesService.getScriptProperties().getProperty("activeRound") || "Trial";
    } catch(err) {}
    
    var timerEnd = "0";
    try {
      timerEnd = PropertiesService.getScriptProperties().getProperty("timerEnd") || "0";
    } catch(err) {}
    
    var standPositions = {};
    try {
      var summarySheet = getSheetSafely(ss, SHEET_NAME);
      if (summarySheet) {
        var activeRoundStr = e.parameter.round || PropertiesService.getScriptProperties().getProperty("activeRound") || "Trial";
        var matchRoundNum = 0;
        if (activeRoundStr.indexOf("Round ") === 0) {
          matchRoundNum = parseInt(activeRoundStr.replace("Round ", ""), 10) || 0;
        }
        
        var summaryData = summarySheet.getDataRange().getValues();
        for (var h = 1; h <= 12; h++) {
          var normalizedBaanName = normalizeBaanName("บ้าน " + h);
          var baseRowIdx = h <= 6 ? 2 + (h - 1)*8 : 2 + (h - 7)*8;
          var posColIdx = h <= 6 ? 4 : 10; // Current Pos is col E(4) and K(10)
          
          if (baseRowIdx >= summaryData.length) break;

          var prevS1 = 0;
          var prevS2 = 0;
          
          if (matchRoundNum >= 1) {
            var maxRoundToCheck = Math.min(matchRoundNum - 1, 4);
            for (var r = maxRoundToCheck; r >= 1; r--) {
              var rOff = (r - 1) * 2;
              var s1RowIdx = baseRowIdx + rOff;
              var s2RowIdx = baseRowIdx + rOff + 1;
              
              if (s1RowIdx < summaryData.length) {
                var v1 = parseFloat(summaryData[s1RowIdx][posColIdx]) || 0;
                if (v1 > 0 && prevS1 === 0) prevS1 = v1;
              }
              if (s2RowIdx < summaryData.length) {
                var v2 = parseFloat(summaryData[s2RowIdx][posColIdx]) || 0;
                if (v2 > 0 && prevS2 === 0) prevS2 = v2;
              }
              
              if (prevS1 > 0 && prevS2 > 0) break;
            }
          }
          
          standPositions[normalizedBaanName] = {
            stand1: prevS1,
            stand2: prevS2
          };
        }
      }
    } catch(err) {}
    
    var summaryRows = [];
    try {
      var summarySheet = getSheetSafely(ss, SHEET_NAME);
      if (summarySheet) {
        summaryRows = summarySheet.getDataRange().getValues();
      }
    } catch(err) {}
    
    return ContentService.createTextOutput(JSON.stringify({ passwords, positions, activeRound, timerEnd, standPositions, summaryRows }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper to wrap expression in a 4->8 / 8->4 ladder/snake logic
function wrapLadderSnake(expr) {
  return "=IF(" + expr + "=4, 8, IF(" + expr + "=8, 4, " + expr + "))";
}

// Global helper to convert column index to Excel column letter
function getColLetter(col) {
  var temp, letter = "";
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}

// Robust helper to normalize and translate Baan numbers consistently
function normalizeBaanName(name) {
  if (!name) return "";
  var s = String(name).trim();
  s = s.replace("บ้าน", "Baan");
  s = s.replace(/\s+/g, " ");
  // Ensure space before the number, e.g. "Baan 1"
  s = s.replace(/Baan\s*(\d+)/i, "Baan $1");
  return s;
}

// Safe sheet fetch helper (handles localization like Sheet1 vs ชีต1)
function getSheetSafely(ss, sheetName) {
  if (!ss) return null;
  var s = ss.getSheetByName(sheetName);
  if (s) return s;
  
  // Try alternative name
  if (sheetName === "Sheet1") {
    s = ss.getSheetByName("ชีต1");
    if (s) return s;
  } else if (sheetName === "ชีต1") {
    s = ss.getSheetByName("Sheet1");
    if (s) return s;
  }
  
  // Filter out system sheets and find the first user sheet
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    if (name !== "Roll Logs" && name !== "Board States" && name !== "System Config") {
      return sheets[i];
    }
  }
  
  // Absolute fallback
  if (sheets.length > 0) {
    return sheets[0];
  }
  return null;
}`;
};
