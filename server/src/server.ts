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
import { Game } from "./game";

export class AppServer {
    private app: express.Application;
    private server: http.Server;
    private io: Server;
    private socket: Socket<ClientToServerEvents, ServerToClientEvents>;
    private serverPort: string | number;
    private api: string;

    private drawingPlayerSocket: Socket<ClientToServerEvents, ServerToClientEvents>;

    private game: Game = new Game();

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
            this.socket = socket;

            this.io.sockets.emit(EVENTS.ALL_PLAYERS, Array.from(this.game.players.values()))

            socket.on(EVENTS.NEW_PLAYER, async (name) => {
                console.log(`Player ${socket.id}: ${name} connected`);

                const res = await fetch(`${this.api}/players/${name}`);
                const fetchedPlayer = await res.json() as Player;

                const playerToEmit: Player = {
                    id: socket.id,
                    name: name,
                    score: res.ok ? fetchedPlayer.score : 0
                }

                console.log('fetched player:', fetchedPlayer);

                if (res.status === 404) {
                    await fetch(`${this.api}/players`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            score: 0
                        })
                    });
                }

                this.game.players.set(socket.id, playerToEmit);
                this.io.sockets.emit(EVENTS.NEW_PLAYER, playerToEmit);

                socket.emit(EVENTS.GAME_STATE, {
                    running: this.game.running,
                    drawingPlayerId: this.game.drawingPlayerId,
                    revealedWord: this.game.revealedWord,
                    timePassed: this.game.timePassed
                });
            });

            socket.on(EVENTS.START, async () => {
                this.game.correctGuesses.clear();

                const res = await fetch(`${this.api}/words`);

                if (!res.ok) {
                    console.log(res.text);
                    return;
                }

                this.drawingPlayerSocket = socket;

                const words: string[] = await res.json() as string[];
                const word = words[Math.floor(Math.random() * words.length)];

                this.game.start(this, word, socket.id);

                socket.broadcast.emit(EVENTS.START, '_'.repeat(word.length));

                socket.emit(EVENTS.WORD_REVEAL, word); // emitted only to player who's drawing

                console.log(`Game started with word: ${word}`);
            });

            socket.on(EVENTS.MESSAGE, async (message: Message) => {
                console.log("[server](message): %s", JSON.stringify(message));

                if (this.game.running
                    && socket.id !== this.drawingPlayerSocket.id
                    && message.text.trim().toLowerCase() === this.game.word
                ) {
                    if (!this.game.correctGuesses.has(socket.id)) {

                        this.game.correctGuesses.add(socket.id);

                        const { scoreToAdd, scoreToAddToDrawingPlayer } = this.game.calculateScoreToAdd();

                        await Promise.all([
                            this.increasePlayerScore(socket, scoreToAdd),
                            this.increasePlayerScore(this.drawingPlayerSocket, scoreToAddToDrawingPlayer)
                        ]);

                        socket.emit(EVENTS.CORRECT_WORD, this.game.word);

                        socket.broadcast.emit(EVENTS.MESSAGE, {
                            senderId: message.senderId,
                            senderName: message.senderName,
                            text: `has guessed the word! +${scoreToAdd} points ✅`
                        });

                        console.log(`${message.senderName} has guessed the word! +${scoreToAdd} points ✅`);

                        setTimeout(() => {
                            if (this.game.correctGuesses.size === this.game.players.size - 1) {
                                this.game.stop();
                                this.io.sockets.emit(EVENTS.STOP);
                            }
                        }, 3000);
                    }
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
                console.log(`Player ${socket.id}: ${this.game.players.get(socket.id)?.name} disconnected`);
                this.game.players.delete(socket.id);
                if (this.game.running && socket.id === this.game.drawingPlayerId) {
                    this.game.stop();
                    this.io.sockets.emit(EVENTS.STOP);
                }
                socket.broadcast.emit(EVENTS.PLAYER_LEFT, socket.id);
            });
        });
    }

    private async increasePlayerScore(socket: Socket<ClientToServerEvents, ServerToClientEvents>, scoreToAdd: number) {
        const player = this.game.players.get(socket.id)!;
        player.score += scoreToAdd;

        this.io.sockets.emit(EVENTS.CORRECT_GUESS, { id: socket.id, score: player.score });

        const playerToPUT: Omit<Player, 'id' | 'name'> = { score: player.score };

        console.log(playerToPUT, 'playerToPUT');

        const res = await fetch(`${this.api}/players/${player.name}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(playerToPUT)
        });

        if (res.ok)
            console.log(`Player score increased by ${scoreToAdd}`);

    }

    public getApp(): express.Application {
        return this.app;
    }
}