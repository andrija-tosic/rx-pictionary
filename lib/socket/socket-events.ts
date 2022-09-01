import { CorrectAndDrawingPlayer } from '../models/correct-guess-data';
import { Player } from '../models/player';
import { Message } from '../models/message';
import { seconds, GameState } from '../models/game-state';

export namespace EVENTS {
    export enum FROM_SERVER {
        CONNECT = 'connect',
        DISCONNECT = 'disconnect',
        ERROR = 'error',
        START = 'start',
        NEW_PLAYER = 'newPlayer',
        PLAYER_LEFT = 'playerLeft',
        ALL_PLAYERS = 'allPlayers',
        WORD_REVEAL = 'wordReveal',
        CORRECT_GUESS = 'correctGuess',
        CORRECT_WORD = 'correctWord',
        TIME = 'time',
        GAME_STATE = 'gameState',
        IMAGE = 'image',
        STOP = 'stop'
    }

    export enum FROM_CLIENT {
        START = 'start',
        MESSAGE = 'message',
        IMAGE = 'image',
        NEW_PLAYER = 'newPlayer',
        CLEAR_CANVAS = 'clearCanvas'
    }
}

export interface ServerToClientEvents {
    connect: () => void;
    disconnect: () => void;
    error: (err: Error) => void;
    playerLeft: (socketId: string) => void;
    message: (msg: Message) => void;
    image: (imgBase64: string) => void;
    newPlayer: (player: Player) => void;
    allPlayers: (players: Player[]) => void;
    start: (word: string) => void;
    wordReveal: (word: string) => void;
    correctGuess: (correctAndDrawingPlayer: CorrectAndDrawingPlayer) => void;
    correctWord: (word: string) => void;
    time: (time: seconds) => void;
    clearCanvas: () => void;
    gameState: (state: GameState) => void;
    stop: () => void;

    withAck: (d: string, callback: (e: number) => void) => void;
}

export interface ClientToServerEvents {
    message: (msg: Message) => void;
    image: (imgBase64: string) => void;
    newPlayer: (name: string) => void;
    start: () => void;
    clearCanvas: () => void;
}

export interface InterServerEvents {
}

export interface SocketData<T> {
    data: T;
}