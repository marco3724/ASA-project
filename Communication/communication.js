import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import { Logger } from "../Utility/Logger.js";
import { believes ,communication} from "../Believes.js";
import { convertToPlanType } from "../Utility/utility.js";

let client = null;
let agentType = {
    LEADING: 0,
    COMPLIANT:  1
}
believes.agentRole = agentType.LEADING;

let otherAgent = {
    id: "",
    intention: {
        type: "",
        target: {}
    }
};

function handleMessage(id, name, msg, reply) {
    if (msg.type === "handshake" && msg.content === "Hello Baozi C") {
        otherAgent.id = id;
        believes.agentRole = agentType.COMPLIANT;
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received handshake from ${name} | setted role as ${believes.agentRole ? "COMPLIANT" : "LEADING"}`);
        client.say(otherAgent.id, {
            type: "ack",
            senderId: client.id,
            content: "Hello Baozi M"
        });
    }
    
    if (msg.type === "ack" && msg.content === "Hello Baozi M") {
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received ack message from ${name} | setted role as ${believes.agentRole ? "COMPLIANT" : "LEADING"}`);
        otherAgent.id = msg.senderId;
    }

    // Avoid messages from external agents
    if (id !== otherAgent.id) 
        return;
    if(msg.type === "coordination") {
        Logger.logEvent(Logger.logType.COORDINATION, Logger.logLevels.INFO, `Received coordination intentions from ${name}`);
        // if we receive a coordination message, we execute the actions
        JSON.parse(msg.content).forEach(intention => {
            communication.intentionQueue.push(convertToPlanType(intention) );
        });
        // console.log("COMMUNICATION INTENTION QUEUE");
        // console.log(communication.intentionQueue);

    }
    if(msg.type === "awake") {
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received awake message from ${name}`);
        // if we receive a coordination message, we execute the actions
        communication.shouldTheAgentAwake = true;
    }

    if (msg.type === "intention") {
        otherAgent.intention = msg.content;
        console.log("RICEVUTO INTENTION", msg);
        Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Received intention | ${name} wants to ${otherAgent.intention.type} at ${otherAgent.intention.target.x}, ${otherAgent.intention.target.y}`);
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

    if (believes.agentRole == agentType.LEADING) {
        // send a broadcast message until the other agent responds
        let intervalId = setInterval(async () => {
            if (otherAgent.id === "") {
                await client.shout({
                    type: "handshake",
                    content: "Hello Baozi C"
                });
            } else {
                clearInterval(intervalId);
            }
        }, 1000);
    }
}

/**
 * Function to send an intention to another agent
 * @param {String} t the type of intention (e.g. "pickup", "deliver")
 * @param {Object} tg the target of the intention
 */
async function sendIntention(t, tg) {
    Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Sending intention to ${otherAgent.id}`);
    if (client) {
        await client.say(otherAgent.id, {
            type: "intention",
            content: {
                type: t,
                target: tg
            }
        });
    }
    return;
}

async function notifyToAwake() {
    Logger.logEvent(Logger.logType.COMMUNICATION, Logger.logLevels.INFO, `Awaking the ${otherAgent.id}`);
    if (client) {
        await client.say(otherAgent.id, {
            type: "awake"
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
    notifyToAwake,
    agentType
};