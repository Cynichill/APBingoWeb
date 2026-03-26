export function createBoard(size: number, texts?: string[]) {
    const container = document.getElementById("bingoContainer")!;
    container.innerHTML = "";

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Include headers
    const total = size + 1;

    // Determine maximum square size that fits viewport
    const viewportWidth = window.innerWidth * 0.95; // leave 5% padding
    const viewportHeight = window.innerHeight * 0.95;
    const maxSquare = Math.floor(Math.min(viewportWidth, viewportHeight) / total);

    // Set grid layout
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

        // Squares
        for (let col = 0; col < size; col++) {
            const square = document.createElement("div");
            square.className = "square";
            square.style.position = "relative"; // for star positioning

            const coord = `${letters[col]}${row + 1}`;
            square.dataset.square = coord;

            const rawText = texts?.[col * size + row] ?? coord;
            const slotName = handleSlotName(rawText, true);   // extract content inside (...)
            const cleanText = handleSlotName(rawText, false)!; // remove the (...) group

            // Header (slot name)
            const top = document.createElement("div");
            top.className = "square-header";
            top.textContent = slotName ?? "";
            top.style.fontSize = `${Math.max(8, maxSquare * 0.2)}px`;

            // Body (main content)
            const body = document.createElement("div");
            body.className = "square-body";
            body.textContent = cleanText;
            body.title = cleanText;
            body.style.fontSize = `${Math.max(7, maxSquare * 0.15)}px`;

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