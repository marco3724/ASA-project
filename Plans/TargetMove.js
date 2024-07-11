import {believes,mapConstant,client, launchConfig} from "../Believes.js"
import {onlineSolver, PddlProblem} from "@unitn-asa/pddl-client";
import {Plan} from "./Plan.js"
import { Logger } from "../Utility/Logger.js";
import {removeArbitraryStringPatterns} from "../Utility/utility.js";
import * as astar from "../Utility/astar.js"
export class TargetMove extends Plan{
    constructor(intention,notifyToAwake,belongsToCoordination){
        super(notifyToAwake,belongsToCoordination)
        this.intention = intention
        this.planType = "targetMove";
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
        let current_graph = mapConstant.graph;
        
        //for replanning
        if(obstacle){
            mapTiles = removeArbitraryStringPatterns(mapConstant.pddlTiles,obstacle)
            mapNeighbors = removeArbitraryStringPatterns(mapConstant.pddlNeighbors,obstacle)
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, JSON.stringify(mapTiles));
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, JSON.stringify(mapNeighbors));

            // update the graph
            if(launchConfig.offLineSolver){
            let mapWithObstacle = mapConstant.map;
            let obstacleCoordinates = obstacle.split("_");
            mapWithObstacle[parseInt(obstacleCoordinates[1])][parseInt(obstacleCoordinates[2])] = 0;
            current_graph = new astar.Graph(mapWithObstacle);
        }
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
        if (launchConfig.offLineSolver) {
            await this.offlineSolver(current_graph,intention.target)
        } else {
            this.plan = await onlineSolver(domain, problem);
        }
        //             for (let i =0;i < result.length;i++){
        //                 const direction = result[i].movement
        //                 status = await client.move(direction)
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, `Plan generated: ${JSON.stringify(this.plan)}`);

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

    get target() {
        return this.intention.target
    }
}