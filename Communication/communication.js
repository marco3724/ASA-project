import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Logger } from "../Utility/Logger.js";
import { believes } from "../Believes.js";

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

    if (msg.type === "belief") {
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received belief from ${name}`);
        // if we receive a belief about parcels, we update our believes
        if (msg.content.type === "parcels") {
            // for each incoming parcel, we check if it is already in our believes
            msg.content.parcels.forEach(p => {
                let found = false;
                believes.parcels.forEach(bp => {
                    if (bp.id === p.id) {
                        found = true;
                    }
                });
                // if not, we add it
                if (!found) {
                    believes.parcels.push(p);
                }
            });
        }
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
    // console.log(client);
    if (client) {
        await client.say(otherAgent.id, {
            type: "intention",
            content: {
                type: t,
                position: pos
            }
        });
    }
    return;
}

/**
 * Function to send a belief to another agent
 * @param {String} t the type of belief (e.g. "parcels", other)
 * @param {Array} p the parcels to be shared
 */
async function sendBelief(t, p) {
    Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Sending belief to ${otherAgent.id}`);
    await client.say(otherAgent.id, {
        type: "belief",
        content: {
            type: t,
            parcels: p
        }
    });
}

export {
    initCommunication,
    otherAgent,
    sendIntention,
    sendBelief,
};