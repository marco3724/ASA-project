
import { Plan } from "./Plan.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { mapConstant, believes } from "../Believes.js";  
import { Logger } from "../Utility/Logger.js";
import { removeArbitraryStringPatterns } from "../Utility/utility.js";
export class Pickup extends Plan{
    constructor(intention) {
        super()
        this.intention = intention;
    }

    async generatePlan(obstacle) {
        let parcelTile = `t_${this.intention.target.x}_${this.intention.target.y}`;
        let mapTiles =mapConstant.pddlTiles
        let mapNeighbors = mapConstant.pddlNeighbors
        //for replanning
        if(obstacle){
            mapTiles = removeArbitraryStringPatterns(mapConstant.pddlTiles,obstacle)
            mapNeighbors = removeArbitraryStringPatterns(mapConstant.pddlNeighbors,obstacle)
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, JSON.stringify(mapTiles));
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, JSON.stringify(mapNeighbors));
        }


        let pddlProblem = new PddlProblem(
            'pickup',
            mapConstant.pddlMapObjects + 'parcel1 ' + 'agent1',
            mapTiles +  
            mapNeighbors + 
            mapConstant.pddlDeliveryPoints + 
            `(at parcel1 ${parcelTile}) ` + 
            `(at agent1 t_${believes.me.x}_${believes.me.y}) ` +
            `(agent agent1) ` +
            `(me agent1) ` + 
            `(parcel parcel1) `,
            `and (at agent1 ${parcelTile}) (carrying agent1 parcel1)`
        );

        let problem = pddlProblem.toPddlString();

        console.groupCollapsed("Generating plan");
        this.plan = await onlineSolver(Plan.domain, problem);
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Plan generated: ${JSON.stringify(this.plan)}`);
    }

    // async execute(){
    //     await Plan.exec(this.plan);
    // }
    
    // async replan() {
    // //     let action = new TargetMove(this.intention);
    // //    return 
    // }
}