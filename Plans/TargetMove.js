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
            let mapWithObstacle =  JSON.parse(JSON.stringify(mapConstant.map)) ;
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
        // if(!this.plan){ NO MORE NEEDED
        //     if(!obstacle){//if the plan is null and there is no obstacle, it means that the target is unreachable (and never will be)
        //         Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO,`Blacklist the spawn point: Can't reach the spawn point ${destinationTile} from ${believes.me.x},${believes.me.y}`);
        //         believes.blackList.spawnPoints.push(intention.target)
        //         believes.heatmap.delete(destinationTile)
        //         //normalize the weights
        //         let sum = 0;
        //         believes.heatmap.forEach((value, key) => {
        //             sum += value.prob;
        //         });
        //         // update each prob such that currprob = currprob/sum
        //         believes.heatmap.forEach((value, key) => {
        //             believes.heatmap.set(key, {...value, prob: value.prob / sum});
        //         });
        //     }
        //     this.stop = true;
        //     return;
        // }
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, `Plan generated: ${JSON.stringify(this.plan)}`);

 
    }

    // async execute(){
    //     await Plan.pddlExecutor.exec(this.plan);
    // }

    get target() {
        return this.intention.target
    }
}