import { Message, Player } from '@rx-pictionary/lib/models';

export const timeSpan = document.getElementById('time')!;
export const currentWordHeader = document.getElementById('current-word-header')!;
export const messageInputDiv = document.getElementById('message-input-div')!;
export const messageInput = document.getElementById('message-input')! as HTMLInputElement;
export const timeHeader = document.getElementById('time-header')!;

export namespace UI {
    const messageList = document.getElementById('message-list')!;
    const playersUl = document.getElementById('players')!;


    export function appendMessageToChat(message: Message) {
        const li = document.createElement('li');
        li.innerHTML = message.senderName + ": " + message.text;

        messageList.appendChild(li);
    }

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

    export function show(el: HTMLElement) {
        el.style.display = 'block';
    }

    export function hide(el: HTMLElement) {
        el.style.display = 'none';
    }
}