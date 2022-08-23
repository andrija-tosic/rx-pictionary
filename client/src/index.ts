import { Message } from './../../shared/models/message';
import { Player } from '../../shared/models/player';
import { map, takeUntil, pairwise, switchMap, tap, first, filter, share, shareReplay, debounceTime } from 'rxjs/operators';
import { Observable, fromEvent, of, combineLatest, merge, interval } from "rxjs";
import { listenOnSocket, emitOnSocket, connection$ } from "./socket";
import { send$, start$, startBtn } from './actions';
import { drawMouseUp$, drawMouseDown$, canvas, drawMouseMove$, drawMouseLeave$, drawOnCanvas, ctx, canvasClear$, canvasChange$, clearCanvasBtn } from './canvas';
import { appendMessageToList, renderPlayersList } from './render';
import { name$, playerSentMessage$ } from './player';

export const players = new Map<string, Player>;

let seconds: number = 30;

const wordSpan = document.getElementById('word')!;
const timeSpan = document.getElementById('time')!;
const currentWordHeader = document.getElementById('current-word-header')!;

export let thisPlayerDrawing = false;

function printPlayers() {
    console.log(Array.from(players.values()));
}

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
    thisPlayerDrawing = true;
    clearCanvasBtn.style.display = 'block';

    socket.emit('start');
});

listenOnSocket('start').subscribe((word: string) => {
    console.log(`Game started: ${word}`);

    startBtn.style.display = 'none';

    wordSpan.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');

    seconds = 30;

    const interval = setInterval(() => {
        timeSpan.innerHTML = seconds.toString();

        seconds--;

        if (seconds === 0) {
            timeSpan.innerHTML = 'expired';
            clearInterval(interval);
            startBtn.style.display = 'block';
        }
    }, 1000);

});

listenOnSocket('wordReveal').subscribe((word: string) => {
    console.log(`Revealed word is ${word}`);

    wordSpan.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

emitOnSocket(name$).subscribe(({ socket, data }) => {
    socket.emit('newPlayer', data);
});

listenOnSocket('allPlayers').subscribe((playersList: Player[]) => {

    players.clear();
    playersList.forEach(player => {
        players.set(player.id, { id: player.id, name: player.name, score: 0 });
    });

    renderPlayersList();
    printPlayers();
});


listenOnSocket('newPlayer').subscribe((player: Player) => {
    console.log(`${player.name} joined`);
    players.set(player.id, { id: player.id, name: player.name, score: 0 });
    renderPlayersList();
    printPlayers();
});

listenOnSocket('playerLeft').subscribe((id: string) => {
    console.log(`${id} left`);
    players.delete(id);
    renderPlayersList();
    printPlayers();
});


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

    renderPlayersList();
});

listenOnSocket('correctWord').subscribe((word: string) => {
    currentWordHeader.innerHTML = 'You guessed correctly! The word is ' + word + '. ✅';
});