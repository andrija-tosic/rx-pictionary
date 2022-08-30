import { BehaviorSubject, Subject } from 'rxjs';
import { Player } from '../../shared/models/player';
import { listenOnSocket } from './socket';
import { EVENTS } from '../../shared/socket-events';

class Game {
    started = new BehaviorSubject<boolean>(false);
    word$ = new Subject<string>();
    revealedWord$ = new Subject<string>();
    players = new Map<string, Player>();
    timePassed$ = new Subject<number>();
    isDrawing$ = new BehaviorSubject<boolean>(false);

    constructor() {
        listenOnSocket(EVENTS.START).subscribe(this.word$);
        listenOnSocket(EVENTS.WORD_REVEAL).subscribe(this.revealedWord$);
        listenOnSocket(EVENTS.TIME).subscribe(this.timePassed$);
    }

    start(word: string) {
        this.word$.next(word);

        this.started.next(true);

        this.revealedWord$.next('_ '.repeat(word.length));

        this.timePassed$.next(0);
    }

    stop() {
        this.started.next(false);
    }
}

export const game = new Game();