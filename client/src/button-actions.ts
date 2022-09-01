import { filter } from 'rxjs/operators';
import { fromEvent, merge } from "rxjs";

export const startButton = document.getElementById('start-btn')!;
const sendButton = document.getElementById('send-btn')! as HTMLButtonElement;
const messageInput = document.getElementById('message-input')! as HTMLInputElement;

export const start$ = fromEvent(startButton, 'click');

const sendButtonClick$ = fromEvent(sendButton, 'click');

const enterKeyPress$ = fromEvent(messageInput, 'keypress')
    .pipe(
        filter((e) => (e as KeyboardEvent).key === "Enter")
    );

export const send$ = merge(
    sendButtonClick$,
    enterKeyPress$
).pipe(
    filter(() => !!messageInput.value),
)