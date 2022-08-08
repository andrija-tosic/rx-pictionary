import { of, fromEvent, Observable } from "rxjs";
import { map, mapTo, switchMap } from "rxjs/operators";
import { io, Socket } from "socket.io-client";
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from '../../shared/socket-events';

export const socket$: Observable<Socket<ServerToClientEvents, ClientToServerEvents>> = of(io("ws://localhost:3000"));

export const connect$: Observable<Socket<ServerToClientEvents, ClientToServerEvents>> = socket$.pipe(
    switchMap((socket) => fromEvent(socket as any, "connect").pipe(mapTo(socket)))
);

export function listenAfterConnected<K, V>(event: keyof ServerToClientEvents): Observable<any> {
    return connect$.pipe(switchMap((socket) => fromEvent(socket as any, event)));
}
export function emitAfterConnected(observable: Observable<any>): Observable<{
    socket: Socket<ServerToClientEvents, ClientToServerEvents>,
    data: any
}> {
    return connect$.pipe(
        switchMap((socket) => observable.pipe(map((data) => ({ socket, data }))))
    );
}
