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
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed) {
        if (!parsed.spreadsheetId) {
          parsed.spreadsheetId = '1LogSUVN7J7WzItuKwBFAuWCQe6dPJ3MwbJeuxucZNBk';
        }
        if (!parsed.appsScriptUrl) {
          parsed.appsScriptUrl = 'https://script.google.com/macros/s/AKfycbzFerjPz8A1FwTzx2NsqbEsxb5jbNs_WXVcaEPZUBTwAszcq8mgqGFpnHcl5S8oa3I/exec';
          parsed.isLinked = true;
        }
        return parsed;
      }
    } catch {
      // Ignore
    }
  }
  return {
    spreadsheetId: '1LogSUVN7J7WzItuKwBFAuWCQe6dPJ3MwbJeuxucZNBk',
    appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzFerjPz8A1FwTzx2NsqbEsxb5jbNs_WXVcaEPZUBTwAszcq8mgqGFpnHcl5S8oa3I/exec',
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
  const timestamp = new Date().toISOString();

  const payload = {
    action: 'addRoll',
    baan: roll.baan,
    value: roll.value,
    stand1: roll.stand1,
    stand2: roll.stand2,
    squareBefore: roll.squareBefore,
    squareAfter: roll.squareAfter,
    round: selectedRound,
    timestamp: timestamp,
  };

  const queryParams = new URLSearchParams({
    action: 'addRoll',
    baan: roll.baan,
    value: roll.value,
    stand1: String(roll.stand1),
    stand2: String(roll.stand2),
    squareBefore: String(roll.squareBefore),
    squareAfter: String(roll.squareAfter),
    round: selectedRound,
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

  const payload = {
    action: 'setRound',
    round: round,
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

    fetch(`${config.appsScriptUrl}?action=setRound&round=${encodeURIComponent(round)}`, {
      method: 'GET',
      mode: 'no-cors',
    }).catch(() => {});

    return true;
  } catch (error) {
    console.error('Failed to sync active round to Google Sheets:', error);
    try {
      await fetch(`${config.appsScriptUrl}?action=setRound&round=${encodeURIComponent(round)}`, {
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
  config: GoogleSheetConfig
): Promise<{ passwords?: { [key: string]: string }; positions?: { [key: string]: number }; activeRound?: string } | null> => {
  if (!config.appsScriptUrl) return null;

  try {
    const response = await fetch(`${config.appsScriptUrl}?action=getState`);
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
  const targetId = spreadsheetId || '1LogSUVN7J7WzItuKwBFAuWCQe6dPJ3MwbJeuxucZNBk';
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
          sheet.setColumnWidth(col, 95);
        } else if (subHeaderVal === "การ์ดพิเศษ") {
          sheet.setColumnWidth(col, 100);
        } else if (col === 1) {
          sheet.setColumnWidth(col, 90);
        } else if (col % 5 === 1 && col > 1) { // spacer column
          sheet.setColumnWidth(col, 30);
        }
      }
    } catch(err) {}
  }
}

// Function to initialize the specific analysis sheet with exact headers from the user screenshot
function initializeAnalysisSheet(sheet) {
  sheet.clear();
  sheet.setGridlines(true);
  
  // Set default body formatting
  var maxCols = 150;
  var maxRows = 50;
  var rangeAll = sheet.getRange(1, 1, maxRows, maxCols);
  rangeAll.setFontFamily("Prompt").setFontSize(10).setVerticalAlignment("middle").setHorizontalAlignment("center").setFontColor("#334155");
  
  // 1. Title Row (Row 1): Orange text, warm alert look exactly meeting the Thai screenshot
  var titleRange = sheet.getRange(1, 1, 1, maxCols);
  titleRange.merge();
  titleRange.setValue("[บันไดงู] ชีตสรุปการลงข้อมูลฝ่ายวิเคราะห์")
            .setFontSize(13)
            .setFontWeight("bold")
            .setFontColor("#b45309") // bold orange
            .setBackground("#fef3c7") // warm light yellow-orange bg
            .setHorizontalAlignment("center");
  sheet.setRowHeight(1, 38);
  
  sheet.setRowHeight(2, 24);
  sheet.setRowHeight(3, 22);
  
  // Cell A3 label
  sheet.getRange(3, 1).setValue("บ้าน").setFontWeight("bold").setBackground("#f1f5f9");
  
  // 2. Generate Rounds
  var roundNames = ["Trial"];
  for (var r = 1; r <= 25; r++) {
    roundNames.push("Round " + r);
  }
  
  for (var idx = 0; idx < roundNames.length; idx++) {
    var startCol = 2 + idx * 5;
    
    // Group Header: Trial or Round X
    var roundRange = sheet.getRange(2, startCol, 1, 4);
    roundRange.merge();
    roundRange.setValue(roundNames[idx])
              .setFontWeight("bold")
              .setFontColor("#b91c1c") // dark red
              .setBackground("#fee2e2") // very soft red bg
              .setHorizontalAlignment("center");
              
    // Sub-headers
    sheet.getRange(3, startCol).setValue("Stand บน").setFontWeight("bold").setBackground("#ffedd5"); // peach orange bg
    sheet.getRange(3, startCol + 1).setValue("การ์ดพิเศษ").setFontWeight("bold").setBackground("#fafaf9"); 
    sheet.getRange(3, startCol + 2).setValue("Stand ล่าง").setFontWeight("bold").setBackground("#ffedd5");
    sheet.getRange(3, startCol + 3).setValue("การ์ดพิเศษ").setFontWeight("bold").setBackground("#fafaf9");
    
    // Spacer Column
    var spacerCol = startCol + 4;
    sheet.getRange(2, spacerCol, 2, 1).setBackground("#ffffff");
    sheet.setColumnWidth(spacerCol, 25);
  }
  
  // 3. Write 'บ้าน 1' to 'บ้าน 12' in Column A (Rows 4 to 15)
  for (var i = 1; i <= 12; i++) {
    var rowIdx = 3 + i;
    sheet.getRange(rowIdx, 1).setValue("บ้าน " + i).setFontWeight("bold").setBackground("#f8fafc");
    sheet.setRowHeight(rowIdx, 24);
  }
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
    
    if (data.action === "addRoll") {
      return processAddRoll(ss, data);
    }
    
    if (data.action === "format") {
      let logSheet = ss.getSheetByName("Roll Logs");
      let stateSheet = ss.getSheetByName("Board States");
      let summarySheet = ss.getSheetByName(SHEET_NAME);
      
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
  
  // Ensure main visual analysis sheet exists
  let summarySheet = ss.getSheetByName(SHEET_NAME);
  if (!summarySheet) {
    summarySheet = ss.insertSheet(SHEET_NAME);
  }
  
  var currentTitle = "";
  try {
    currentTitle = summarySheet.getRange(1, 1).getValue().toString();
  } catch(err) {}
  
  if (currentTitle.indexOf("[บันไดงู]") === -1) {
    initializeAnalysisSheet(summarySheet);
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
  
  // 3. Update the visual Excel analysis sheet columns
  // Find row for this House (บ้าน 1 to บ้าน 12)
  const summaryData = summarySheet.getDataRange().getValues();
  let summaryRowIndex = -1;
  for (let i = 3; i < summaryData.length; i++) {
    var sheetBaan = summaryData[i][0];
    if (sheetBaan === normalizedThaiBaan || sheetBaan === data.baan) {
      summaryRowIndex = i + 1; // 1-indexed
      break;
    }
  }
  
  // Fallback row if not matched
  if (summaryRowIndex === -1) {
    summaryRowIndex = summarySheet.getLastRow() + 1;
    summarySheet.getRange(summaryRowIndex, 1).setValue(normalizedThaiBaan).setFontWeight("bold").setBackground("#f1f5f9");
    summarySheet.setRowHeight(summaryRowIndex, 24);
  }
  
  // Column calculation based on target round selection
  var roundVal = data.round || "Trial";
  try {
    if (!data.round) {
      roundVal = PropertiesService.getScriptProperties().getProperty("activeRound") || "Trial";
    }
  } catch (err) {}

  // Parse roundIndex dynamically (supports flexible formatting like "3", "Round 3")
  var roundIndex = 0;
  var match = roundVal.toString().match(/\\d+/);
  if (match) {
    roundIndex = parseInt(match[0], 10);
  } else if (roundVal.toString().toLowerCase().indexOf("trial") !== -1) {
    roundIndex = 0;
  } else {
    // Basic fallback mapping
    if (roundVal === "1") roundIndex = 1;
    else if (roundVal === "2") roundIndex = 2;
    else if (roundVal === "3") roundIndex = 3;
    else if (roundVal === "4") roundIndex = 4;
  }
  
  var stand1Col = 2 + roundIndex * 5;
  var stand2Col = 4 + roundIndex * 5;
  
  // Explicit signed strings like "+3" or "-5"
  var s1ValStr = (data.stand1 > 0 ? "+" : "") + data.stand1;
  var s2ValStr = (data.stand2 > 0 ? "+" : "") + data.stand2;
  
  summarySheet.getRange(summaryRowIndex, stand1Col).setValue(s1ValStr);
  summarySheet.getRange(summaryRowIndex, stand2Col).setValue(s2ValStr);
  
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

    if (action === "format") {
      let logSheet = ss.getSheetByName("Roll Logs");
      let stateSheet = ss.getSheetByName("Board States");
      let summarySheet = ss.getSheetByName(SHEET_NAME);
      
      if (logSheet) formatSheetBeauty(logSheet);
      if (stateSheet) formatSheetBeauty(stateSheet);
      if (summarySheet) formatSheetBeauty(summarySheet);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Sheets stylized and auto-resized successfully" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Look first in Board States sheet, fallback to SHEET_NAME
    let stateSheet = ss.getSheetByName("Board States");
    if (!stateSheet) {
      stateSheet = ss.getSheetByName(SHEET_NAME);
    }
    
    if (!stateSheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: "States sheet not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    const data = stateSheet.getDataRange().getValues();
    const passwords = {};
    const positions = {};
    
    for (let i = 1; i < data.length; i++) {
      const player = data[i][0]; 
      const square = data[i][1]; 
      const pass = data[i][2]; 
      
      if (player) {
        // Map back to standard "Baan X" so the client state binds perfectly
        var normalizedEnglishBaan = player.replace("บ้าน ", "Baan ");
        passwords[normalizedEnglishBaan] = String(pass);
        positions[normalizedEnglishBaan] = Number(square) || 1;
      }
    }
    
    var activeRound = "Trial";
    try {
      activeRound = PropertiesService.getScriptProperties().getProperty("activeRound") || "Trial";
    } catch(err) {}
    
    return ContentService.createTextOutput(JSON.stringify({ passwords, positions, activeRound }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
};
