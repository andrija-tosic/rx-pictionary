import { combineLatest, Observable, of } from 'rxjs';
import { map, switchMap, first, filter, share } from 'rxjs/operators';
import { Player } from '@rx-pictionary/lib/models'
import { send$ } from './button-actions';
import { SocketIO } from './socket';

export namespace PlayerActions {
    const name = localStorage.getItem('name');
    export let name$: Observable<string>;

    if (name) {
        name$ = of(name);
    }
    else {
        name$ = of(prompt("Enter your name"))
            .pipe(
                first(),
                filter((name) => !!name),
                switchMap((name) => of(name!.trim()))
            );
    }

    name$.subscribe((name: string) => {
        localStorage.setItem('name', name);
    });

    const thisPlayer$: Observable<Player> = combineLatest([SocketIO.connection$, name$])
        .pipe(
            map(([socket, name]) => ({ id: socket?.id, name, score: 0 }))
        );

    export const playerSentMessage$: Observable<Player> = combineLatest([thisPlayer$, send$]
    ).pipe(
        map(data => data[0]),
        share()
    );

    playerSentMessage$.subscribe();
}