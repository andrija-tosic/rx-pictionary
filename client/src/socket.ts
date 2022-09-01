import { of, fromEvent, Observable } from "rxjs";
import { JQueryStyleEventEmitter } from "rxjs/internal/observable/fromEvent";
import { map, switchMap } from "rxjs/operators";
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from '@rx-pictionary/lib/socket';

const socketIOURL = process.env.SOCKETIO_URL!;
const socketIOPort = process.env.SERVER_PORT!;

export const socket$: Observable<Socket<ServerToClientEvents, ClientToServerEvents>>
    = of(io(`${socketIOURL}:${socketIOPort}`));

export const connection$: Observable<Socket<ServerToClientEvents, ClientToServerEvents>> = socket$.pipe(
    switchMap((socket) => fromEvent(
        socket as JQueryStyleEventEmitter<Socket<ServerToClientEvents, ClientToServerEvents>, Error>,
        "connect")
        .pipe(map(() => socket)))
);

export function listenOnSocket
    <
        E extends keyof ServerToClientEvents,

        P = ServerToClientEvents[E] extends []
        ? Parameters<ServerToClientEvents[E]>
        : Parameters<ServerToClientEvents[E]>[0]
    >
    (event: E) {
    return connection$.pipe(switchMap((socket) => fromEvent<P>(socket as Socket, event)));
}

export function emitOnSocket<T>(observable: Observable<T>): Observable<{
    socket: Socket<ServerToClientEvents, ClientToServerEvents>,
    socketData: T
}> {
    return connection$.pipe(
        switchMap((socket) => observable.pipe(
            map((socketData) => ({ socket, socketData }))))
    );
}
