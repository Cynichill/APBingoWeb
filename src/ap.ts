import { Client } from "archipelago.js";
import fanfareSound from './assets/sounds/fanfare.wav';
import victorySound from './assets/sounds/victory.mp3';
export type HintData = {
    itemName: string;
    name: string;
    id: number;
    player: number;
};

export type BingoSlotData = {
    requiredBingoCount: number;
    boardLocations: string[]; // Location description for each square
    boardSize: number;
    fogOfWar: boolean;
    startSquare: string;
    autoHints: boolean;
    hintData: HintData[];
    additionalBingos?: string[];
};

/* ==============================
   Connect to Archipelago
============================== */
export async function connectToAP<T>(host: string, port: number, slot: string, password: string) {

    sentBingos.clear();
    const client = new Client();
    const hostport = `${host}:${port}`;
    //Sign in to AP server
    const slotdata = await client.login<BingoSlotData>(hostport, slot, "APBingo", {password});
    return { client, slotdata };
}

/* ==============================
   Check Bingos
============================== */

const sentBingos = new Set<string>();

const jingle = new Audio(fanfareSound);
jingle.preload = 'auto'; // load in advance

jingle.volume = 0.5;

const victory = new Audio(victorySound)
victory.preload = 'auto'; // load in advance

victory.volume = 0.5;

// Load saved state (default = false)
let isMuted = localStorage.getItem('bingoMuted') === 'true';
const muteButton = document.getElementById('muteButton') as HTMLButtonElement;

// Update button on load
muteButton.textContent = isMuted ? '🔇' : '🔊';

// Toggle Mute
muteButton.addEventListener('click', () => {
    isMuted = !isMuted;

    // Save state
    localStorage.setItem('bingoMuted', isMuted.toString());

    // Update UI
    muteButton.textContent = isMuted ? '🔇' : '🔊';
});

export function getChecks(
    squares: Set<string>,
    slotdata: BingoSlotData,
    client: Client)
{
    let achievedBingos: string[] = [];
    let achievedSpecialBingos: string[] = []

    // Generate column labels (A, B, C, ...)
    const columns: string[] = Array.from(
        { length: slotdata.boardSize },
        (_, i) => String.fromCharCode("A".charCodeAt(0) + i)
    );

    // Generate row labels (1, 2, 3, ...)
    const rows: string[] = Array.from(
        { length: slotdata.boardSize },
        (_, i) => String(i + 1)
    );

    // Check Rows for Bingos
    for (const row of rows) {
        if (columns.every(col => squares.has(`${col}${row}`))) {
            achievedBingos.push(
                `Bingo (${columns[0]}${row}-${columns[columns.length - 1]}${row})`
            );
        }
    }

    // Check Columns for Bingos
    for (const col of columns) {
        if (rows.every(row => squares.has(`${col}${row}`))) {
            achievedBingos.push(
                `Bingo (${col}${rows[0]}-${col}${rows[rows.length - 1]})`
            );
        }
    }

    // Check top left to bottom right diagonal
    if (
        Array.from({ length: slotdata.boardSize }, (_, i) => `${columns[i]}${rows[i]}`).every(
            sq => squares.has(sq)
        )
    ) {
        achievedBingos.push(
            `Bingo (${columns[0]}1-${columns[slotdata.boardSize - 1]}${rows[slotdata.boardSize - 1]})`
        );
    }

    // Check bottom left to top right diagonal
    if (
        Array.from({ length: slotdata.boardSize }, (_, i) => `${columns[slotdata.boardSize - 1 - i]}${rows[i]}`).every(
            sq => squares.has(sq)
        )
    ) {
        achievedBingos.push(
            `Bingo (${columns[0]}${rows[rows.length - 1]}-${columns[columns.length - 1]}${rows[0]})`
        );
    }

    // Check for Blackout
    if (slotdata.additionalBingos.includes("Blackout")) {
        if (squares.size === slotdata.boardSize * slotdata.boardSize) {
            achievedSpecialBingos.push("Bingo (Blackout)");
        }
    }

    // Check for Corners
    if (slotdata.additionalBingos.includes("Corners")) {
        const cornerKeys = [
            `${columns[0]}${rows[0]}`,               // top-left
            `${columns[slotdata.boardSize - 1]}${rows[0]}`,   // top-right
            `${columns[0]}${rows[slotdata.boardSize - 1]}`,   // bottom-left
            `${columns[slotdata.boardSize - 1]}${rows[slotdata.boardSize - 1]}` // bottom-right
        ];

        if (cornerKeys.every(key => squares.has(key))) {
            achievedSpecialBingos.push("Bingo (Corners)");
        }
    }

    // Check for Edges
    if (slotdata.additionalBingos.includes("Pictureframe")) {
        const edgeKeys: string[] = [];

        for (const r of rows) {
            for (const c of columns) {
                // A square is on the edge if it's in the first/last row or first/last column
                if (r === rows[0] || r === rows[rows.length - 1] || c === columns[0] || c === columns[columns.length - 1]) {
                    edgeKeys.push(`${c}${r}`);
                }
            }
        }

        if (edgeKeys.every(key => squares.has(key))) {
            achievedSpecialBingos.push("Bingo (Pictureframe)");
        }
    }

    // Check for Checkerboard
    if (slotdata.additionalBingos.includes("Checkerboard")) {
        const checkerboardKeys: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < columns.length; j++) {
                // Normal checkerboard: (rowIndex + colIndex) % 2 === 0
                if ((i + j) % 2 === 0) {
                    checkerboardKeys.push(`${columns[j]}${rows[i]}`);
                }
            }
        }

        if (checkerboardKeys.every(key => squares.has(key))) {
            achievedSpecialBingos.push("Bingo (Checkerboard)");
        }
    }

    // Check for Reverse Checkerboard
    if (slotdata.additionalBingos.includes("Reverse Checkerboard")) {
        const reverseCheckerboardKeys: string[] = [];

        for (let i = 0; i < rows.length; i++) {
            for (let j = 0; j < columns.length; j++) {
                // Reverse checkerboard: (rowIndex + colIndex) % 2 === 1
                if ((i + j) % 2 === 1) {
                    reverseCheckerboardKeys.push(`${columns[j]}${rows[i]}`);
                }
            }
        }

        if (reverseCheckerboardKeys.every(key => squares.has(key))) {
            achievedSpecialBingos.push("Bingo (Reverse Checkerboard)");
        }
    }

    document.getElementById("bingoCounter").textContent = (achievedBingos.length + achievedSpecialBingos.length) + "/" + slotdata.requiredBingoCount + " Goal";

    // Check Goal
    if ((achievedBingos.length + achievedSpecialBingos.length) >= slotdata.requiredBingoCount) {
        client.goal(); // You win!
        if (!isMuted) {
            victory.currentTime = 0; // reset to start
            victory.play();
        }
    }

    // Get all checks for aquired bingos
    const maxChecks = Math.ceil(
        (slotdata.boardSize * slotdata.boardSize) / (2 * slotdata.boardSize + 3)
    );

    achievedBingos = achievedBingos.flatMap(bingo =>
        Array.from({ length: maxChecks }, (_, i) => `${bingo}-${i}`)
    );

    const merged = [...achievedBingos, ...achievedSpecialBingos];

    // Filter to only new bingos that haven't been sent yet
    const newBingos = merged.filter(bingo => !sentBingos.has(bingo));

    const audio = document.getElementById('jingle');

    // Send checks
    const pkg = client.package.findPackage(client.game);
    if (pkg != null) {
        for (const bingo of newBingos) {
            const checkId = pkg.locationTable[bingo];
            if (checkId !== undefined) {
                client.check(checkId); // bingo exists, call check
                if (!isMuted) {
                    jingle.currentTime = 0; // reset to start
                    jingle.play();
                }

                // Mark as sent so we don't send/play it again
                sentBingos.add(bingo);
            }
        }
    }
 }