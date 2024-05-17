import { TargetMove } from "./TargetMove.js";
import { client } from "../Believes.js";

export class Putdown {
    constructor(intention) {
        this.intention = intention;
    }

    async execute() {
        let action = new TargetMove(this.intention);
        console.log('Putdown');
        await action.execute();
        await client.putdown();
    }
}