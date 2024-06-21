
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
        if(!this.plan){
            //it can be uncreachable due to 2 reasons: 1. the parcelsis unreachable 2. the parcels is blocked by an agent
            //in either case ignor it, if it is blocked by an agent, the agent will probably try to take it
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO,`Blacklist the parcel: Can't reach the target ${parcelTile} from ${believes.me.x},${believes.me.y}`); 
            
            //add the parcel the black list
            let index = believes.parcels.findIndex(obj => obj.id === this.intention.target.id);
            believes.blackList.parcels.push(this.intention.target.id);//permanently ignore this parcel, since it is unreachables
            believes.parcels.splice(index, 1);//remove the parcels from the list


            //debugging purpose log
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, "Parcels"+JSON.stringify(believes.parcels));
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, "Black list parcels"+JSON.stringify(believes.blackList.parcels));
            console.groupEnd()

            this.stop = true;
            return;
        }
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