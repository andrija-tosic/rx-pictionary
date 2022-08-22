import { filter, tap, share } from 'rxjs/operators';
import { fromEvent, merge } from "rxjs";

const startBtn = document.getElementById('start-btn')!;
const sendBtn = document.getElementById('send-btn')!;

export const start$ = fromEvent(startBtn, 'click').pipe(
    tap(() => {
        startBtn.style.display = 'none';
    }),
    share()
);

const sendBtnPress$ = fromEvent(sendBtn, 'click').pipe(
    tap(() => {
        // console.log('send fromEvent tap');
    })
);

const enterKeyPress$ = fromEvent(
    document.getElementById('message-input')!,
    'keypress'
).pipe(filter((e: any) => e.keyCode === 13 || e.which === 13));

export const send$ = merge(
    sendBtnPress$,
    enterKeyPress$
).pipe(
    filter((text: string) => !!text),
    // share()
)