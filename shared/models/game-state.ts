export type seconds = number;

export interface GameState {
    started: boolean;
    revealedWord: string;
    drawingPlayerId: string;
    timePassed: seconds;
}

export const RoundTime: seconds = 30;
