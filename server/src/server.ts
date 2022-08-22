import express from "express";
import cors from "cors";
import * as http from "http";
import * as socketIO from "socket.io"
import fetch from "node-fetch";
import { Message } from "../../shared/models/message";
import { Server, Socket } from "socket.io"
import { Player } from "../../shared/models/player";
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../../shared/socket-events";
import { Game } from "../models/game";

export class AppServer {
    private app: express.Application;
    private server: http.Server;
    private io: Server;
    private socket: Socket<ClientToServerEvents, ServerToClientEvents>;
    private serverPort: string | number;
    private jsonPort: string | number;
    private apiUrl: string;

    private players = new Map<string, Player>;

    private game: Game;

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
        require("dotenv").config();

        this.serverPort = process.env.PORT!;
        this.jsonPort = process.env.JSON_PORT!;
        this.apiUrl = process.env.API_URL!;
    }

    private sockets(): void {
        this.io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(this.server, {
            cors: {
                origin: '*'
            },
        });
    }

    private listen(): void {
        this.server.listen(this.serverPort, () => {
            console.log("Running http server on port %s", this.serverPort);
        });
    }

    public revealWord(word: string): void {
        this.socket.broadcast.emit('wordReveal', word);
    }

    private events(): void {
        this.io.on('error', (err: Error) => {
            console.log(`connect_error due to ${err.message}`);
        });

        this.io.on('connect', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
            // console.log(`${socket.id} connected`);
            this.socket = socket;

            socket.broadcast.emit('allPlayers', Array.from(this.players.values()).filter(player => player.id !== socket.id));

            socket.on('newPlayer', (name) => {
                console.log(`Player ${socket.id}: ${name} connected`);

                this.players.set(socket.id, { id: socket.id, name: name, score: 0 });
                socket.broadcast.emit('newPlayer', { id: socket.id, name: name, score: 0 });
            });

            socket.on('start', async () => {

                const res = await fetch(`${this.apiUrl}/words`);

                if (!res.ok) {
                    return;
                }

                const words: string[] = await res.json() as string[];
                const word = words[Math.floor(Math.random() * words.length)];

                this.game = new Game(this, word, socket.id);

                socket.broadcast.emit('start', '_'.repeat(word.length));

                socket.emit('wordReveal', word); // emitted to player who's drawing

                console.log(`Game started with word: ${word}`);
            });

            socket.on('message', (m: Message) => {
                console.log("[server](message): %s", JSON.stringify(m));

                if (m.text.trim().toLowerCase().localeCompare(this.game.word) === 0) {
                    socket.broadcast.emit('message', {
                        senderId: m.senderId,
                        senderName: m.senderName,
                        text: `${m.senderName} has guessed the word!`
                    });
                    // add score to player
                }
                else {
                    socket.broadcast.emit('message', m);
                }
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