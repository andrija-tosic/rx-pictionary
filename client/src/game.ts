import { map, tap } from 'rxjs/operators';
import { GameState } from './../../shared/models/game-state';
import { BehaviorSubject, Subject } from 'rxjs';
import { Player } from '../../shared/models/player';
import { listenOnSocket } from './socket';
import { EVENTS } from '../../shared/socket-events';

export class Game {
    start$ = new Subject<string>();
    stop$ = new Subject<void>();
    revealedWord$ = new Subject<string>();
    correctWord$ = new Subject<string>();
    timePassed$ = new Subject<number>();
    correctGuess$ = new Subject<Pick<Player, 'id' | 'score'>>();
    gameState$ = new Subject<GameState>();

    allPlayer$ = new Subject<Player[]>();
    newPlayer$ = new Subject<Player>();
    playerLeft$ = new Subject<Player>();

    players = new Map<string, Player>();

    isDrawing$ = new BehaviorSubject<boolean>(false);

    constructor() {
        listenOnSocket(EVENTS.START).subscribe(word => this.start(word));
        listenOnSocket(EVENTS.STOP).subscribe(() => this.stop());
        listenOnSocket(EVENTS.WORD_REVEAL).subscribe(this.revealedWord$);
        listenOnSocket(EVENTS.TIME).subscribe(this.timePassed$);
        listenOnSocket(EVENTS.CORRECT_WORD).subscribe(this.correctWord$);

        listenOnSocket(EVENTS.CORRECT_GUESS)
            .pipe(
                tap((playerData) => {
                    const player = this.players.get(playerData.id)!;

                    this.players.set(playerData.id, {
                        id: player.id,
                        name: player.name,
                        score: playerData.score
                    });
                })
            )
            .subscribe(this.correctGuess$);

        listenOnSocket(EVENTS.GAME_STATE).subscribe(this.gameState$);

        listenOnSocket(EVENTS.NEW_PLAYER)
            .pipe(
                tap((player) => {
                    this.players.set(player.id, { id: player.id, name: player.name, score: player.score });
                })
            )
            .subscribe(this.newPlayer$);

        listenOnSocket(EVENTS.ALL_PLAYERS)
            .pipe(
                tap((playersList) => {
                    this.players.clear();
                    playersList.forEach(player => {
                        this.players.set(player.id, { id: player.id, name: player.name, score: player.score });
                    });
                })
            )
            .subscribe(this.allPlayer$);

        listenOnSocket(EVENTS.PLAYER_LEFT)
            .pipe(
                map((id: string) => {
                    const playerThatLeft = this.players.get(id)!;
                    this.players.delete(id);

                    return playerThatLeft
                })
            )
            .subscribe(this.playerLeft$);

        this.isDrawing$.next(true);
    }

    private start(word: string) {
        this.start$.next(word);
        this.revealedWord$.next('_ '.repeat(word.length));
        this.isDrawing$.next(false)
    }

    private stop() {
        this.stop$.next();
        this.isDrawing$.next(true);
    }
}
