export type seconds = number;

export type GameState = {
    running: boolean,
    revealedWord: string,
    drawingPlayerId: string,
    timePassed: seconds
}

export const RoundTime: seconds = 30;
