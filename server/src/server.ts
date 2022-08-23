import { players } from './../../client/src/index';
import express from "express";
import cors from "cors";
import * as http from "http";
import fetch from "node-fetch";
import { Message } from "../../shared/models/message";
import { Server, Socket } from "socket.io"
import { Player } from "../../shared/models/player";
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../../shared/socket-events";
import { Game } from "../models/game";

type id = string;

export class AppServer {
    private app: express.Application;
    private server: http.Server;
    private io: Server;
    private socket: Socket<ClientToServerEvents, ServerToClientEvents>;
    private serverPort: string | number;
    private jsonPort: string | number;
    private api: string;

    private players = new Map<string, Player>;

    private drawingPlayerSocket: Socket<ClientToServerEvents, ServerToClientEvents>;

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
        this.api = process.env.API_URL!;
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
        this.drawingPlayerSocket.broadcast.emit('wordReveal', word);
    }

    public emitTime(seconds: number): void {
        this.io.sockets.emit('time', seconds);
    }

    private events(): void {
        this.io.on('error', (err: Error) => {
            console.log(`connect_error due to ${err.message}`);
        });

        this.io.on('connect', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
            // console.log(`${socket.id} connected`);
            this.socket = socket;

            this.io.sockets.emit('allPlayers', Array.from(this.players.values()))
            // .filter(player => player.id !== socket.id));

            socket.on('newPlayer', async (name) => {
                console.log(`Player ${socket.id}: ${name} connected`);

                const res = await fetch(`${this.api}/players?name=${name}`);

                const players = await res.json() as Omit<Player, 'id'>[];
                console.log(players);

                const playerToEmit: Player = {
                    id: socket.id,
                    name: name,
                    score: players.length !== 0 ? players[0].score : 0
                }

                if (players.length === 0) {
                    await fetch(`${this.api}/players`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            name: name,
                            score: 0
                        })
                    });
                }

                this.players.set(socket.id, playerToEmit)
                this.io.sockets.emit('newPlayer', playerToEmit);

                if (this.game) {
                    socket.emit('gameState', {
                        started: this.game.started,
                        drawingPlayerId: this.game.drawingPlayerId,
                        revealedWord: this.game.revealedWord,
                        timePassed: this.game.timePassed
                    });
                }

            });

            socket.on('start', async () => {

                const res = await fetch(`${this.api}/words`);

                if (!res.ok) {
                    console.log(res.text);
                    return;
                }

                this.drawingPlayerSocket = socket;

                const words: string[] = await res.json() as string[];
                const word = words[Math.floor(Math.random() * words.length)];

                this.game = new Game(this, word, socket.id);

                this.io.sockets.emit('start', '_'.repeat(word.length));

                socket.emit('wordReveal', word); // emitted only to player who's drawing

                console.log(`Game started with word: ${word}`);
            });

            socket.on('message', async (message: Message) => {
                console.log("[server](message): %s", JSON.stringify(message));

                console.log(this.game?.started, socket.id !== this.drawingPlayerSocket.id,
                    message.text.trim().toLowerCase().localeCompare(this.game?.word) === 0)

                if (this.game?.started
                    && socket.id !== this.drawingPlayerSocket.id
                    && message.text.trim().toLowerCase().localeCompare(this.game?.word) === 0
                ) {
                    socket.broadcast.emit('message', {
                        senderId: message.senderId,
                        senderName: message.senderName,
                        text: `has guessed the word! ✅`
                    });

                    this.io.sockets.emit('correctGuess', socket.id);
                    socket.emit('correctWord', this.game.word);

                    console.log(`${message.senderName} has guessed the word! ✅`);

                    const scoreToAdd =
                        this.game.timePassed > 0 && this.game.timePassed < 10
                            ? 100
                            : this.game.timePassed >= 10 && this.game.timePassed < 20
                                ? 50
                                : 25

                    const player = this.players.get(message.senderId)!;

                    const playerToPUT: Omit<Player, 'id'> = player;

                    const res = await fetch(`${this.api}/players?name=${player.name}`, {
                        method: 'PUT',
                        body: JSON.stringify(playerToPUT)
                    });

                    player.score += scoreToAdd;
                }
                else {
                    socket.broadcast.emit('message', message);
                }
            }
            );

            socket.on('image', (imgBase64: string) => {
                socket.broadcast.emit('image', imgBase64);
            })

            socket.on('clearCanvas', () => {
                socket.broadcast.emit('clearCanvas');
            })

            socket.on('disconnect', () => {
                console.log(`Player ${socket.id}: ${this.players.get(socket.id)?.name} disconnected`);
                this.players.delete(socket.id);
                if (this.game?.started && socket.id === this.game.drawingPlayerId) {
                    this.game.stop();
                    // TODO: broadcast that game is reset
                    socket.broadcast.emit('stop');
                }
                socket.broadcast.emit('playerLeft', socket.id);
            });
        });

    }

    public getApp(): express.Application {
        return this.app;
    }
}