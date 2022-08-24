import { AppServer } from './../src/server';

export type seconds = number;

export interface GameState {
    started: boolean;
    revealedWord: string;
    drawingPlayerId: string;
    timePassed: seconds;
}

export class Game {
    started: boolean = false;
    word: string;
    revealedWord: string;

    drawingPlayerId: string;

    timer: NodeJS.Timer;
    timePassed: seconds;

    server: AppServer;

    constructor(server: AppServer, word: string, drawingPlayerId: string) {
        this.server = server;
        this.drawingPlayerId = drawingPlayerId;
        this.start(word);
    }

    public getState(): GameState {
        return {
            drawingPlayerId: this.drawingPlayerId,
            revealedWord: this.revealedWord,
            started: this.started,
            timePassed: this.timePassed
        }
    }

    start(word: string) {
        this.started = true;
        this.word = word;
        this.revealedWord = '_ '.repeat(word.length);
        this.timePassed = 0;

        this.timer = setInterval(() => {
            this.server.emitTime(30 - this.timePassed);

            this.timePassed++;

            switch (this.timePassed) {
                case 20:
                    this.revealedWord = this.word.split('').map((letter, i) => {
                        if (i % 3 !== 0) {
                            return '_';
                        }
                        else return letter;
                    }).join('');

                    this.server.revealWord(this.revealedWord);
                    console.log(`Revealing ${this.revealedWord}`);

                    break;

                case 30:
                    clearInterval(this.timer);
                    this.server.revealWord(this.word);
                    this.started = false;
                    break;

                default:
                    break;
            }

        }, 1000);
    }

    stop() {
        this.started = false;
        clearInterval(this.timer);
    }
}