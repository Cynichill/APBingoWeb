export function createBoard(size: number, texts?: string[]) {
    const container = document.getElementById("bingoContainer")!;
    container.innerHTML = "";

    // +1 for headers
    container.style.gridTemplateColumns = `repeat(${size + 1}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${size + 1}, 1fr)`;

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    // Top-left empty corner
    container.appendChild(document.createElement("div"));

    // Column headers (A-Z)
    for (let col = 0; col < size; col++) {
        const header = document.createElement("div");
        header.className = "header";

        const letter = letters[col];
        if (!letter) continue;

        header.textContent = letter;
        container.appendChild(header);
    }

    // Rows
    for (let row = 0; row < size; row++) {
        // Row header (numbers)
        const rowHeader = document.createElement("div");
        rowHeader.className = "header";
        rowHeader.textContent = String(row + 1);
        container.appendChild(rowHeader);

        // Squares
        for (let col = 0; col < size; col++) {
            const square = document.createElement("div");
            square.className = "square";

            const letter = letters[col];
            if (!letter) continue;

            const coord = `${letter}${row + 1}`;

            // ✅ COLUMN-MAJOR FIX
            const index = col * size + row;

            // Raw text or fallback
            const rawText =
                texts && texts[index] ? texts[index] : coord;

            // Extract + clean
            const slotName = extractSlotName(rawText);
            const cleanText = removeSlotName(rawText);

            // Header (slot name)
            const top = document.createElement("div");
            top.className = "square-header";
            top.textContent = slotName ?? "";

            // Body (cleaned text)
            const body = document.createElement("div");
            body.className = "square-body";
            body.textContent = cleanText;
            body.title = cleanText;

            square.appendChild(top);
            square.appendChild(body);

            container.appendChild(square);
        }
    }
}

/**
 * Extracts the final (...) group from the string
 */
function extractSlotName(text: string): string | null {
    const lastOpen = text.lastIndexOf("(");
    const lastClose = text.lastIndexOf(")");

    if (lastOpen === -1 || lastClose === -1 || lastClose < lastOpen) {
        return null;
    }

    return text.slice(lastOpen + 1, lastClose);
}

/**
 * Removes the final (...) group from the string
 */
function removeSlotName(text: string): string {
    const lastOpen = text.lastIndexOf("(");
    const lastClose = text.lastIndexOf(")");

    if (lastOpen === -1 || lastClose === -1 || lastClose < lastOpen) {
        return text;
    }

    return text.slice(0, lastOpen).trim();
}