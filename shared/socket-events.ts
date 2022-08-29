import { Player } from './models/player';
import { Message } from './models/message';
import { seconds, GameState } from './models/game';

export enum EVENTS {
    CONNECT = 'connect',
    DISCONNECT = 'disconnect',
    ERROR = 'error',
    PLAYER_LEFT = 'playerLeft',
    MESSAGE = 'message',
    IMAGE = 'image',
    NEW_PLAYER = 'newPlayer',
    ALL_PLAYERS = 'allPlayers',
    START = 'start',
    WORD_REVEAL = 'wordReveal',
    CORRECT_GUESS = 'correctGuess',
    CORRECT_WORD = 'correctWord',
    TIME = 'time',
    CLEAR_CANVAS = 'clearCanvas',
    GAME_STATE = 'gameState',
    STOP = 'stop',
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
    correctGuess: (data: { id: string, score: number }) => void;
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