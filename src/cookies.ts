const LOGIN_DURATION = 30 * 24 * 60 * 60; // 30 days
const TEMP_DURATION = 1 * 10 * 60; // 10 minutes

// Player information
interface PlayerInfo {
    slotName: string;
    slot: number;
}

let currentPlayer: PlayerInfo | null = null;

// Cookie helpers
function setCookie(name: string, value: string, duration: number): void {
    document.cookie =
        `${name}=${encodeURIComponent(value)}; ` +
        `Max-Age=${duration}; Path=/; SameSite=Lax`;
}

function getCookie(name: string): string | null {
    const cookie = document.cookie
        .split("; ")
        .find(row => row.startsWith(`${name}=`));

    if (!cookie) return null;

    return decodeURIComponent(cookie.substring(name.length + 1));
}

// Generate a unique ID for the player
function generatePlayerID(player: PlayerInfo): string {
    const input = `${player.slotName.trim().toLowerCase()}:${player.slot}`;

    let hash = 2166136261;

    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(36);
}

// Initialise player cookies
export function initialiseCookies(player: PlayerInfo) {
    currentPlayer = player;

    const id = generatePlayerID(player);

    const loginCookie = `apbingo_login_${id}`;
    const tempCookie = `apbingo_temp_${id}`;

    // If unique login id cookie doesn't exist, create it
    if (!getCookie(loginCookie)) {
        setCookie(loginCookie, Date.now().toString(), LOGIN_DURATION);

        // Create temp cookie on initial log-in
        if (!getCookie(tempCookie)) {
            setCookie(tempCookie, Date.now().toString(), TEMP_DURATION);
        }
    }

    startTempTimer(
        player,
        document.getElementById("temp-timer-text")!,
        document.getElementById("temp-timer-bar")!,
        document.getElementById("renewButton") as HTMLButtonElement
    );

    return {
        id,
        loginCookie,
        tempCookie
    };
}

export function getTempRemainingMs(player: PlayerInfo): number {
    const id = generatePlayerID(player);
    const value = getCookie(`apbingo_temp_${id}`);

    if (!value) return 0; // cookie missing or expired

    const created = Number(value);
    if (Number.isNaN(created)) return 0;

    return Math.max(0, created + TEMP_DURATION * 1000 - Date.now());
}

let activeTimerInterval: number | null = null;

export function startTempTimer(
    player: PlayerInfo,
    textEl: HTMLElement,
    barEl: HTMLElement,
    buttonEl: HTMLButtonElement
): () => void {
    if (activeTimerInterval !== null) {
        clearInterval(activeTimerInterval);
        activeTimerInterval = null;
    }

    function update() {
        const ms = getTempRemainingMs(player);
        const totalSeconds = Math.ceil(ms / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;

        textEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;

        const fraction = ms / (TEMP_DURATION * 1000);
        barEl.style.width = `${fraction * 100}%`;
        barEl.classList.toggle("warn", fraction <= 0.25 && fraction > 0.1);
        barEl.classList.toggle("low", fraction <= 0.1);
    }

    update();
    activeTimerInterval = window.setInterval(update, 1000);

    return () => {
        if (activeTimerInterval !== null) {
            clearInterval(activeTimerInterval);
            activeTimerInterval = null;
        }
    };
}

// Reset temporary cookie
export function resetTempCookie(player: PlayerInfo): void {
    const id = generatePlayerID(player);
    const tempCookie = `apbingo_temp_${id}`;

    setCookie(tempCookie, Date.now().toString(), TEMP_DURATION);
}

// Reset the temp cookie for whoever logged in most recently
export function resetCurrentTempCookie(): void {
    if (!currentPlayer) return;
    resetTempCookie(currentPlayer);
}

export function hasCurrentTempCookie(): boolean {
    if (!currentPlayer) return false;
    return getCookie(`apbingo_temp_${generatePlayerID(currentPlayer)}`) !== null;
}