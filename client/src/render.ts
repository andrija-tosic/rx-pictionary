import { Message } from "../../shared/models/message";
import { players } from "./index";

export function appendMessageToList(message: Message) {
    const li = document.createElement('li');
    li.innerHTML = message.senderName + ": " + message.text;

    document.getElementById('message-list')!.appendChild(li);
    // console.log('appending to ul')

}

const playersUl = document.getElementById('players')!;

export function renderPlayersList() {
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
