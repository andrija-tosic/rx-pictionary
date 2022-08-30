import { Message } from "../../shared/models/message";
import { Player } from "../../shared/models/player";

export function appendMessageToChat(message: Message) {
    const li = document.createElement('li');
    li.innerHTML = message.senderName + ": " + message.text;

    document.getElementById('message-list')!.appendChild(li);
}

const playersUl = document.getElementById('players')!;

export function renderPlayersList(players: Map<string, Player>) {
    playersUl.innerHTML = '';

    const sortedPlayers = Array.from(players.values())
        .sort((p1, p2) => p1.score - p2.score)
        .reverse();

    sortedPlayers.forEach(player => {
        players.set(player.id, { id: player.id, name: player.name, score: player.score });

        const li = document.createElement('li');
        li.innerHTML = `${player.name} (${player.score} points)`;
        playersUl.appendChild(li);

    });
}
