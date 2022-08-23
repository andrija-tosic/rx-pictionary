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
    players.forEach(player => {
        players.set(player.id, { id: player.id, name: player.name, score: 0 });


        const li = document.createElement('li');
        li.innerHTML = `${player.name} (${player.score} points)`;
        playersUl.appendChild(li);

    });

}