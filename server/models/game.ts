import { AppServer } from './../src/server';

type seconds = number;

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

    start(word: string) {
        this.started = true;
        this.word = word;
        this.timePassed = 0;

        this.timer = setInterval(() => {
            this.timePassed++;

            switch (this.timePassed) {
                case 1:
                    this.revealedWord = this.word.split('').map((letter, i) => {
                        if (i % 3 !== 0) {
                            return '_';
                        }
                        else return letter;
                    }).join('');

                    this.server.revealWord(this.revealedWord);
                    console.log(`Revealing ${this.revealedWord}`);

                    break;

                case 4:
                    this.revealedWord = this.word.split('').map((letter, i) => {
                        if (letter !== '_')
                            return letter;

                        return '_';

                        if (i % 2 === 0) {
                            return '_';
                        }
                        else return letter;
                    }).join('');

                    this.server.revealWord(this.revealedWord);
                    console.log(`Revealing ${this.revealedWord}`);

                    break;

                case 7:
                    clearInterval(this.timer);
                    this.server.revealWord(this.word);
                    this.started = false;
                    break;

                default:
                    break;
            }

        }, 1000);
    }
}