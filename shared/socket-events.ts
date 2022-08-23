import { Player } from './models/player';
import { Message } from './models/message';
export interface ServerToClientEvents {
    connect: () => void;
    disconnect: () => void;
    error: (err: Error) => void;
    playerLeft: (socketId: string) => void;
    roundStart: () => void;
    playerReady: () => void;
    message: (msg: Message) => void;
    image: (imgBase64: string) => void;
    newPlayer: (player: Player) => void;
    allPlayers: (players: Player[]) => void;
    start: (word: string) => void;
    wordReveal: (word: string) => void;
    correctGuess: (id: string) => void;
    correctWord: (word: string) => void;

    withAck: (d: string, callback: (e: number) => void) => void;
}

export interface ClientToServerEvents {
    playerReady: () => void;
    message: (msg: Message) => void;
    image: (imgBase64: string) => void;
    newPlayer: (name: string) => void;
    start: () => void;
}

export interface InterServerEvents {
}

export interface SocketData {
    data: any;
}