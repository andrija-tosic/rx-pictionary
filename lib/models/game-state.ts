import { Game } from './../../server/src/game';
export type seconds = number;

export type GameState = Pick<Game, 'running' | 'revealedWord' | 'drawingPlayerId' | 'timePassed'>

export const RoundTime: seconds = 30;
