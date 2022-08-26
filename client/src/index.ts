import { Message } from './../../shared/models/message';
import { Player } from '../../shared/models/player';
import { listenOnSocket, emitOnSocket } from "./socket";
import { start$, startBtn } from './actions';
import { canvas, ctx, canvasChange$, clearCanvasBtn, clearCanvas, canvasClear$ } from './canvas';
import { appendMessageToList, renderPlayersList } from './render';
import { name$, playerSentMessage$ } from './player';
import { EVENTS } from '../../shared/socket-events';

export const players = new Map<string, Player>;

const wordSpan = document.getElementById('word')!;
const timeSpan = document.getElementById('time')!;
const currentWordHeader = document.getElementById('current-word-header')!;
const messageInputDiv = document.getElementById('message-input-div')!;
const timeHeader = document.getElementById('time-header')!;

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
    socket.emit(EVENTS.MESSAGE, {
        senderId: data.id,
        senderName: data.name,
        text: (document.getElementById('message-input') as HTMLInputElement).value
    });

    (document.getElementById('message-input') as HTMLInputElement).value = '';
});

listenOnSocket(EVENTS.MESSAGE).subscribe((message: Message) => {
    console.log('received message to list');
    appendMessageToList({
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text
    });

    console.log(JSON.stringify(message));
});


emitOnSocket(start$).subscribe(({ socket }) => {
    timeSpan.innerHTML = '30';
    thisPlayerDrawing = true;
    clearCanvas();
    clearCanvasBtn.style.display = 'block';
    messageInputDiv.style.display = 'none';
    timeHeader.style.display = 'block';

    socket.emit(EVENTS.START);
});

listenOnSocket(EVENTS.STOP).subscribe(() => {
    clearCanvas();
    clearCanvasBtn.style.display = 'none';
    messageInputDiv.style.display = 'block';
    currentWordHeader.innerHTML = '';
    timeHeader.style.display = 'none';
    startBtn.style.display = 'block';

})

listenOnSocket(EVENTS.START).subscribe((word: string) => {
    console.log(`Game started: ${word}`);

    startBtn.style.display = 'none';
    timeHeader.style.display = 'block';

    clearCanvas();

    wordSpan.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

listenOnSocket(EVENTS.TIME).subscribe((seconds: number) => {
    timeSpan.innerHTML = seconds.toString();

    seconds--;

    if (seconds === 0) {
        timeSpan.innerHTML = 'expired';
        startBtn.style.display = 'block';
        messageInputDiv.style.display = 'block';

    }

})

listenOnSocket(EVENTS.WORD_REVEAL).subscribe((word: string) => {
    console.log(`Revealed word is ${word}`);

    wordSpan.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

emitOnSocket(name$).subscribe(({ socket, data }) => {
    socket.emit(EVENTS.NEW_PLAYER, data);
});

listenOnSocket(EVENTS.ALL_PLAYERS).subscribe((playersList: Player[]) => {

    players.clear();
    playersList.forEach(player => {
        players.set(player.id, { id: player.id, name: player.name, score: player.score });
    });

    renderPlayersList();
    printPlayers();
});


listenOnSocket(EVENTS.NEW_PLAYER).subscribe((player: Player) => {
    console.log(`${player.name} joined`);

    appendMessageToList({
        senderId: '',
        senderName: 'info',
        text: `${player.name} joined`
    });

    players.set(player.id, { id: player.id, name: player.name, score: player.score });
    renderPlayersList();
    printPlayers();
});

listenOnSocket(EVENTS.PLAYER_LEFT).subscribe((id: string) => {
    const playerThatLeft = players.get(id)!;
    console.log(`${playerThatLeft.name} left`);

    appendMessageToList({
        senderId: '',
        senderName: 'info',
        text: `${playerThatLeft.name} left`
    });

    players.delete(id);
    renderPlayersList();
    printPlayers();
});

emitOnSocket(canvasClear$).subscribe(({ socket }) => {
    clearCanvas();
    socket.emit(EVENTS.CLEAR_CANVAS);
});

listenOnSocket(EVENTS.CLEAR_CANVAS).subscribe(() => {
    clearCanvas();
});

listenOnSocket(EVENTS.GAME_STATE).subscribe((gameState) => {
    if (gameState.started) {
        console.log(gameState);
        startBtn.style.display = 'none';
        timeSpan.innerHTML = (30 - gameState.timePassed).toString();
        wordSpan.innerHTML = gameState.revealedWord.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
    }
})

emitOnSocket(canvasChange$).subscribe(({ socket }) => {
    const base64ImageData = canvas.toDataURL("image/png");
    socket.emit(EVENTS.IMAGE, base64ImageData);
});

listenOnSocket(EVENTS.IMAGE).subscribe((base64ImageData: string) => {

    console.log('received canvas change')

    const image = new Image();
    image.src = base64ImageData;

    image.onload = () => {
        ctx.drawImage(image, 0, 0);
    };

});

listenOnSocket(EVENTS.CORRECT_GUESS).subscribe((id: string) => {
    const player = players.get(id)!;

    players.set(id, {
        id: player.id,
        name: player.name,
        score: player.score + 100
    });

    renderPlayersList();
});

listenOnSocket(EVENTS.CORRECT_WORD).subscribe((word: string) => {
    currentWordHeader.innerHTML = 'You guessed correctly! The word is ' + word + '. ✅';
});
