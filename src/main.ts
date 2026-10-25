import { setupMenu } from "./menu";
import { connectToAP, getChecks, type BingoSlotData, type HintData } from "./ap";
import { createBoard, restoreSquareText } from "./board";
import { Client } from "archipelago.js";
import APLogo from './assets/icons/APLogo.png';
import { Hint } from "archipelago.js";

(document.head.querySelector("link[rel=icon]") as HTMLLinkElement || document.head.appendChild(Object.assign(document.createElement("link"), { rel: "icon" })) as HTMLLinkElement).href = APLogo;

const menuButtonImg = document.querySelector('#menuButton img') as HTMLImageElement;
menuButtonImg.src = APLogo;

// ==============================
//   Theme System
// ==============================
const themeSelect = document.getElementById("themeSelect") as HTMLSelectElement;
const savedTheme = localStorage.getItem("bingo-theme") || "";
if (savedTheme) {
    // Validate the saved theme still exists as an option
    const isValid = themeSelect.querySelector<HTMLOptionElement>(`option[value="${savedTheme}"]`);
    if (isValid) {
        document.documentElement.dataset.theme = savedTheme;
        themeSelect.value = savedTheme;
    } else {
        localStorage.removeItem("bingo-theme");
    }
}
themeSelect.addEventListener("change", () => {
    const theme = themeSelect.value;
    if (theme) {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem("bingo-theme", theme);
    } else {
        delete document.documentElement.dataset.theme;
        localStorage.removeItem("bingo-theme");
    }
});

let scale = 1;
let minScale = 1;
const viewport = document.getElementById('viewport');

window.addEventListener('load', computeMinScale);
window.addEventListener('resize', computeMinScale);

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

        // Fit the board to the viewport now that the grid exists
        computeMinScale();

        // Set up the text client panel
        setupTextClient(client);


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

// Update a single square's appearance using CSS classes
function setReceived(squareName: string) {

    const squareDiv = document.querySelector<HTMLDivElement>(`.square[data-square="${squareName}"]`);
    if (!squareDiv) return;

    // Skip if already marked received
    if (squareDiv.classList.contains("received")) return;

    squareDiv.classList.add("received", "received-animate");

    // Remove the animation class after it completes so it doesn't replay
    squareDiv.addEventListener("animationend", () => {
        squareDiv.classList.remove("received-animate");
    }, { once: true });
}

// Set up player search filter
function setupPlayerSearchFilter() {
    const searchInput = document.getElementById("playerSearch") as HTMLInputElement;
    if (!searchInput) return;

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim();
        const squares = document.querySelectorAll<HTMLDivElement>(".square");

        squares.forEach(square => {
            const header = square.querySelector<HTMLDivElement>(".square-header");
            if (!header) return;

            const isMatch = query && header.textContent === query;

            // Toggle outline on the square (always)
            square.classList.toggle("search-match", isMatch);

            // Only highlight the header if the square isn't already received
            const isReceived = square.classList.contains("received");
            header.classList.toggle("search-highlight", isMatch && !isReceived);

            // If no match and not received, restore default header style
            if (!isMatch && !header.classList.contains("search-highlight")) {
                header.style.backgroundColor = "";
            }
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

    // Guard: board hasn't been created yet
    if (cw === 0 || ch === 0) return;

    const scaleX = vw / cw;
    const scaleY = vh / ch;

    // Fit entire board
    minScale = Math.min(scaleX, scaleY);

    scale = minScale;

    applyZoom();
}

function applyZoom() {
    const zoomLayer = document.getElementById('zoomLayer');
    const container = document.getElementById('viewport');

    // Scale from top-left
    zoomLayer.style.transformOrigin = '0 0';
    zoomLayer.style.transform = `scale(${scale})`;

    // Clear any prior overrides so we read intrinsic content size
    zoomLayer.style.width  = '';
    zoomLayer.style.height = '';
    zoomLayer.style.marginRight  = '';
    zoomLayer.style.marginBottom = '';
    zoomLayer.style.marginLeft   = '';
    zoomLayer.style.marginTop    = '';

    const intrinsicW = zoomLayer.scrollWidth;
    const intrinsicH = zoomLayer.scrollHeight;

    // The visual size after transform
    const scaledW = intrinsicW * scale;
    const scaledH = intrinsicH * scale;

    // CSS transform doesn't change layout dimensions — the browser still sees
    // the full intrinsic size for overflow/scrollbar calculations. Use negative
    // margins to shrink the layout box to match the visual (scaled) size.
    zoomLayer.style.marginRight  = `${-(intrinsicW - scaledW)}px`;
    zoomLayer.style.marginBottom = `${-(intrinsicH - scaledH)}px`;

    // Center the board when it's smaller than the viewport
    const vw = container.clientWidth;
    const vh = container.clientHeight;

    if (scaledW < vw) {
        zoomLayer.style.marginLeft = `${(vw - scaledW) / 2}px`;
    }

    if (scaledH < vh) {
        zoomLayer.style.marginTop = `${(vh - scaledH) / 2}px`;
    }

    // Scroll to center when zoomed in past viewport
    container.scrollLeft = Math.max(0, (scaledW - vw) / 2);
    container.scrollTop  = Math.max(0, (scaledH - vh) / 2);
}


// ==============================
//   Collapsible Panel Sections
// ==============================
document.querySelectorAll<HTMLButtonElement>(".panel-section-header").forEach(header => {
    header.addEventListener("click", () => {
        const section = header.closest(".panel-section")!;
        const isCollapsed = section.classList.toggle("collapsed");
        header.setAttribute("aria-expanded", String(!isCollapsed));
    });
});

// ==============================
//   Text Client
// ==============================
function setupTextClient(client: Client) {
    const loginSection = document.getElementById("loginSection")!;
    const textClientSection = document.getElementById("textClientSection")!;
    const log = document.getElementById("textClientLog")!;
    const input = document.getElementById("textClientMessage") as HTMLInputElement;
    const sendBtn = document.getElementById("textClientSend")!;

    // Collapse login, expand text client on successful connection
    loginSection.classList.add("collapsed");
    loginSection.querySelector(".panel-section-header")!.setAttribute("aria-expanded", "false");
    textClientSection.classList.remove("collapsed");
    textClientSection.querySelector(".panel-section-header")!.setAttribute("aria-expanded", "true");

    // Append a message to the log
    function appendMessage(text: string, isSystem = false) {
        const p = document.createElement("p");
        p.textContent = text;
        if (isSystem) p.classList.add("system-message");
        log.appendChild(p);
        log.scrollTop = log.scrollHeight;
    }

    // Populate with any existing messages from the log
    for (const entry of client.messages.log) {
        appendMessage(entry.text);
    }

    // Listen for all incoming messages
    client.messages.on("message", (text) => {
        appendMessage(text);
    });

    // Send message on button click
    const sendMessage = () => {
        const text = input.value.trim();
        if (!text) return;
        client.messages.say(text);
        input.value = "";
    };

    sendBtn.addEventListener("click", sendMessage);

    // Send message on Enter key
    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            sendMessage();
        }
    });
}