import { setupMenu } from "./menu";
import { connectToAP, getChecks, type BingoSlotData, type HintData } from "./ap";
import { createBoard, restoreSquareText } from "./board";
import APLogo from './assets/icons/APLogo.png';
import { Hint } from "archipelago.js";

(document.head.querySelector("link[rel=icon]") as HTMLLinkElement || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "icon" })) as HTMLLinkElement).href = APLogo;

const menuButtonImg = document.querySelector('#menuButton img') as HTMLImageElement;
menuButtonImg.src = APLogo;

// Styling
const COLORS = {
    highlight: "#FF6F63",
    squareReceived: "#42B35D",
    headerDefault: "#3575DB",
    headerReceived: "#358F4A",
};

let scale = 1;
let minScale = 1;
const viewport = document.getElementById('viewport');

window.addEventListener('load', computeMinScale);

viewport.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();

        const delta = -e.deltaY * 0.001;
        scale += delta;

        // 👇 THIS is the important part
        scale = Math.max(minScale, Math.min(scale, 2.5));

        applyZoom();
    }
}, { passive: false });

// Menu Set-up
setupMenu(async (host, port, slot, password) => {
    try {
        const { client, slotdata } = await connectToAP<BingoSlotData>(host, port, slot, password);

        // No4mqlize additional bingos
        slotdata.additionalBingos = slotdata.additionalBingos ?? [];

        // Set page title and create board
        document.title = `${slot} - Archipelago Bingo`;

        if (slotdata.autoHints) {
            //Hint starting Square
            const hint = findHint(slotdata.hintData, slotdata.startSquare);
            if (hint) client.HintSquare(...hint);
        }

        createBoard(slotdata.boardSize, slotdata.boardLocations, slotdata.fogOfWar, slotdata.startSquare);


        // Update board squares and run bingo checks

        const updateSquaresAndCheck = () => {

            const receivedSquares = new Set(client.items.received.map(item => item.name));

            // Update board UI
            receivedSquares.forEach(setReceived);

            //Reveal squares for fog of war
            if (slotdata.fogOfWar) {
                const squares = new Set<string>();

                receivedSquares.forEach(square => {
                    getAdjacentSquares(slotdata.boardSize, square.toString()).forEach(adj => squares.add(adj));
                });

                squares.forEach(square => {
                    restoreSquareText(square);

                    if (slotdata.autoHints) {
                        const hint = findHint(slotdata.hintData, square);
                        if (hint) client.HintSquare(...hint);
                    }
                });

            }

            // Run bingo/check logic
            getChecks(receivedSquares, slotdata, client);
        };

        // Handle already received items
        updateSquaresAndCheck();

        // Handle future items
        client.items.on("itemsReceived", updateSquaresAndCheck);

        // Player search filter
        setupPlayerSearchFilter();
    } catch (err) {
        console.error("Login failed", err);
    }
});

// Update a single square's appearance
function setReceived(squareName: string) {

    const squareDiv = document.querySelector<HTMLDivElement>(`.square[data-square="${squareName}"]`);
    if (!squareDiv) return;

    squareDiv.style.backgroundColor = COLORS.squareReceived;

    const header = squareDiv.querySelector<HTMLDivElement>(".square-header");
    if (!header) return;

    header.style.backgroundColor = COLORS.headerReceived;
    header.dataset.defaultColor = COLORS.headerReceived;
}

// Set up player search filter
function setupPlayerSearchFilter() {
    const searchInput = document.getElementById("playerSearch") as HTMLInputElement;
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        const headers = document.querySelectorAll<HTMLDivElement>(".square-header");

        headers.forEach(header => {
            const defaultColor = header.dataset.defaultColor ?? COLORS.headerDefault;
            header.style.backgroundColor = query && header.textContent === query
                ? COLORS.highlight
                : defaultColor;
        });
    });
}

//Gets Adjacent Squares
function getAdjacentSquares(boardSize: number, square: string) {
    const col = square[0].toUpperCase(); // 'A'..'E'
    const row = parseInt(square.slice(1)); // 1..5

    const colIndex = col.charCodeAt(0) - "A".charCodeAt(0); // 0-based index
    const rowIndex = row - 1; // 0-based index

    const adjacent = [];

    //Add original square
    adjacent.push(square)

    // Up
    if (rowIndex > 0) adjacent.push(`${col}${row - 1}`);
    // Down
    if (rowIndex < boardSize - 1) adjacent.push(`${col}${row + 1}`);
    // Left
    if (colIndex > 0) adjacent.push(`${String.fromCharCode(col.charCodeAt(0) - 1)}${row}`);
    // Right
    if (colIndex < boardSize - 1) adjacent.push(`${String.fromCharCode(col.charCodeAt(0) + 1)}${row}`);


    return adjacent;
}

const findHint = (hintData: HintData[], itemName: string): [number, number] | undefined => {
    const h = hintData.find(x => x.itemName === itemName);
    return h ? [h.id, h.player] : undefined;
};
function computeMinScale() {
    const container = document.getElementById('bingoContainer');
    const viewport = document.getElementById('viewport');

    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;

    const cw = container.offsetWidth;
    const ch = container.offsetHeight;

    const scaleX = vw / cw;
    const scaleY = vh / ch;

    // Fit entire board
    minScale = Math.min(scaleX, scaleY);

    scale = minScale;

    applyZoom();
}

function applyZoom() {
    const zoomLayer = document.getElementById('zoomLayer');
    zoomLayer.style.transform = `scale(${scale})`;
}