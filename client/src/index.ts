import { Message, Player, RoundTime } from '@rx-pictionary/lib/models'
import { SocketIO } from "./socket";
import { start$, startButton } from './button-actions';
import { Canvas } from './canvas';
import { timeHeader, UI, messageInput, currentWordHeader, timeSpan, messageInputDiv } from './ui';
import { PlayerActions } from './player-actions';
import { EVENTS } from '@rx-pictionary/lib/socket';
import { Game } from './game';

const game = new Game();
const canvasChange$ = Canvas.getCanvasChangeStream(game.canDraw$);

UI.hide(timeHeader);

SocketIO.emitOnSocket(PlayerActions.playerSentMessage$).subscribe(({ socket, socketData: player }) => {

    const message: Message = {
        senderId: player.id,
        senderName: player.name,
        text: messageInput.value
    };

    UI.appendMessageToChat(message);

    socket.emit(EVENTS.FROM_CLIENT.MESSAGE, message);

    messageInput.value = '';
});

SocketIO.listenOnSocket(EVENTS.FROM_CLIENT.MESSAGE).subscribe((message: Message) => {
    UI.appendMessageToChat({
        senderId: message.senderId,
        senderName: message.senderName,
        text: message.text
    });

    console.log(JSON.stringify(message));
});

// emits when current player is drawing
SocketIO.emitOnSocket(start$).subscribe(({ socket }) => {
    game.canDraw$.next(true);

    setupForGameStart();
    UI.show(Canvas.clearCanvasButton);
    UI.hide(messageInputDiv);

    socket.emit(EVENTS.FROM_CLIENT.START);
});

// emits when someone else is drawing
game.start$.subscribe((word: string) => {
    console.log(`Game started: ${word}`);

    setupForGameStart();

    currentWordHeader.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

game.stop$.subscribe(() => {
    console.log('game stopped');
    Canvas.clearCanvas();
    UI.show(startButton);
    UI.hide(Canvas.clearCanvasButton);
    UI.hide(timeHeader);
    UI.show(messageInputDiv);
    UI.hide(currentWordHeader);
});

game.timePassed$.subscribe((seconds: number) => {
    timeSpan.innerHTML = seconds.toString();

    if (seconds === 0) {
        timeSpan.innerHTML = 'expired';
    }
});

game.revealedWord$.subscribe((word: string) => {
    console.log(`Revealed word is ${word}`);

    UI.show(currentWordHeader);
    currentWordHeader.innerHTML = word.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
});

game.gameState$.subscribe((gameState) => {
    if (gameState.running) {
        console.log(gameState);
        UI.hide(startButton);
        timeSpan.innerHTML = (30 - gameState.timePassed).toString();
        currentWordHeader.innerHTML = gameState.revealedWord.split('').map(letter => letter === '_' ? ' _ ' : letter).join('');
    }
});

game.correctGuess$.subscribe(() => {
    UI.renderPlayersList(game.players);
});

game.correctWord$.subscribe(word => {
    currentWordHeader.innerHTML = 'You guessed correctly! The word is ' + word + '. ✅';
});

game.allPlayer$.subscribe(() => {
    UI.renderPlayersList(game.players);
    printPlayers();
});

SocketIO.emitOnSocket(PlayerActions.name$).subscribe(({ socket, socketData: name }) => {
    socket.emit(EVENTS.FROM_CLIENT.NEW_PLAYER, name);
});

game.newPlayer$.subscribe((player: Player) => {
    console.log(`${player.name} joined`);

    UI.appendMessageToChat({
        senderId: '',
        senderName: 'info',
        text: `${player.name} joined`
    });

    UI.renderPlayersList(game.players);
    printPlayers();
});

game.playerLeft$.subscribe((playerThatLeft: Player) => {
    console.log(`${playerThatLeft.name} left`);

    UI.appendMessageToChat({
        senderId: '',
        senderName: 'info',
        text: `${playerThatLeft.name} left`
    });

    UI.renderPlayersList(game.players);
    printPlayers();
});

SocketIO.emitOnSocket(Canvas.canvasClear$).subscribe(({ socket }) => {
    Canvas.clearCanvas();
    socket.emit(EVENTS.FROM_CLIENT.CLEAR_CANVAS);
});

SocketIO.listenOnSocket(EVENTS.FROM_CLIENT.CLEAR_CANVAS).subscribe(() => {
    Canvas.clearCanvas();
});

SocketIO.emitOnSocket(canvasChange$).subscribe(({ socket, socketData: base64ImageData }) => {
    socket.emit(EVENTS.FROM_CLIENT.IMAGE, base64ImageData);
});

SocketIO.listenOnSocket(EVENTS.FROM_CLIENT.IMAGE).subscribe((base64ImageData: string) => {
    console.log('received canvas change');
    Canvas.loadImageToCanvas(base64ImageData);
});

function setupForGameStart() {
    timeSpan.innerHTML = RoundTime.toString();

    Canvas.clearCanvas();
    UI.hide(startButton);
    UI.show(timeHeader);
    UI.show(currentWordHeader);
}

function printPlayers() {
    console.log(Array.from(game.players.values()));
}