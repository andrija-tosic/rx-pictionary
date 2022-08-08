import express from "express";
import cors from "cors";
import * as http from "http";
import * as socketIO from "socket.io"
import { Message } from "../../shared/models/message";
import { Server, Socket } from "socket.io"
import { Player } from "../../shared/models/player";
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../../shared/socket-events";

export class AppServer {
    public static readonly PORT: number = 3000;
    private app: express.Application;
    private server: http.Server;
    private io: Server;
    private port: string | number;

    private players = new Map<string, Player>;

    constructor() {
        this.createApp();
        this.config();
        this.createServer();
        this.sockets();
        this.listen();
        this.events();
    }

    private createApp(): void {
        this.app = express();
        this.app.use(cors({
            origin: '*'
        }));
    }

    private createServer(): void {
        this.server = http.createServer(this.app);
    }

    private config(): void {
        this.port = process.env.PORT || AppServer.PORT;
    }

    private sockets(): void {
        // const Server = require("socket.io")(this.server);

        this.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(this.server, {
            cors: {
                origin: '*'
            },
        });
    }

    private listen(): void {
        this.server.listen(this.port, () => {
            console.log("Running http server on port %s", this.port);
        });
    }

    private events(): void {
        this.io.on('error', (err: Error) => {
            console.log(`connect_error due to ${err.message}`);
        });

        this.io.on('connect', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
            console.log(`${socket.id} connected`);

            socket.broadcast.emit('allPlayers', Array.from(this.players.values()).filter(player => player.id !== socket.id));

            socket.on('newPlayer', (name) => {
                console.log(`Player ${socket.id}: ${name} connected`);

                this.players.set(socket.id, { id: socket.id, name: name, score: 0, ready: false });
                socket.broadcast.emit('newPlayer', { id: socket.id, name: name, score: 0, ready: false });
            });

            socket.on('playerReady', () => {
                this.players.get(socket.id)!.ready = true;
            });

            socket.on('message', (m: Message) => {
                console.log("[server](message): %s", JSON.stringify(m));
                socket.broadcast.emit('message', m);
            });

            socket.on('image', (imgBase64: string) => {
                socket.broadcast.emit('image', imgBase64);
            })

            socket.on('disconnect', () => {
                console.log(`Player ${socket.id}: ${this.players.get(socket.id)?.name} disconnected`);
                this.players.delete(socket.id);
                socket.broadcast.emit('playerLeft', socket.id);
            });
        });

    }

    public getApp(): express.Application {
        return this.app;
    }
}