import { SocketParameterType } from '../../shared/socket-parameter';
import { EVENTS } from './../../shared/socket-events';
import express from "express";
import cors from "cors";
import * as http from "http";
import fetch from "node-fetch";
import { Message } from "../../shared/models/message";
import { Server, Socket } from "socket.io"
import { Player } from "../../shared/models/player";
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData } from "../../shared/socket-events";
import { Game } from "../../shared/models/game";

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
        this.io = new Server
            <ClientToServerEvents,
                ServerToClientEvents,
                InterServerEvents,
                SocketData<SocketParameterType>
            >
            (this.server, {
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
        this.drawingPlayerSocket.broadcast.emit(EVENTS.WORD_REVEAL, word);
    }

    public emitTime(seconds: number): void {
        this.io.sockets.emit(EVENTS.TIME, seconds);
    }

    private events(): void {
        this.io.on(EVENTS.ERROR, (err: Error) => {
            console.log(`connect_error due to ${err.message}`);
        });

        this.io.on(EVENTS.CONNECT, (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
            // console.log(`${socket.id} connected`);
            this.socket = socket;

            this.io.sockets.emit(EVENTS.ALL_PLAYERS, Array.from(this.players.values()))

            socket.on(EVENTS.NEW_PLAYER, async (name) => {
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
                this.io.sockets.emit(EVENTS.NEW_PLAYER, playerToEmit);

                if (this.game) {
                    socket.emit(EVENTS.GAME_STATE, {
                        started: this.game.started,
                        drawingPlayerId: this.game.drawingPlayerId,
                        revealedWord: this.game.revealedWord,
                        timePassed: this.game.timePassed
                    });
                }

            });

            socket.on(EVENTS.START, async () => {

                const res = await fetch(`${this.api}/words`);

                if (!res.ok) {
                    console.log(res.text);
                    return;
                }

                this.drawingPlayerSocket = socket;

                const words: string[] = await res.json() as string[];
                const word = words[Math.floor(Math.random() * words.length)];

                this.game = new Game(this, word, socket.id);

                this.io.sockets.emit(EVENTS.START, '_'.repeat(word.length));

                socket.emit(EVENTS.WORD_REVEAL, word); // emitted only to player who's drawing

                console.log(`Game started with word: ${word}`);
            });

            socket.on(EVENTS.MESSAGE, async (message: Message) => {
                console.log("[server](message): %s", JSON.stringify(message));

                if (this.game?.started
                    && socket.id !== this.drawingPlayerSocket.id
                    && message.text.trim().toLowerCase() === this.game?.word
                ) {
                    const scoreToAdd =
                        this.game.timePassed > 0 && this.game.timePassed < 10
                            ? 100
                            : this.game.timePassed >= 10 && this.game.timePassed < 20
                                ? 50
                                : 25;

                    socket.broadcast.emit(EVENTS.MESSAGE, {
                        senderId: message.senderId,
                        senderName: message.senderName,
                        text: `has guessed the word! +${scoreToAdd} points ✅`
                    });

                    this.io.sockets.emit(EVENTS.CORRECT_GUESS, socket.id);
                    socket.emit(EVENTS.CORRECT_WORD, this.game.word);

                    console.log(`${message.senderName} has guessed the word! +${scoreToAdd} points ✅`);

                    const player = this.players.get(message.senderId)!;
                    player.score += scoreToAdd;

                    const playerToPUT: Omit<Player, 'id'> = { name: player.name, score: player.score };

                    console.log(playerToPUT, 'playerToPUT');

                    const res = await fetch(`${this.api}/players/${player.name}`, {
                        method: 'PUT',
                        body: JSON.stringify(playerToPUT)
                    });

                    if (res.ok)
                        console.log(`Player score increased by ${scoreToAdd}`);

                }
                else {
                    socket.broadcast.emit(EVENTS.MESSAGE, message);
                }
            }
            );

            socket.on(EVENTS.IMAGE, (imgBase64: string) => {
                socket.broadcast.emit(EVENTS.IMAGE, imgBase64);
            })

            socket.on(EVENTS.CLEAR_CANVAS, () => {
                socket.broadcast.emit(EVENTS.CLEAR_CANVAS);
            })

            socket.on(EVENTS.DISCONNECT, () => {
                console.log(`Player ${socket.id}: ${this.players.get(socket.id)?.name} disconnected`);
                this.players.delete(socket.id);
                if (this.game?.started && socket.id === this.game.drawingPlayerId) {
                    this.game.stop();
                    socket.broadcast.emit(EVENTS.STOP);
                }
                socket.broadcast.emit(EVENTS.PLAYER_LEFT, socket.id);
            });
        });
    }

    public getApp(): express.Application {
        return this.app;
    }
}