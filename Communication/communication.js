import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Logger } from "../Utility/Logger.js";

let client = null;
let otherAgent = {
    id: "",
};

function handleMessage(id, name, msg, reply) {
    if (msg.type === "handshake") {
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received handshake from ${name}`);
        otherAgent.id = id;
        client.say(otherAgent.id, {
            type: "handshake",
            content: "Received your ID"
        });
    }

}

function initCommunication(deliverooClient) {
    client = deliverooClient;
    client.onMsg(handleMessage);

    // send a broadcast message until the other agent responds
    let intervalId = setInterval(async () => {
        if (otherAgent.id === "") {
            await client.shout({
                type: "handshake",
                content: "Hello Baozi"
            });
        } else {
            clearInterval(intervalId);
        }
    }, 1000);
}

export {
    initCommunication
};