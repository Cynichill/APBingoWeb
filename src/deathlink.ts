import type { Client } from "archipelago.js";

let enabled = false;
let client: Client | null = null;

let receivingDeath = false;
let listening = false;

let onDeathReceived: () => void = () => {};
export function setDeathReceivedHandler(fn: () => void): void {
    onDeathReceived = fn;
}

export function setDeathLinkEnabled(cl: Client, mini: boolean | null | undefined, value: boolean | null | undefined): void {
    client = cl;
    enabled = ((value ?? false) && (mini ?? false));
    if (enabled){
        cl.deathLink.enableDeathLink();
            if (!listening) {
                listening = true;
                cl.deathLink.on("deathReceived", (source, _time, cause) => {
                if (source === cl.players.self.name) return;

                receivingDeath = true;
                try {

                    console.log("deathReceived from", source);
                    onDeathReceived();
                } finally {
                receivingDeath = false;
            }
        });
    }
    }

}
export function sendDeathLinks(cause?: string): void {
    if (!enabled || !client || receivingDeath) return;
    client.deathLink.sendDeathLink(client.players.self.name, client.players.self.name + " " + cause);
}