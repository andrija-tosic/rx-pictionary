import { Player } from './player';

export interface CorrectAndDrawingPlayer {
    correctPlayer: Pick<Player, 'id' | 'score'>,
    drawingPlayer: Pick<Player, 'id' | 'score'>
}