import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Logger } from "../Utility/Logger.js";

export class Communication {
    otherAgent = { id: null };
    constructor(deliverooClient) {
        this.client = deliverooClient;
        this.contactOtherAgent();
        this.client.onMsg(this.handleMessage);
    }

    async contactOtherAgent() {
        // send a message until the other agent responds
        if (this.otherAgent.id == null) {
            setInterval(async () => {
                await this.client.shout({
                    type: "handshake",
                    content: "Hello, are you there?"
                });
            }, 1000);
        } else {
            clearInterval();
        }
    }

    async handleMessage(id, name, msg, reply) {
        if (msg.type == "handshake") {
            this.otherAgent.id = id;
            await this.client.say(this.otherAgent.id, "Hello, I'm here!");
        }
        
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received message from ${name} (${id}): ${msg}`);
    }

    async sendMessage(message) {
        await this.client.say(otherAgent.id, message);
    }
}