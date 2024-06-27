import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

export class Communication {
    otherAgent = { id: null };
    constructor(deliverooClient) {
        this.client = deliverooClient;
        this.contactOtherAgent();
    }

    async contactOtherAgent() {
        // send a message until the other agent responds
        if (this.otherAgent.id == null) {
            setInterval(async () => {
                await this.client.shout("Hello, are you there?");
            }, 1000);
        } else {
            clearInterval();
        }
    }

    async sendMessage(message) {
        await this.client.say(otherAgent.id, message);
    }
}