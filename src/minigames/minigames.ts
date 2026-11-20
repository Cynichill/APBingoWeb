import type { Minigame } from "./types";
import { snakeGame } from "./snake";
import { minesweeperGame } from "./minesweeper"
import { resetCurrentTempCookie, hasCurrentTempCookie } from "../cookies";
import { sendNextMinigameReward } from "../ap.ts";
import { sendDeathLinks, setDeathReceivedHandler } from "../deathlink.ts";

const HUB_BUTTON_ID = "renewButton";

const minigames: Minigame[] = [
    snakeGame,
    minesweeperGame,
];

let hub: HTMLElement;
let zoomLayer: HTMLElement;
let toggleButton: HTMLElement;
let listEl: HTMLElement;
let frameEl: HTMLElement;
let activeGame: Minigame | null = null;
let stopGame: (() => void) | void = undefined;

let currentTimer = 0;
let clockInterval = 0;
let clockStart = 0;


function formatScore(game: Minigame, value: number): string {
    if (game.lowerIsBetter && value === 0) return "-";   // 0 = no time set yet

    if (game.scoreType === "time") {
        const totalSeconds = Math.floor(value / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        const centis = Math.floor((value % 1000) / 10);
        return `${mins}:${secs.toString().padStart(2, "0")}.${centis.toString().padStart(2, "0")}`;
    }

    return String(value);
}

function isNewHighScore(game: Minigame, score: number): boolean {
    if (game.lowerIsBetter) {
        return game.highScore === 0 || score < game.highScore;
    }
    return score > game.highScore;
}

function meetsGoal(game: Minigame, score: number): boolean {
    return game.lowerIsBetter ? score <= game.goal : score >= game.goal;
}

function updateStats(game: Minigame | null): void {
    document.getElementById("statCurrent")!.textContent = "-";
    document.getElementById("statGoal")!.textContent = game ? formatScore(game, game.goal) : "-";
    document.getElementById("statHigh")!.textContent = game ? formatScore(game, game.highScore) : "-";
    document.getElementById("statDev")!.textContent = game ? formatScore(game, game.devScore) : "-";
}

function showCurrent(game: Minigame, value: number): void {
    document.getElementById("statCurrent")!.textContent = formatScore(game, value);
}

function startClock(game: Minigame): void {
    clearInterval(clockInterval);
    clockStart = performance.now();
    clockInterval = window.setInterval(() => showCurrent(game, performance.now() - clockStart), 50);
}

function onGameLost(game: Minigame, score: number, win: boolean): void {
    // Stop the visual clock for timer games
    if (game.scoreType === "time") {
        clearInterval(clockInterval);
        showCurrent(game, win ? score : performance.now() - clockStart);
    }

    // Check high score based on score format
    if (win) {
        if (isNewHighScore(game, score)) {
            game.highScore = score;
            updateStats(game);
        }
    }

    if (!hasCurrentTempCookie()) {
        if (meetsGoal(game, score) && win) {
            // If the cookie doesn't exist, send minigame reward
            sendNextMinigameReward()
        }
        else {
            sendDeathLinks("Was Bad At " + game.name)
        }
        // Reset the cookie on loss regardless, allows freeplay but only sends square if timer is over
        resetCurrentTempCookie();
    }
}

function selectGame(game: Minigame): void {

    clearInterval(clockInterval);
    clearInterval(currentTimer);

    if (typeof stopGame === "function") stopGame();

    frameEl.replaceChildren();

    listEl.querySelectorAll(".game-item").forEach(el => {
        el.classList.toggle("active", (el as HTMLElement).dataset.id === game.id);
    });

    updateStats(game);

    if (game.start) {
        activeGame = game;
        stopGame = game.start(
            frameEl,
            (score, win) => onGameLost(game, score, win),
            undefined, // onGoalReached
            () => startClock(game),
            (value) => showCurrent(game, value),
        );

        currentTimer = window.setInterval(() => {
            document.getElementById("statCurrent")!.textContent =
            game.getCurrent ? formatScore(game, game.getCurrent()) : "-";
        }, 50);
    } else {
        activeGame = null;
        const msg = document.createElement("span");
        msg.id = "gamePlaceholder";
        msg.textContent = game.name;
        frameEl.appendChild(msg);
        stopGame = undefined;
    }
}

function renderList(): void {
    listEl.replaceChildren();

    for (const game of minigames) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "game-item";
        button.dataset.id = game.id;
        button.textContent = game.name;

        button.onclick = () => selectGame(game);
        listEl.appendChild(button);
    }
}

function toggleHub(): void {
    const showHub = hub.classList.contains("hidden");

    hub.classList.toggle("hidden", !showHub);
    zoomLayer.classList.toggle("hidden", showHub);
}

function handleDeathLink(): void {
    activeGame?.kill?.();
}

export function initMinigameHub(): void {
    hub = document.getElementById("minigameHub")!;
    zoomLayer = document.getElementById("zoomLayer")!;
    toggleButton = document.getElementById(HUB_BUTTON_ID)!;
    listEl = document.getElementById("gameList")!;
    frameEl = document.getElementById("gameFrame")!;

    renderList();
    updateStats(null);
    toggleButton.addEventListener("click", toggleHub);
    setDeathReceivedHandler(handleDeathLink);
}