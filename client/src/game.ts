import { map, tap } from 'rxjs/operators';
import { Player, GameState } from '@rx-pictionary/lib/models';
import { BehaviorSubject, Subject } from 'rxjs';
import { SocketUtils } from './socket';
import { EVENTS } from '@rx-pictionary/lib/socket';

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

    canDraw$ = new BehaviorSubject<boolean>(false);

    constructor() {
        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.START).subscribe(word => this.start(word));
        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.STOP).subscribe(() => this.stop());
        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.WORD_REVEAL).subscribe(this.revealedWord$);
        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.TIME).subscribe(this.timePassed$);
        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.CORRECT_WORD).subscribe(this.correctWord$);

        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.CORRECT_GUESS)
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

        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.GAME_STATE).subscribe(this.gameState$);

        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.NEW_PLAYER)
            .pipe(
                tap((player) => {
                    this.players.set(player.id, player);
                })
            )
            .subscribe(this.newPlayer$);

        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.ALL_PLAYERS)
            .pipe(
                tap((playersList) => {
                    this.players.clear();
                    playersList.forEach(player => {
                        this.players.set(player.id, player);
                    });
                })
            )
            .subscribe(this.allPlayer$);

        SocketUtils.listenOnSocket(EVENTS.FROM_SERVER.PLAYER_LEFT)
            .pipe(
                map((id: string) => {
                    const playerThatLeft = this.players.get(id)!;
                    this.players.delete(id);

                    return playerThatLeft;
                })
            )
            .subscribe(this.playerLeft$);

        this.canDraw$.next(true);
    }

    private start(word: string) {
        this.start$.next(word);
        this.revealedWord$.next('_ '.repeat(word.length));
        this.canDraw$.next(false)
    }

    private stop() {
        this.stop$.next();
        this.canDraw$.next(true);
    }
}
