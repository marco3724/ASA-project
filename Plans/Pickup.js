import { Plan } from "./Plan.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { mapConstant, believes, launchConfig } from "../Believes.js";  
import { Logger } from "../Utility/Logger.js";
import { removeArbitraryStringPatterns } from "../Utility/utility.js";
import * as astar from "../Utility/astar.js";
export class Pickup extends Plan{
    constructor(intention) {
        super()
        this.intention = intention;
    }

    async generatePlan(obstacle) {
        let parcelTile = `t_${this.intention.target.x}_${this.intention.target.y}`;
        let mapTiles =mapConstant.pddlTiles
        let mapNeighbors = mapConstant.pddlNeighbors
        let current_graph = mapConstant.graph;
        //for replanning
        if(obstacle){
            mapTiles = removeArbitraryStringPatterns(mapConstant.pddlTiles,obstacle)
            mapNeighbors = removeArbitraryStringPatterns(mapConstant.pddlNeighbors,obstacle)
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, JSON.stringify(mapTiles));
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, JSON.stringify(mapNeighbors));

            // update the graph
            let mapWithObstacle = mapConstant.map;
            let obstacleCoordinates = obstacle.split("_");
            // Set to 0 the tile where the obstacle is
            mapWithObstacle[parseInt(obstacleCoordinates[1])][parseInt(obstacleCoordinates[2])] = 0;
            current_graph = new astar.Graph(mapWithObstacle);
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
        if (launchConfig.offLineSolver) {
            let current_pos = current_graph.grid[Math.round(believes.me.x)][Math.round(believes.me.y)];
            let target = current_graph.grid[this.intention.target.x][this.intention.target.y];
            let generated_plan = astar.astar.search(current_graph, current_pos, target, {diagonal: false});
            this.plan = [];
            let action;
            let args;
            if (generated_plan.length == 0) {
                this.plan = null;
            } else {
                generated_plan.forEach((step, index) => {
                    // log the step coordinates
                    Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Step ${index}: ${step.x}, ${step.y}`);
                    
                    action = `MOVE-${step.movement.toUpperCase()}`;
                    args = ["AGENT1", `T_${step.x}_${step.y}`, `T_${generated_plan[index].x}_${generated_plan[index].y}`];
                    
                    this.plan.push({
                        "parallel": false,
                        "action": action,
                        "args": args
                    });
                });
                action = "PICK-UP";
                args = ["AGENT1", `PARCEL1`, `T_${this.intention.target.x}_${this.intention.target.y}`];
                this.plan.push({
                    "parallel": false,
                    "action": action,
                    "args": args
                });
            }
        } else {
            this.plan = await onlineSolver(domain, problem);
        }
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Plan generated: ${JSON.stringify(this.plan)}`);
        
        // if the plan is empty, it means that the astar algorithm has not found a path to the target
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
    }

    // async execute(){
    //     await Plan.exec(this.plan);
    // }
    
    // async replan() {
    // //     let action = new TargetMove(this.intention);
    // //    return 
    // }
}