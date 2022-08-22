import { Message } from './../../shared/models/message';
import { Player } from '../../shared/models/player';
import { map, takeUntil, pairwise, switchMap, tap, first, filter, share, shareReplay } from 'rxjs/operators';
import { Observable, fromEvent, of, combineLatest, merge, interval } from "rxjs";
import { listenOnSocket, emitOnSocket, connection$ } from "./connection";
import { send$, start$, startBtn } from './actions';
import { drawMouseUp$, drawMouseDown$, canvas, drawMouseMove$, drawMouseLeave$, drawOnCanvas, ctx, canvasClear$ } from './canvas';

const players = new Map<string, Player>;
let name$: Observable<string>;

let seconds: number = 30;

const name = localStorage.getItem('name');
const wordSpan = document.getElementById('word')!;
const timeSpan = document.getElementById('time')!;


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
        tap(() => console.log('thisPlayer'))
    );

const playerSentMessage$: Observable<Player> = combineLatest([thisPlayer$, send$]
).pipe(
    map(data => data[0]),
    tap(() => console.log('playerSent')),
    share()
);

// thisPlayer$.subscribe();
playerSentMessage$.subscribe();

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
    });

    (document.getElementById('message-input') as HTMLInputElement).value = '';
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


emitOnSocket(start$).subscribe(({ socket }) => {
    socket.emit('start');
});

listenOnSocket('start').subscribe((word: string) => {
    console.log(`Game started: ${word}`);

    startBtn.style.display = 'none';

    wordSpan.innerHTML = word;


    const interval = setInterval(() => {
        timeSpan.innerHTML = seconds.toString();

        seconds--;

        if (seconds === 0)
            clearInterval(interval);

    }, 1000);

});

listenOnSocket('wordReveal').subscribe((word: string) => {
    console.log(`Revealed word is ${word}`);

    wordSpan.innerHTML = word;
});

emitOnSocket(name$).subscribe(({ socket, data }) => {
    socket.emit('newPlayer', data);
});

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

listenOnSocket('playerLeft').subscribe((id: string) => {
    console.log(`${id} left`);
    players.delete(id);
    printPlayers();
});

const novi = drawMouseDown$
    .pipe(
        switchMap((e) => {
            return drawMouseMove$
                .pipe(
                    takeUntil(drawMouseUp$),
                    takeUntil(drawMouseLeave$),
                    pairwise()
                )
        }),
        map((res) => {
            const rect = canvas.getBoundingClientRect();
            const prevMouseEvent = res[0] as MouseEvent;
            const currMouseEvent = res[1] as MouseEvent;

            const prevPos = {
                x: prevMouseEvent.clientX - rect.left,
                y: prevMouseEvent.clientY - rect.top
            };

            const currentPos = {
                x: currMouseEvent.clientX - rect.left,
                y: currMouseEvent.clientY - rect.top
            };

            return { prevPos, currentPos };
        }),
        tap((data) => {
            drawOnCanvas((data as LineCoordinates).prevPos, (data as LineCoordinates).currentPos);

        })
    )

type LineCoordinates = {
    prevPos: {
        x: number;
        y: number;
    };
    currentPos: {
        x: number;
        y: number;
    };
}

const canvasChange$ = merge(
    novi,
    canvasClear$
);

emitOnSocket(canvasChange$).subscribe(({ socket, data }) => {
    const base64ImageData = canvas.toDataURL("image/png");
    socket.emit('image', base64ImageData);
});

listenOnSocket('image').subscribe((base64ImageData: string) => {

    console.log('received canvas change')

    const image = new Image();
    image.src = base64ImageData;

    image.onload = () => {
        ctx.drawImage(image, 0, 0);
    };

});

listenOnSocket('correctGuess').subscribe((id: string) => {
    const player = players.get(id)!;

    players.set(id, {
        id: player.id,
        name: player.name,
        score: player.score + 100
    });
})