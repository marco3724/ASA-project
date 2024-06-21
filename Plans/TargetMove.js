import {believes,mapConstant,client} from "../Believes.js"
import {onlineSolver, PddlProblem} from "@unitn-asa/pddl-client";
import {Plan} from "./Plan.js"
import { Logger } from "../Utility/Logger.js";
import {removeArbitraryStringPatterns} from "../Utility/utility.js";
export class TargetMove extends Plan{
    constructor(intention,intentionRevision){
        super()
        this.intention = intention
        // this.obstacle = this.obstacle
        // this.intensionRevision =  intentionRevision
        // this.replan = replan
    }
    async generatePlan(obstacle){
        let {intention} = this // is this necessary?
        let domain = Plan.domain;
        let destinationTile = `t_${intention.target.x}_${intention.target.y}`
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
            'move',
            mapConstant.pddlMapObjects + 'agent1',
            mapTiles+  
            mapNeighbors + 
            mapConstant.pddlDeliveryPoints + 
            `(at agent1 t_${believes.me.x}_${believes.me.y}) ` +
            `(agent agent1) ` +
            `(me agent1) `,
            `at agent1 ${destinationTile}`
        );

        let problem = pddlProblem.toPddlString();
        console.groupCollapsed("Generating plan");
        this.plan = await onlineSolver(domain, problem);
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Plan generated: ${JSON.stringify(this.plan)}`);

    //     let status,failed_movements=0
    //     let {me} = believes
    //     let graph = mapConstant.graph

    //     let current_pos = graph.grid[Math.round(me.x)][Math.round(me.y)];
    //     let parcel_node = graph.grid[intention.target.x][intention.target.y];
    //     let result = astar.astar.search(graph, current_pos, parcel_node, {diagonal: false});

    //     for (let i =0;i < result.length;i++){
    //         const direction = result[i].movement

    //         status = await client.move(direction)
    //         if(status){
    //             console.log("Movement status:",status)
    //             believes.me.x = status.x
    //             believes.me.y = status.y
    //         }
    //         else{
    //             console.log("Failed movements") 
    //             i--
    //             failed_movements++
    //         }

    // }
    }

    // async execute(){
    //     await Plan.pddlExecutor.exec(this.plan);
    // }
}