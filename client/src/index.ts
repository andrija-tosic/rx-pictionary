import { RoundTime } from './../../shared/models/game-state';
import { Message } from '../../shared/models/message';
import { Player } from '../../shared/models/player';
import { listenOnSocket, emitOnSocket } from "./socket";
import { start$, startBtn } from './button-actions';
import { clearCanvasBtn, clearCanvas, canvasClear$, loadImageToCanvas, canvasChange$ } from './canvas';
import { appendMessageToChat, renderPlayersList } from './render';
import { name$, playerSentMessage$ } from './player-actions';
import { EVENTS } from '../../shared/socket-events';
import { game } from './game';

const wordSpan = document.getElementById('word')!;
const timeSpan = document.getElementById('time')!;
const currentWordHeader = document.getElementById('current-word-header')!;
const messageInputDiv = document.getElementById('message-input-div')!;
const messageInput = document.getElementById('message-input')! as HTMLInputElement;
const timeHeader = document.getElementById('time-header')!;

function printPlayers() {
    console.log(Array.from(game.players.values()));
}

function show(el: HTMLElement) {
    el.style.display = 'block';
}

function hide(el: HTMLElement) {
    el.style.display = 'none';
}

emitOnSocket(playerSentMessage$).subscribe(({ socket, socketData }) => {

    console.log('appending message to list');
    appendMessageToChat({
        senderId: socketData.id,
        senderName: socketData.name,
        text: messageInput.value
    });

    console.log('emitting message');
    socket.emit(EVENTS.MESSAGE, {
        senderId: socketData.id,
        senderName: socketData.name,
        text: messageInput.value
    });

    messageInput.value = '';
});

listenOnSocket(EVENTS.MESSAGE).subscribe((message: Message) => {
    console.log('received message to list');
    appendMessageToChat({
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text
    });

    console.log(JSON.stringify(message));
});


emitOnSocket(start$).subscribe(({ socket }) => {
    timeSpan.innerHTML = RoundTime.toString();
    game.isDrawing$.next(true);
    clearCanvas();
    show(clearCanvasBtn);
    hide(timeHeader);
    hide(messageInputDiv);

    socket.emit(EVENTS.START);
});

listenOnSocket(EVENTS.STOP).subscribe(() => {
    clearCanvas();
    show(startBtn);
    show(messageInputDiv);
    hide(clearCanvasBtn);
    hide(currentWordHeader);
    hide(timeHeader);
});

game.word$.subscribe((word: string) => {
    console.log(`Game started: ${word}`);

    hide(startBtn);
    show(timeHeader);
    show(currentWordHeader);

    clearCanvas();

    wordSpan.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

game.timePassed$.subscribe((seconds: number) => {
    timeSpan.innerHTML = seconds.toString();

    seconds--;

    if (seconds === 0) {
        timeSpan.innerHTML = 'expired';
        show(startBtn);
        show(messageInputDiv);

    }

});

game.revealedWord$.subscribe((word: string) => {
    console.log(`Revealed word is ${word}`);

    wordSpan.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

emitOnSocket(name$).subscribe(({ socket, socketData }) => {
    socket.emit(EVENTS.NEW_PLAYER, socketData);
});

listenOnSocket(EVENTS.ALL_PLAYERS).subscribe((playersList: Player[]) => {

    game.players.clear();
    playersList.forEach(player => {
        game.players.set(player.id, { id: player.id, name: player.name, score: player.score });
    });

    renderPlayersList(game.players);
    printPlayers();
});


listenOnSocket(EVENTS.NEW_PLAYER).subscribe((player: Player) => {
    console.log(`${player.name} joined`);

    appendMessageToChat({
        senderId: '',
        senderName: 'info',
        text: `${player.name} joined`
    });

    game.players.set(player.id, { id: player.id, name: player.name, score: player.score });
    renderPlayersList(game.players);
    printPlayers();
});

listenOnSocket(EVENTS.PLAYER_LEFT).subscribe((id: string) => {
    const playerThatLeft = game.players.get(id)!;
    console.log(`${playerThatLeft.name} left`);

    appendMessageToChat({
        senderId: '',
        senderName: 'info',
        text: `${playerThatLeft.name} left`
    });

    game.players.delete(id);
    renderPlayersList(game.players);
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
        hide(startBtn);
        timeSpan.innerHTML = (30 - gameState.timePassed).toString();
        wordSpan.innerHTML = gameState.revealedWord.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
    }
})

emitOnSocket(canvasChange$).subscribe(({ socket, socketData }) => {
    const base64ImageData = socketData;
    socket.emit(EVENTS.IMAGE, base64ImageData);
});

listenOnSocket(EVENTS.IMAGE).subscribe((base64ImageData: string) => {
    console.log('received canvas change');

    loadImageToCanvas(base64ImageData);
});

listenOnSocket(EVENTS.CORRECT_GUESS).subscribe((playerData: { id: string, score: number }) => {
    const player = game.players.get(playerData.id)!;

    game.players.set(playerData.id, {
        id: player.id,
        name: player.name,
        score: playerData.score
    });

    renderPlayersList(game.players);
});

listenOnSocket(EVENTS.CORRECT_WORD).subscribe((word: string) => {
    currentWordHeader.innerHTML = 'You guessed correctly! The word is ' + word + '. ✅';
});
