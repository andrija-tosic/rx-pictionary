import { ServerToClientEvents } from "./socket-events";

export type SocketParameterType = ServerToClientEvents[keyof ServerToClientEvents] extends []
    ? Parameters<ServerToClientEvents[keyof ServerToClientEvents]>
    : Parameters<ServerToClientEvents[keyof ServerToClientEvents]>[0]
