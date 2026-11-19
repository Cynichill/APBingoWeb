export interface Minigame {
    id: string;
    name: string;
    goal: number;
    highScore: number;
    devScore: number;
    scoreType?: "number" | "time";
    lowerIsBetter?: boolean;
    kill?: () => void;
    getCurrent?: () => number;
    start?: (
        container: HTMLElement,
        onGameLost?: (score: number, win: boolean) => void,
        onGoalReached?: () => void,
        onStart?: () => void,
        onScore?: (value: number) => void
    ) => (() => void) | void;
}



