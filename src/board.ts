export function createBoard(
    size: number,
    texts: string[],
    fog: boolean,
    reveal: string
) {
    const container = document.getElementById("bingoContainer")!;
    container.innerHTML = "";

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Include headers (extra row/col for labels)
    const total = size + 1;

    // Determine maximum square size that fits viewport
    const viewportWidth = window.innerWidth * 0.95; // leave 5% padding
    const viewportHeight = window.innerHeight * 0.95;
    const maxSquare = Math.floor(Math.min(viewportWidth, viewportHeight) / total);

    // Set grid layout
    container.style.display = "grid";
    container.style.gridTemplateColumns = `auto repeat(${size}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${size + 1}, 1fr)`;

    container.appendChild(document.createElement("div")); // top-left corner

    // Column headers
    for (let col = 0; col < size; col++) {
        const header = document.createElement("div");
        header.className = "header";
        header.textContent = letters[col] ?? "";
        container.appendChild(header);
    }

    // Rows and squares
    for (let row = 0; row < size; row++) {
        // Row header
        const rowHeader = document.createElement("div");
        rowHeader.className = "header";
        rowHeader.textContent = String(row + 1);
        container.appendChild(rowHeader);

        for (let col = 0; col < size; col++) {
            const square = document.createElement("div");
            square.className = "square";
            square.style.position = "relative";

            const coord = `${letters[col]}${row + 1}`;
            square.dataset.square = coord;

            const rawText = texts?.[col * size + row] ?? coord;
            const slotName = handleSlotName(rawText, true);
            const cleanText = handleSlotName(rawText, false)!;
            square.dataset.originalHeader = slotName; 
            square.dataset.originalText = cleanText;

            // Determine if this square should show real content
            const isRevealed = !fog || reveal === coord;

            // Header (slot name)
            const top = document.createElement("div");
            top.className = "square-header";
            top.textContent = isRevealed ? (slotName ?? "") : "?????";
            top.style.fontSize = `${Math.max(8, maxSquare * 0.2)}px`;

            // Body (main content)
            const body = document.createElement("div");
            body.className = "square-body";
            body.textContent = isRevealed ? (cleanText ?? "") : "?????";
            body.title = isRevealed ? (cleanText ?? "") : "?????";
            body.style.fontSize = `${Math.max(7, maxSquare * 0.2)}px`;

            // Star element
            const star = document.createElement("div");
            star.className = "square-star";
            star.textContent = "★";
            star.style.display = "none"; // hidden initially
            star.style.position = "absolute";
            star.style.top = "-2px";
            star.style.right = "4px";
            star.style.color = "gold";
            star.style.fontSize = "16px";
            star.style.pointerEvents = "none";
            star.style.userSelect = "none";

            // Append elements
            square.appendChild(star);
            square.appendChild(top);
            square.appendChild(body);

            // Toggle star on click
            square.addEventListener("click", () => {
                star.style.display = star.style.display === "none" ? "block" : "none";
            });

            container.appendChild(square);
        }
    }
}

// If extract is true, returns the content inside (...); if false, returns string without (...).
function handleSlotName(text: string, extract: boolean): string | null {
    const lastOpen = text.lastIndexOf("(");
    const lastClose = text.lastIndexOf(")");

    if (lastOpen === -1 || lastClose === -1 || lastClose < lastOpen) {
        return extract ? null : text;
    }

    return extract
        ? text.slice(lastOpen + 1, lastClose)
        : text.slice(0, lastOpen).trim();
}

export function updateSquareText(
    coord: string,       // e.g., "A1"
    newHeader?: string,  // optional: top text (slot name)
    newBody?: string     // optional: main body text
) {
    const square = document.querySelector<HTMLDivElement>(
        `.square[data-square="${coord}"]`
    );
    if (!square) return; // square not found

    if (newHeader) {
        const top = square.querySelector<HTMLDivElement>(".square-header");
        if (top) top.textContent = newHeader;
    }

    if (newBody) {
        const body = square.querySelector<HTMLDivElement>(".square-body");
        if (body) {
            body.textContent = newBody;
            body.title = newBody; // update tooltip too
        }
    }
}

export function restoreSquareText(coord: string) {
    const square = document.querySelector<HTMLDivElement>(
        `.square[data-square="${coord}"]`
    );
    if (!square) return; // square not found

    const originalHeader = square.dataset.originalHeader ?? "";
    const originalText = square.dataset.originalText ?? "";

    const top = square.querySelector<HTMLDivElement>(".square-header");
    const body = square.querySelector<HTMLDivElement>(".square-body");

    if (top) top.textContent = originalHeader;
    if (body) {
        body.textContent = originalText;
        body.title = originalText;
    }
}