import { Player } from '../../shared/models/player';
import { map, switchMap, tap, first, filter, } from 'rxjs/operators';
import { Observable, fromEvent, of, combineLatest } from "rxjs";
import { listenAfterConnected, emitAfterConnected, connect$ } from "./connection";

const players = new Map<string, Player>;
let name$: Observable<string>;

const name = localStorage.getItem('name');

function printPlayers() {
    console.log(Array.from(players.values()));
}

if (name) {
    name$ = of(name);
}
else {
    name$ = of(prompt("Enter your name"))
        .pipe(first(),
            filter((name) => !!name),
            switchMap((name) => of(name!.trim()))
        );
}

name$.subscribe((name: string) => {
    localStorage.setItem('name', name);
});

export const thisPlayer$: Observable<Player> = combineLatest([
    connect$,
    name$,
]).pipe(map(([socket, name]) => ({ id: socket?.id, name, score: 0, ready: false })));

const readyBtn = document.getElementById('ready-btn')!;

const ready$ = fromEvent(readyBtn, 'click').pipe(
    tap(() => {
        readyBtn.style.visibility = 'false';

    }),
);

combineLatest(
    thisPlayer$,
    ready$
).subscribe(data => {
    players.get(data[0].id)!.ready = true;

    printPlayers();
});

emitAfterConnected(name$).subscribe(({ socket, data }) => {
    socket.emit('newPlayer', data);
});

listenAfterConnected('allPlayers').subscribe((playersList: Player[]) => {

    players.clear();

    playersList.forEach(player => {
        players.set(player.id, { id: player.id, name: player.name, score: 0, ready: player.ready });
    });

    printPlayers();
});

listenAfterConnected('newPlayer').subscribe((player: Player) => {
    console.log(`${player.name} joined`);
    players.set(player.id, { id: player.id, name: player.name, score: 0, ready: false });
    printPlayers();
});

listenAfterConnected('playerLeft').subscribe((id: string) => {
    console.log(`${id} left`);
    players.delete(id);
    printPlayers();
});

listenAfterConnected('playerReady').subscribe((id: string) => {
    console.log(`${id} is ready`);
    players.get(id)!.ready = true;
    printPlayers();
});