import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Logger } from "../Utility/Logger.js";

let client = null;
let otherAgent = {
    id: "",
    intention: {
        type: "",
        position: {x: -1, y: -1}
    }
};

function handleMessage(id, name, msg, reply) {
    if (msg.type === "handshake") {
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received handshake from ${name}`);
        otherAgent.id = id;
        client.say(otherAgent.id, {
            type: "ack",
            senderId: client.id,
            content: "Received your ID"
        });
    }

    if (msg.type === "ack") {
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received ack message from ${name}`);
        otherAgent.id = msg.senderId;
    }

    if (msg.type === "intention") {
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received intention from ${name}`);
        otherAgent.intention = msg.content;
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

/**
 * Function to send an intention to another agent
 * @param {String} t the type of intention (e.g. "pickup", "deliver")
 * @param {Object} pos the target position of the intention
 */
async function sendIntention(t, pos) {
    await client.say(otherAgent.id, {
        type: "intention",
        content: {
            type: t,
            position: pos
        }
    });
}

export {
    initCommunication,
    otherAgent,
    sendIntention,
};