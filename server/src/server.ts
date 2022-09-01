import {
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData,
    SocketParameterType,
    EVENTS
} from '@rx-pictionary/lib/socket';
import express from "express";
import cors from "cors";
import * as http from "http";
import { Message, Player } from '@rx-pictionary/lib/models';
import { Server, Socket } from "socket.io"
import { Game } from "./game";
import HttpStatus from '../constants/http-status-code';
import { API } from './api'

export class AppServer {
    private app: express.Application;
    private server: http.Server;
    private io: Server<ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData<SocketParameterType>
    >;
    private socket: Socket<ClientToServerEvents, ServerToClientEvents>;
    private serverPort: string | number;

    private drawingPlayerSocket: Socket<ClientToServerEvents, ServerToClientEvents>;

    private game: Game = new Game(this);

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

        this.serverPort = process.env.SERVER_PORT!;
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
        this.drawingPlayerSocket.broadcast.emit(EVENTS.FROM_SERVER.WORD_REVEAL, word);
    }

    public emitTime(seconds: number): void {
        this.io.sockets.emit(EVENTS.FROM_SERVER.TIME, seconds);
        if (seconds === 0) {
            this.io.sockets.emit(EVENTS.FROM_SERVER.STOP);
        }
    }

    private events(): void {
        this.io.on(EVENTS.FROM_SERVER.CONNECT, (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
            this.socket = socket;

            this.io.sockets.emit(EVENTS.FROM_SERVER.ALL_PLAYERS, Array.from(this.game.players.values()))

            socket.on(EVENTS.FROM_CLIENT.NEW_PLAYER, async (name) => {
                console.log(`Player ${socket.id}: ${name} connected`);

                const res = await API.fetchAPI(`players/${name}`, 'GET');

                const fetchedPlayer = await res.json() as Player;

                const playerToEmit: Player = {
                    id: socket.id,
                    name: name,
                    score: res.ok ? fetchedPlayer.score : 0
                }

                console.log('fetched player:', fetchedPlayer);

                if (res.status === HttpStatus.NOT_FOUND) {
                    await API.fetchAPI(`players`, 'POST', { name: name, score: 0 });
                }

                this.game.players.set(socket.id, playerToEmit);
                this.io.sockets.emit(EVENTS.FROM_CLIENT.NEW_PLAYER, playerToEmit);

                socket.emit(EVENTS.FROM_SERVER.GAME_STATE, {
                    running: this.game.running,
                    drawingPlayerId: this.game.drawingPlayerId,
                    revealedWord: this.game.revealedWord,
                    timePassed: this.game.timePassed
                });
            });

            socket.on(EVENTS.FROM_CLIENT.START, async () => {
                this.game.correctGuesses.clear();

                const res = await API.fetchAPI('words', 'GET');

                if (!res.ok) {
                    console.log(res.text);
                    return;
                }

                this.drawingPlayerSocket = socket;

                const words: string[] = await res.json();
                const word = words[Math.floor(Math.random() * words.length)];

                this.game.start(word, socket.id);

                socket.broadcast.emit(EVENTS.FROM_CLIENT.START, '_'.repeat(word.length));

                socket.emit(EVENTS.FROM_SERVER.WORD_REVEAL, word); // emitted only to player who's drawing

                console.log(`Game started with word: ${word}`);
            });

            socket.on(EVENTS.FROM_CLIENT.MESSAGE, async (message: Message) => {
                console.log("[server](message): %s", JSON.stringify(message));

                if (this.game.running
                    && socket.id !== this.drawingPlayerSocket.id
                    && message.text.trim().toLowerCase() === this.game.word
                ) {
                    if (!this.game.correctGuesses.has(socket.id)) {

                        this.game.correctGuesses.add(socket.id);

                        const scoreAdded = await this.increasePlayerScore(socket);

                        socket.emit(EVENTS.FROM_SERVER.CORRECT_WORD, this.game.word);

                        socket.broadcast.emit(EVENTS.FROM_CLIENT.MESSAGE, {
                            senderId: message.senderId,
                            senderName: message.senderName,
                            text: `has guessed the word! +${scoreAdded} points ✅`
                        });

                        console.log(`${message.senderName} has guessed the word! +${scoreAdded} points ✅`);

                        setTimeout(() => {
                            if (this.game.correctGuesses.size === this.game.players.size - 1) {
                                this.game.stop();
                                this.io.sockets.emit(EVENTS.FROM_SERVER.STOP);
                            }
                        }, 3000);
                    }
                }
                else {
                    socket.broadcast.emit(EVENTS.FROM_CLIENT.MESSAGE, message);
                }
            }
            );

            socket.on(EVENTS.FROM_CLIENT.IMAGE, (imgBase64: string) => {
                socket.broadcast.emit(EVENTS.FROM_SERVER.IMAGE, imgBase64);
            });

            socket.on(EVENTS.FROM_CLIENT.CLEAR_CANVAS, () => {
                socket.broadcast.emit(EVENTS.FROM_CLIENT.CLEAR_CANVAS);
            });

            socket.on(EVENTS.FROM_SERVER.DISCONNECT, () => {
                console.log(`Player ${socket.id}: ${this.game.players.get(socket.id)?.name} disconnected`);
                this.game.players.delete(socket.id);
                if (this.game.running && socket.id === this.game.drawingPlayerId) {
                    this.game.stop();
                    this.io.sockets.emit(EVENTS.FROM_SERVER.STOP);
                }
                socket.broadcast.emit(EVENTS.FROM_SERVER.PLAYER_LEFT, socket.id);
            });
        });
    }

    private async increasePlayerScore(socket: Socket<ClientToServerEvents, ServerToClientEvents>): Promise<number> {

        const { correctPlayer, drawingPlayer, scoreAdded } = this.game.increasePlayerScore(socket.id);

        const correctGuessPlayerToPUT: Omit<Player, 'id' | 'name'> = { score: correctPlayer.score };
        const drawingPlayerToPUT: Omit<Player, 'id' | 'name'> = { score: drawingPlayer.score };

        await Promise.all([
            API.fetchAPI(`players/${correctPlayer.name}`, 'PUT', correctGuessPlayerToPUT),
            API.fetchAPI(`players/${drawingPlayer.name}`, 'PUT', drawingPlayerToPUT)
        ]);

        this.io.sockets.emit(EVENTS.FROM_SERVER.CORRECT_GUESS, { correctPlayer, drawingPlayer });

        return scoreAdded;
    }

    public getApp(): express.Application {
        return this.app;
    }
}
