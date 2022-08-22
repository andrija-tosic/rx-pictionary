import { Message } from './../../shared/models/message';
import { Player } from '../../shared/models/player';
import { map, switchMap, tap, first, filter, share, shareReplay } from 'rxjs/operators';
import { Observable, fromEvent, of, combineLatest } from "rxjs";
import { listenOnSocket, emitOnSocket, connection$ } from "./connection";
import { send$, start$ } from './actions';

const players = new Map<string, Player>;
let name$: Observable<string>;

const name = localStorage.getItem('name');

function printPlayers() {
    console.log(Array.from(players.values()));
}

function appendMessageToList(message: Message) {
    const li = document.createElement('li');
    li.innerHTML = message.senderName + ": " + message.text;

    document.getElementById('message-list')!.appendChild(li);
    // console.log('appending to ul')

}

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
        // tap(() => console.log('thisPlayer'))
    );

const playerSentMessage$: Observable<Player> = combineLatest([thisPlayer$, send$]
).pipe(
    map(data => data[0]),
    tap(() => console.log('playerSentMessage$'))
);

// thisPlayer$.subscribe((p) => console.log('this player'));
playerSentMessage$.subscribe((d) => console.log(d));

emitOnSocket(playerSentMessage$).subscribe(({ socket, data }) => {

    console.log('appending message to list');
    appendMessageToList({
        senderId: data.id,
        senderName: data.name,
        text: (document.getElementById('message-input') as HTMLInputElement).value
    });

    console.log('emitting message');
    socket.emit('message', {
        senderId: data.id,
        senderName: data.name,
        text: (document.getElementById('message-input') as HTMLInputElement).value
    })
});

listenOnSocket('message').subscribe((message: Message) => {
    console.log('received message to list');
    appendMessageToList({
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text
    });

    console.log(JSON.stringify(message));
});


// emitOnSocket(start$).subscribe(({ socket }) => {
//     socket.emit('start');
// });

listenOnSocket('start').subscribe((word: string) => {
    console.log(`Game started: ${word}`);
});

listenOnSocket('wordReveal').subscribe((word: string) => {
    console.log(`Revealed word is ${word}`);
});

// emitOnSocket(name$).subscribe(({ socket, data }) => {
//     socket.emit('newPlayer', data);
// });

listenOnSocket('allPlayers').subscribe((playersList: Player[]) => {

    players.clear();

    playersList.forEach(player => {
        players.set(player.id, { id: player.id, name: player.name, score: 0 });
    });

    printPlayers();
});

listenOnSocket('newPlayer').subscribe((player: Player) => {
    console.log(`${player.name} joined`);
    players.set(player.id, { id: player.id, name: player.name, score: 0 });
    printPlayers();
});

listenOnSocket('message').subscribe((message: Message) => {
    appendMessageToList(message);
});

listenOnSocket('playerLeft').subscribe((id: string) => {
    console.log(`${id} left`);
    players.delete(id);
    printPlayers();
});