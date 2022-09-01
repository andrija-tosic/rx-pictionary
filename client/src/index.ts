import { Message, Player, RoundTime } from '@rx-pictionary/lib/models'
import { listenOnSocket, emitOnSocket } from "./socket";
import { start$, startButton } from './button-actions';
import { clearCanvasButton, clearCanvas, canvasClear$, loadImageToCanvas, getCanvasChangeStream as getCanvasStream } from './canvas';
import { appendMessageToChat, hide, renderPlayersList, show } from './render';
import { name$, playerSentMessage$ } from './player-actions';
import { EVENTS } from '@rx-pictionary/lib/socket';
import { Game } from './game';

const timeSpan = document.getElementById('time')!;
const currentWordHeader = document.getElementById('current-word-header')!;
const messageInputDiv = document.getElementById('message-input-div')!;
const messageInput = document.getElementById('message-input')! as HTMLInputElement;
const timeHeader = document.getElementById('time-header')!;
hide(timeHeader);

const game = new Game();
const canvasChange$ = getCanvasStream(game.canDraw$);

function printPlayers() {
    console.log(Array.from(game.players.values()));
}

emitOnSocket(playerSentMessage$).subscribe(({ socket, socketData: player }) => {

    const message: Message = {
        senderId: player.id,
        senderName: player.name,
        text: messageInput.value
    };

    appendMessageToChat(message);

    socket.emit(EVENTS.MESSAGE, message);

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
    hide(startButton);
    show(timeHeader);
    show(currentWordHeader);
}

// emits when current player is drawing
emitOnSocket(start$).subscribe(({ socket }) => {
    game.canDraw$.next(true);

    setupForGameStart();
    show(clearCanvasButton);
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
    console.log('game stopped');
    clearCanvas();
    show(startButton);
    hide(clearCanvasButton);
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
        hide(startButton);
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