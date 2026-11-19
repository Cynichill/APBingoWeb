import type { Minigame } from "./types";

import eatSoundFile from "../assets/minigames/snake/Pickup.wav";
import loseSoundFile from "../assets/minigames/snake/Lose.wav";
import startSoundFile from "../assets/minigames/snake/Start.wav";
import scoreSoundFile from "../assets/minigames/snake/Score Pass.wav";
import devScoreSoundFile from "../assets/minigames/snake/golfclap.wav";

const eatSound = new Audio(eatSoundFile);
eatSound.preload = "auto";
eatSound.volume = 0.5;

const loseSound = new Audio(loseSoundFile);
loseSound.preload = "auto";
loseSound.volume = 0.5;

const startSound = new Audio(startSoundFile);
loseSound.preload = "auto";
loseSound.volume = 0.5;


const scoreSound = new Audio(scoreSoundFile);
loseSound.preload = "auto";
loseSound.volume = 0.5;


const devScoreSound = new Audio(devScoreSoundFile);
loseSound.preload = "auto";
loseSound.volume = 0.2;


const GRID = 20; // Board size (20x20)
const CELL = 30; //Canvas pixels per cell
const SIZE = GRID * CELL; //Canvas Size
const TICK_MS = 120; //Game Tick Rate

type Point = { x: number; y: number }; //Grid Co-Ordinates

const KEYS: Record<string, Point> = {
    ArrowUp: { x: 0, y: -1 },    w: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },   s: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },  a: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },  d: { x: 1, y: 0 },
};

export const snakeGame: Minigame = {
    id: "snake",
    name: "Snake",
    goal: 35,
    highScore: 0,
    devScore: 59,
    scoreType: "number",
    lowerIsBetter: false,

    start(container, onGameLost) {

        // Get style data 
        const styles = getComputedStyle(document.documentElement);
        const color = (name: string) => styles.getPropertyValue(name).trim();


        // Make Canvas
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        container.appendChild(canvas);

        const ctx = canvas.getContext("2d")!;

        let snake: Point[] = [];
        let dir: Point = { x: 1, y: 0 };
        let nextDir: Point = dir;
        let apple: Point = { x: 0, y: 0 };
        let score = 0;
        let state: "ready" | "playing" | "over" = "ready"; //Start in 'Ready'

        function placeApple(): void {
            do {
                apple = {
                    x: Math.floor(Math.random() * GRID), // Choose a random X co-ord within the grid
                    y: Math.floor(Math.random() * GRID), // Choose a random Y co-ord within the grid
                };
            } while (snake.some(p => p.x === apple.x && p.y === apple.y)); // Don't place an apple on a snake square
        }

        function reset(): void {
            snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]; // Starting location
            dir = { x: 1, y: 0 }; // Default dir (Right)
            nextDir = dir; // Default 'nextDir' also right
            score = 0;
            placeApple();
            playSound(startSound)
            state = "ready";
            draw();
        }

        // Pause game if player returns to Bingo Board
        function isVisible(): boolean {
            return container.offsetParent !== null;
        }

        function die(): void {
            state = "over";
            playSound(loseSound);
            onGameLost?.(score, true);
            draw();
        }

        // Game Loop (120ms)
        function tick(): void {
            if (state !== "playing" || !isVisible()) return; // Make sure game is being 'played'

            dir = nextDir;
            const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }; // Find new head 'location'
            const eating = head.x === apple.x && head.y === apple.y; // Check if head is 'eating' an apple

            const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID; // Wall Check

            // Use eating to check self-collisions, we're allowed to move into the 'tail' since it will shift too
            const body = eating ? snake : snake.slice(0, -1); 
            const hitSelf = body.some(p => p.x === head.x && p.y === head.y);


            // Game Over!
            if (hitWall || hitSelf) {
                die();
                return;
            }
                        
            // Move snake by adding head and removing tail

            snake.unshift(head);

            if (eating) {
                playSound(eatSound)
                score++;

                if (score == snakeGame.goal + 1){ playSound(scoreSound)}
                if (score == snakeGame.devScore + 1){ playSound(devScoreSound)}
                placeApple();
            } else {
                snake.pop(); // Only remove tail if not eating, to extend snake
            }

            draw();
        }

        function onKeyDown(e: KeyboardEvent): void {
            if (!isVisible()) return; //Handle input only if game is visible

            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return; // Handle input only if within game, and not text client/search bar

            const turn = KEYS[e.key]; // Get Turn direction

            if (turn || e.key === " ") e.preventDefault(); // Prevent page scrolling via keys while playing

            // Any key to restart logic
            if (state === "over") {
                if (e.key === " " || turn) reset(); 
                return;
            }


            // Ignore 180 'turns' (i.e left while going right)
            if (turn) {
                const reversing = turn.x === -dir.x && turn.y === -dir.y;
                if (!reversing) nextDir = turn;
                if (state === "ready") state = "playing"; // Start game
            } else if (e.key === " " && state === "ready") {
                state = "playing";
            }
        }

        // Play SFX (if not muted)
        function playSound(sound: HTMLAudioElement): void {
            if (localStorage.getItem("bingoMuted") === "true") return;
            sound.currentTime = 0;
            sound.play().catch(() => {});
}

        function centeredText(text: string, y: number, size: number): void {
            ctx.fillStyle = color("--text-primary");
            ctx.font = `600 ${size}px Inter, system-ui, sans-serif`;
            ctx.textAlign = "center";
            ctx.fillText(text, SIZE / 2, y);
        }

        function draw(): void {

            // Draw bg
            ctx.fillStyle = color("--bg-secondary");
            ctx.fillRect(0, 0, SIZE, SIZE);


            // Draw grid
            ctx.strokeStyle = color("--border-subtle");
            ctx.lineWidth = 1;
            for (let i = 1; i < GRID; i++) {
                ctx.beginPath();
                ctx.moveTo(i * CELL, 0);
                ctx.lineTo(i * CELL, SIZE);
                ctx.moveTo(0, i * CELL);
                ctx.lineTo(SIZE, i * CELL);
                ctx.stroke();
            }


            // Draw Apple
            ctx.fillStyle = "#c62828";
            ctx.beginPath();
            ctx.arc(apple.x * CELL + CELL / 2, apple.y * CELL + CELL / 2, CELL / 2 - 4, 0, Math.PI * 2);
            ctx.fill();


            // Draw Snake
            snake.forEach((p, i) => {
                ctx.fillStyle = i === 0 ? color("--accent-hover") : color("--accent");
                ctx.fillRect(p.x * CELL + 2, p.y * CELL + 2, CELL - 4, CELL - 4);
            });


            // Text
            ctx.textBaseline = "middle";

            if (state !== "playing") {
                ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
                ctx.fillRect(0, 0, SIZE, SIZE);

                // Game over and Start text
                if (state === "ready") {
                    centeredText("Press Arrows or WASD", SIZE / 2, 28);
                } else {
                    centeredText("Game over", SIZE / 2 - 24, 40);
                    centeredText(`Score: ${score}`, SIZE / 2 + 20, 26);
                    centeredText("Press any key to retry", SIZE / 2 + 60, 18);
                }
            }
        }


        window.addEventListener("keydown", onKeyDown);
        const interval = window.setInterval(tick, TICK_MS);

        reset();

        snakeGame.kill = () => {if (state === "playing") die();};

        snakeGame.getCurrent = () => score;

        return () => {
            snakeGame.kill = undefined;
            snakeGame.getCurrent = undefined;
            window.removeEventListener("keydown", onKeyDown);
            clearInterval(interval);
        };
    },
};