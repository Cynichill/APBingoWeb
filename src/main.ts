import { setupMenu } from "./menu";
import { connectToAP, getChecks, type BingoSlotData } from "./ap";
import { createBoard } from "./board";

// Styling
const COLORS = {
    highlight: "#FF6F63",
    squareReceived: "#42B35D",
    headerDefault: "#3575DB",
    headerReceived: "#358F4A",
};

// Menu Set-up
setupMenu(async (host, port, slot) => {
    try {
        const { client, slotdata } = await connectToAP<BingoSlotData>(host, port, slot);

        // Set page title and create board
        document.title = `${slot} - Archipelago Bingo`;
        createBoard(slotdata.boardSize, slotdata.boardLocations);


        // Update board squares and run bingo checks

        const updateSquaresAndCheck = () => {
            const receivedSquares = new Set(client.items.received.map(item => item.name));

            // Update board UI
            receivedSquares.forEach(setReceived);

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

    searchInput.style.width = "200px";
    searchInput.style.padding = "4px 6px";
    searchInput.style.fontSize = "12px";

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