import { filter, tap } from 'rxjs/operators';
import { fromEvent, merge } from "rxjs";

export const startBtn = document.getElementById('start-btn')!;
const sendBtn = document.getElementById('send-btn')! as HTMLButtonElement;
const messageInput = document.getElementById('message-input')! as HTMLInputElement;

export const start$ = fromEvent(startBtn, 'click').pipe(
    tap(() => {
        startBtn.style.display = 'none';
    }),
);

const sendBtnPress$ = fromEvent(sendBtn, 'click').pipe(
    tap(() => {
        // console.log('send fromEvent tap');
    })
);

const enterKeyPress$ = fromEvent(messageInput, 'keypress')
    .pipe(
        filter((e) => (e as KeyboardEvent).key === "Enter")
    );

export const send$ = merge(
    sendBtnPress$,
    enterKeyPress$
).pipe(
    filter(() => !!messageInput.value),
)