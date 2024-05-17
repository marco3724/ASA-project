import { TargetMove } from "./TargetMove.js";
import { believes, client } from "../Believes.js";

export class Pickup {
    constructor(intention) {
        this.intention = intention;
    }

    async execute() {
        let action = new TargetMove(this.intention);
        console.log('Pickup');
        await action.execute();
        await client.pickup();
    }
    replan() {
    //     let action = new TargetMove(this.intention);
    //    return 
    }
}