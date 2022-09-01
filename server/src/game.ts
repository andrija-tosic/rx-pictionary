import { GameState, RoundTime, Player } from '@rx-pictionary/lib/models';
import { AppServer } from './server';

export type seconds = number;

const enum ScoreLevel {
    Low = 25,
    Medium = 50,
    High = 100
}
const enum TimeStamps {
    Early = 0,
    Medium = 15,
    Late = 20
}

export class Game {
    running: boolean = false;
    word: string;
    revealedWord: string;

    players = new Map<string, Player>();

    correctGuesses = new Set<string>();

    drawingPlayerId: string;

    timer: NodeJS.Timer;
    timePassed: seconds;

    private readonly server: AppServer;

    readonly drawingPlayerScoreFactor = 5;

    constructor(private readonly s: AppServer) {
        this.server = s;
    }

    public getState(): GameState {
        return {
            drawingPlayerId: this.drawingPlayerId,
            revealedWord: this.revealedWord,
            running: this.running,
            timePassed: this.timePassed
        }
    }

    public calculateScoreToAdd(): { scoreToAdd: number, scoreToAddToDrawingPlayer: number } {
        const scoreToAdd =
            this.timePassed > TimeStamps.Early && this.timePassed < TimeStamps.Medium
                ? ScoreLevel.High
                : this.timePassed >= TimeStamps.Medium && this.timePassed < TimeStamps.Late
                    ? ScoreLevel.Medium
                    : ScoreLevel.Low;

        const scoreToAddToDrawingPlayer = scoreToAdd / this.drawingPlayerScoreFactor;

        return { scoreToAdd, scoreToAddToDrawingPlayer };
    }

    start(word: string, drawingPlayerId: string): void {
        this.word = word;
        this.drawingPlayerId = drawingPlayerId;

        this.running = true;
        this.word = word;
        this.revealedWord = '_ '.repeat(word.length);
        this.timePassed = 0;

        this.timer = setInterval(() => {
            this.server.emitTime(RoundTime - this.timePassed);


            switch (this.timePassed) {
                case TimeStamps.Medium:
                    this.revealedWord = this.word.split('').map((letter, i) => {
                        if (i % 3 !== 0) {
                            return '_';
                        }
                        else return letter;
                    }).join('');

                    this.server.revealWord(this.revealedWord);
                    console.log(`Revealing ${this.revealedWord}`);

                    break;

                case RoundTime:
                    clearInterval(this.timer);
                    this.server.revealWord(this.word);
                    this.stop();
                    break;
            }

            this.timePassed++;

        }, 1000);
    }

    stop(): void {
        this.running = false;
        clearInterval(this.timer);
    }
}
