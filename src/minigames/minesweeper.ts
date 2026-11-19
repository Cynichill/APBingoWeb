import type { Minigame } from "./types";

import flagImage from "../assets/minigames/minesweeper/flag.png";
import mineImage from "../assets/minigames/minesweeper/mine.png";

import loseSoundFile from "../assets/minigames/snake/Lose.wav";
import startSoundFile from "../assets/minigames/snake/Start.wav";
import scoreSoundFile from "../assets/minigames/snake/Score Pass.wav";
import devScoreSoundFile from "../assets/minigames/snake/golfclap.wav";

function makeSound(file: string, volume: number): HTMLAudioElement {
    const sound = new Audio(file);
    sound.preload = "auto";
    sound.volume = volume;
    return sound;
}


// SFX
const loseSound = makeSound(loseSoundFile, 0.5);
const startSound = makeSound(startSoundFile, 0.5);
const scoreSound = makeSound(scoreSoundFile, 0.5);
const devScoreSound = makeSound(devScoreSoundFile, 0.2);

// Play SFX (if not muted)
function playSound(sound: HTMLAudioElement): void {
    if (localStorage.getItem("bingoMuted") === "true") return;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

const GRID = 9; // Board size (9x9)
const MINES = 10; // Mine count

let finalTime = 0;

export const minesweeperGame: Minigame = {
    id: "minesweeper",
    name: "Minesweeper",
    goal: 45000,
    highScore: 0,
    devScore: 9550,
    scoreType: "time",
    lowerIsBetter: true,   // Fastest time score

    start(container, onGameLost) {
        let state: "ready" | "playing" | "over" = "ready";
        let startedAt = 0;
        let busy = false;

        const mines = new Set<number>();   // stores y * GRID + x

        // Build the grid
        const grid = document.createElement("div");
        grid.className = "cell-grid";
        grid.style.setProperty("--grid", String(GRID));

        for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
                const cell = document.createElement("button");
                cell.type = "button";
                cell.className = "cell";
                cell.dataset.x = String(x);
                cell.dataset.y = String(y);
                grid.appendChild(cell);
            }
        }

        container.appendChild(grid);

        function getCell(e: Event): HTMLButtonElement | null {
            return (e.target as HTMLElement).closest<HTMLButtonElement>(".cell");
        }


        // Fill board
        function placeMines(safeX: number, safeY: number): void {
            mines.clear();

            // Every square except the clicked one and its neighbours
            const candidates: number[] = [];
            for (let y = 0; y < GRID; y++) {
                for (let x = 0; x < GRID; x++) {
                    if (Math.abs(x - safeX) <= 1 && Math.abs(y - safeY) <= 1) continue;
                    candidates.push(y * GRID + x);
                }
            }

            // Mine shuffler
            for (let i = 0; i < MINES; i++) {
                const j = i + Math.floor(Math.random() * (candidates.length - i));
                const picked = candidates[j]!;
                candidates[j] = candidates[i]!;
                candidates[i] = picked;
                mines.add(picked);
            }
        }


        // Reset game
        function reset(): void {
            grid.querySelectorAll<HTMLButtonElement>(".cell").forEach(cell => {
                cell.classList.remove("revealed", "flagged", "exploded");
                cell.querySelector(".cell__flag")?.remove();
                cell.querySelector(".cell__mine")?.remove();
                cell.textContent = "";
                delete cell.dataset.n;
            });

            startedAt = 0;
            busy = false;
            finalTime = 0;
            state = "ready";
            playSound(startSound);
        }


        // Count mines
        function countAdjacent(x: number, y: number): number {
            let count = 0;

            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;

                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;

                    if (mines.has(ny * GRID + nx)) count++;
                }
            }

            return count;
        }

        // Reveal squares with 0 mines surrounding them (cascade)
        function revealFrom(startX: number, startY: number): void {
            const stack: [number, number][] = [[startX, startY]];

            while (stack.length > 0) {
                const [x, y] = stack.pop()!;
                const cell = grid.children[y * GRID + x] as HTMLButtonElement;

                if (cell.classList.contains("revealed") || cell.classList.contains("flagged")) continue;

                cell.classList.add("revealed");

                const count = countAdjacent(x, y);

                if (count > 0) {
                    cell.textContent = String(count);
                    cell.dataset.n = String(count);
                    continue;   // a number: don't spread further
                }

                // A zero: queue all 8 neighbours
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const nx = x + dx;
                        const ny = y + dy;
                        if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) continue;
                        stack.push([nx, ny]);
                    }
                }
            }
        }


        // Winner!
        function winGame(): void {
            state = "over";
            const time = Math.round(performance.now() - startedAt);

            // Flag any mines the player didn't flag
            grid.querySelectorAll<HTMLButtonElement>(".cell").forEach(cell => {
                const index = Number(cell.dataset.y) * GRID + Number(cell.dataset.x);
                if (!mines.has(index) || cell.classList.contains("flagged")) return;

                cell.classList.add("flagged");

                const img = document.createElement("img");
                img.className = "cell__flag";
                img.src = flagImage;
                img.alt = "";
                cell.appendChild(img);
            });

            finalTime = time;

            playSound(time <= minesweeperGame.devScore ? devScoreSound : scoreSound);

            onGameLost?.(time, true);
        }


        // Check if all non-mines are revealed
        function hasWon(): boolean {
            return grid.querySelectorAll(".cell.revealed").length === GRID * GRID - MINES;
        }

        // Game Over
        function revealMines(): void {
            grid.querySelectorAll<HTMLButtonElement>(".cell").forEach(cell => {
                const index = Number(cell.dataset.y) * GRID + Number(cell.dataset.x);

                // Skip safe squares, and keep correctly flagged mines showing their flag
                if (!mines.has(index) || cell.classList.contains("flagged")) return;

                cell.classList.add("revealed");

                const img = document.createElement("img");
                img.className = "cell__mine";
                img.src = mineImage;
                img.alt = "";
                cell.appendChild(img);
            });
        }

        function loseGame(hit?: HTMLButtonElement): void {
            finalTime = Math.round(performance.now() - startedAt);
            state = "over";
            hit?.classList.add("exploded");
            revealMines();
            playSound(loseSound);
            onGameLost?.(0, false);
        }

        function onClick(e: MouseEvent): void {
            const cell = getCell(e);
            if (!cell || busy) return;

            // After a finished game, any click starts a new one
            if (state === "over") {
                reset();
                return;
            }

            // Can't click revealed or flagged tiles
            if (cell.classList.contains("flagged") || cell.classList.contains("revealed")) return;

            const x = Number(cell.dataset.x);
            const y = Number(cell.dataset.y);

            // First click: start the timer and place the mines around it
            if (state === "ready") {
                state = "playing";
                startedAt = performance.now();
                placeMines(x, y);
            }

            busy = true;

            if (mines.has(y * GRID + x)) {
                cell.classList.add("revealed");
                loseGame(cell);
            } else {
                revealFrom(x, y);
                if (hasWon()) winGame();
            }

            busy = false;
        }

        function onContextMenu(e: MouseEvent): void {
            e.preventDefault(); // stops the browser's right-click menu

            const cell = getCell(e);
            if (!cell || busy || state === "over") return;
            if (cell.classList.contains("revealed")) return;

            const flagged = cell.classList.toggle("flagged");

            if (flagged) {
                const img = document.createElement("img");
                img.className = "cell__flag";
                img.src = flagImage;
                img.alt = "";
                cell.appendChild(img);
            } else {
                cell.querySelector(".cell__flag")?.remove();
            }
        }

        grid.addEventListener("click", onClick);
        grid.addEventListener("contextmenu", onContextMenu);

        reset();

        minesweeperGame.kill = () => {if (state === "playing") loseGame();};

        minesweeperGame.getCurrent = () => state === "playing" ? Math.round(performance.now() - startedAt) : finalTime;

        return () => {
            minesweeperGame.kill = undefined;
            minesweeperGame.getCurrent = undefined;
            grid.removeEventListener("click", onClick);
            grid.removeEventListener("contextmenu", onContextMenu);
            grid.remove();
        };
    },
};