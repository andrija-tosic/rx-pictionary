import { of, fromEvent, Observable } from "rxjs";
import { map, switchMap, tap } from "rxjs/operators";
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents } from '../../shared/socket-events';

export const socket$: Observable<Socket<ServerToClientEvents, ClientToServerEvents>> = of(io("ws://localhost:3000"));

export const connection$: Observable<Socket<ServerToClientEvents, ClientToServerEvents>> = socket$.pipe(
    switchMap((socket) => fromEvent(socket as any, "connect").pipe(map(() => socket)))
);

export type SocketParameterType = ServerToClientEvents[keyof ServerToClientEvents] extends []
    ? Parameters<ServerToClientEvents[keyof ServerToClientEvents]>
    : Parameters<ServerToClientEvents[keyof ServerToClientEvents]>[0]

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
    data: T
}> {
    return connection$.pipe(
        switchMap((socket) => observable.pipe(
            // tap((data) => console.log('connection switchMap', data)),
            map((data) => ({ socket, data }))))
    );
}
