import { Client } from "archipelago.js";
// Create a new instance of the Client class.
const client = new Client();
// Setup a listener for incoming chat messages and print them to the console.
client.messages.on("chat", (message, sender) => {
    console.log(`${sender.alias}: ${message}`);
});
const params = new URLSearchParams(window.location.search);
const url = params.get('hostname') ?? 'localhost';
const port = params.get('port') ?? '38281';
const hostport = params.get('hostport') ?? `${url}:${port}`;
const name = params.get('name') ?? 'Bingo';
const password = params.get('password') ?? '';
// Connect to the Archipelago server (replace url, slot name, and game as appropriate for your scenario).
const slotdata = await client.login(hostport, name, "APBingo", { password: password });
const root = document.querySelector(":root");
root.style.setProperty("--tilesize", `${100 / slotdata.boardSize}%`);
root.style.setProperty("--textColor", slotdata.customText);
root.style.setProperty("--hightlightColor", slotdata.customHLSquare);
root.style.setProperty("--squareColor", slotdata.customSquare);
root.style.setProperty("--boardColor", slotdata.customBoard);
function setReceived(item) {
    console.log(item);
}
client.items.received.forEach(item => setReceived(item.name));
client.items.on("itemsReceived", items => items.forEach(item => setReceived(item.name)));
window.gameclient = client;
//# sourceMappingURL=ap.js.map