import { RoundTime } from './../../shared/models/game-state';
import { Message } from '../../shared/models/message';
import { Player } from '../../shared/models/player';
import { listenOnSocket, emitOnSocket } from "./socket";
import { start$, startBtn } from './button-actions';
import { clearCanvasBtn, clearCanvas, canvasClear$, loadImageToCanvas, getCanvasChangeStream as getCanvasStream } from './canvas';
import { appendMessageToChat, hide, renderPlayersList, show } from './render';
import { name$, playerSentMessage$ } from './player-actions';
import { EVENTS } from '../../shared/socket-events';
import { Game } from './game';

const timeSpan = document.getElementById('time')!;
const currentWordHeader = document.getElementById('current-word-header')!;
const messageInputDiv = document.getElementById('message-input-div')!;
const messageInput = document.getElementById('message-input')! as HTMLInputElement;
const timeHeader = document.getElementById('time-header')!;

const game = new Game();
const canvasChange$ = getCanvasStream(game.isDrawing$);

function printPlayers() {
    console.log(Array.from(game.players.values()));
}

emitOnSocket(playerSentMessage$).subscribe(({ socket, socketData: player }) => {

    appendMessageToChat({
        senderId: player.id,
        senderName: player.name,
        text: messageInput.value
    });

    socket.emit(EVENTS.MESSAGE, {
        senderId: player.id,
        senderName: player.name,
        text: messageInput.value
    });

    messageInput.value = '';
});

listenOnSocket(EVENTS.MESSAGE).subscribe((message: Message) => {
    appendMessageToChat({
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text
    });

    console.log(JSON.stringify(message));
});

function setupForGameStart() {
    timeSpan.innerHTML = RoundTime.toString();

    clearCanvas();
    hide(startBtn);
    show(timeHeader);
    show(currentWordHeader);
}

// emits when current player is drawing
emitOnSocket(start$).subscribe(({ socket }) => {
    game.isDrawing$.next(true);

    setupForGameStart();
    show(clearCanvasBtn);
    hide(messageInputDiv);

    socket.emit(EVENTS.START);
});

// emits when someone else is drawing
game.start$.subscribe((word: string) => {
    console.log(`Game started: ${word}`);

    setupForGameStart();

    currentWordHeader.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

game.stop$.subscribe(() => {
    clearCanvas();
    show(startBtn);
    hide(clearCanvasBtn);
    hide(timeHeader);
    show(messageInputDiv);
    hide(currentWordHeader);
});

game.timePassed$.subscribe((seconds: number) => {
    timeSpan.innerHTML = seconds.toString();

    if (seconds === 0) {
        timeSpan.innerHTML = 'expired';
    }
});

game.revealedWord$.subscribe((word: string) => {
    console.log(`Revealed word is ${word}`);

    show(currentWordHeader);
    currentWordHeader.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

game.gameState$.subscribe((gameState) => {
    if (gameState.running) {
        console.log(gameState);
        hide(startBtn);
        timeSpan.innerHTML = (30 - gameState.timePassed).toString();
        currentWordHeader.innerHTML = gameState.revealedWord.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
    }
});

game.correctGuess$.subscribe(() => {
    renderPlayersList(game.players);
});

game.correctWord$.subscribe(word => {
    currentWordHeader.innerHTML = 'You guessed correctly! The word is ' + word + '. ✅';
});

game.allPlayer$.subscribe(() => {
    renderPlayersList(game.players);
    printPlayers();
});

emitOnSocket(name$).subscribe(({ socket, socketData: name }) => {
    socket.emit(EVENTS.NEW_PLAYER, name);
});

game.newPlayer$.subscribe((player: Player) => {
    console.log(`${player.name} joined`);

    appendMessageToChat({
        senderId: '',
        senderName: 'info',
        text: `${player.name} joined`
    });

    renderPlayersList(game.players);
    printPlayers();
});

game.playerLeft$.subscribe((playerThatLeft: Player) => {
    console.log(`${playerThatLeft.name} left`);

    appendMessageToChat({
        senderId: '',
        senderName: 'info',
        text: `${playerThatLeft.name} left`
    });

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

emitOnSocket(canvasChange$).subscribe(({ socket, socketData: base64ImageData }) => {
    socket.emit(EVENTS.IMAGE, base64ImageData);
});

listenOnSocket(EVENTS.IMAGE).subscribe((base64ImageData: string) => {
    console.log('received canvas change');
    loadImageToCanvas(base64ImageData);
});