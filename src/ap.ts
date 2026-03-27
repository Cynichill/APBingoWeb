import { Client } from "archipelago.js";

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
};

/* ==============================
   Connect to Archipelago
============================== */
export async function connectToAP<T>(host: string, port: number, slot: string) {

    const client = new Client();
    const hostport = `${host}:${port}`;
    //Sign in to AP server
    const slotdata = await client.login<BingoSlotData>(hostport, slot, "APBingo");
    return { client, slotdata };
}

/* ==============================
   Check Bingos
============================== */
export function getChecks(
    squares: Set<string>,
    slotdata: BingoSlotData,
    client: Client
) {
    let achievedBingos: string[] = [];

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

    // Check for Bingo ALL
    if (squares.size === slotdata.boardSize * slotdata.boardSize) {
        achievedBingos.push("Bingo (ALL)");
    }

    // Check Goal
    if (achievedBingos.length >= slotdata.requiredBingoCount) {
        client.goal(); // You win!
    }

    // Get all checks for aquired bingos
    const maxChecks = Math.ceil(
        (slotdata.boardSize * slotdata.boardSize) / (2 * slotdata.boardSize + 3)
    );

    achievedBingos = achievedBingos.flatMap(bingo =>
        Array.from({ length: maxChecks }, (_, i) => `${bingo}-${i}`)
    );

    // Send checks
    const pkg = client.package.findPackage(client.game);
    if (pkg != null) {
        for (const bingo of achievedBingos) {
            const checkId = pkg.locationTable[bingo];
            if (checkId !== undefined) {
                client.check(checkId); // bingo exists, call check
            }
        }
    }
}