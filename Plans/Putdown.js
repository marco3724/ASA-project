import { Plan } from "./Plan.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { mapConstant, believes } from "../Believes.js";
import { Logger } from "../Utility/Logger.js";


export class Putdown extends Plan{
    constructor(intention) {
        super()
        this.intention = intention;
    }

    async generatePlan() {

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
        console.groupCollapsed("Generating plan");
        super.plan = await onlineSolver(Plan.domain, problem);
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Plan generated: ${super.plan}`);
    }
    // async execute(){
    //     await Plan.pddlExecutor.exec(this.plan);
    // }
}