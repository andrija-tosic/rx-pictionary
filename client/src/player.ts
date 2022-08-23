import { combineLatest, Observable, of } from 'rxjs';
import { map, takeUntil, pairwise, switchMap, tap, first, filter, share, shareReplay, debounceTime } from 'rxjs/operators';
import { Player } from '../../shared/models/player';
import { send$ } from './actions';
import { connection$ } from './socket';

const name = localStorage.getItem('name');
export let name$: Observable<string>;

if (name) {
    name$ = of(name)
        .pipe(
        // tap((name) => console.log(name))
    );
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

const thisPlayer$: Observable<Player> = combineLatest([connection$, name$])
    .pipe(
        map(([socket, name]) => ({ id: socket?.id, name, score: 0 })),
        tap(() => console.log('thisPlayer'))
    );

export const playerSentMessage$: Observable<Player> = combineLatest([thisPlayer$, send$]
).pipe(
    map(data => data[0]),
    tap(() => console.log('playerSent')),
    share()
);

// thisPlayer$.subscribe();
playerSentMessage$.subscribe();
