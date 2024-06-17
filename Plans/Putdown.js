import { Plan } from "./Plan.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { mapConstant, believes } from "../Believes.js";



export class Putdown {
    constructor(intention) {
        this.intention = intention;
        this.plan = null;
    }

    async generatePlan() {
        console.log("putdown intention", this.intention);
        let deliveryTile = `t_${this.intention.target.x}_${this.intention.target.y}`;
        let pddlProblem = new PddlProblem(
            'putdown',
            mapConstant.pddlMapObjects + 'parcel1 ' + 'agent1',
            mapConstant.pddlTiles +
            mapConstant.pddlNeighbors +
            mapConstant.pddlDeliveryPoints +
            `(at agent1 t_${believes.me.x}_${believes.me.y}) ` +
            `(agent agent1) ` +
            `(me agent1) ` +
            `(carrying agent1 parcel1) ` +
            `(parcel parcel1) `,
            `and (at agent1 ${deliveryTile}) (not (carrying agent1 parcel1))`
        );

        let problem = pddlProblem.toPddlString();
        console.log(problem.split('goal')[1]);
        this.plan = await onlineSolver(Plan.domain, problem);
    }
    async execute(){
        await Plan.pddlExecutor.exec(this.plan);
    }
}