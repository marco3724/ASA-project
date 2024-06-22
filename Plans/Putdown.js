import { Plan } from "./Plan.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { mapConstant, believes, hyperParams, launchConfig} from "../Believes.js";
import { Logger } from "../Utility/Logger.js";
import { removeArbitraryStringPatterns } from "../Utility/utility.js";
import * as astar from "../Utility/astar.js";

export class Putdown extends Plan{
    constructor(intention) {
        super()
        this.intention = intention;
    }

    async generatePlan(obstacle) {

        let deliveryTile = `t_${this.intention.target.x}_${this.intention.target.y}`;

        let mapTiles =mapConstant.pddlTiles
        let mapNeighbors = mapConstant.pddlNeighbors
        let deliveryPoints = `(delivery ${deliveryTile})` //to make sure it deliver to the right point
        let current_graph = mapConstant.graph;

        if(obstacle){//obstacle is formed like this: "t_1_1"
            mapTiles = removeArbitraryStringPatterns(mapConstant.pddlTiles,obstacle)
            mapNeighbors = removeArbitraryStringPatterns(mapConstant.pddlNeighbors,obstacle)
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, JSON.stringify(mapTiles));
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, JSON.stringify(mapNeighbors));

            // update the graph
            let mapWithObstacle = mapConstant.map;
            let obstacleCoordinates = obstacle.split("_");
            // Set to 0 the tile where the obstacle is
            mapWithObstacle[parseInt(obstacleCoordinates[1])][parseInt(obstacleCoordinates[2])] = 0;
            current_graph = new astar.Graph(mapWithObstacle);
        }
        

        let pddlProblem = new PddlProblem(
            'putdown',
            mapConstant.pddlMapObjects + 'parcel1 ' + 'agent1',
            mapTiles +
            mapNeighbors +
            deliveryPoints +
            `(at agent1 t_${believes.me.x}_${believes.me.y}) ` +
            `(agent agent1) ` +
            `(me agent1) ` +
            `(carrying agent1 parcel1) ` +
            `(parcel parcel1) `,
            `and (at agent1 ${deliveryTile}) (not (carrying agent1 parcel1))`
        );

        let problem = pddlProblem.toPddlString();
        //Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, "Problem: "+problem);
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
                    // In this case step.x and step.y differ from the second argument of args of the onlineSolver
                    // In the future, maybe this would become step.x -1 and step.y -1 to represent the current position of the agent before the move, to match the onlineSolver
                    args = ["AGENT1", `T_${step.x}_${step.y}`, `T_${generated_plan[index].x}_${generated_plan[index].y}`];
                    
                    this.plan.push({
                        "parallel": false,
                        "action": action,
                        "args": args
                    });
                });
                action = "PUT-DOWN";
                args = ["AGENT1", `PARCEL1`, `T_${this.intention.target.x}_${this.intention.target.y}`];
                this.plan.push({
                    "parallel": false,
                    "action": action,
                    "args": args
                });
            }
        } else {
            this.plan = await onlineSolver(Plan.domain, problem);
        }
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Plan generated: ${JSON.stringify(this.plan)}`);

        if (!this.plan) {

            //it can't be uncreachable due to 2 reasons: 1. the delivery point is unreachable 2. the delivery point is blocked by an obstacle (agent that may be blocked by us, or it is stuck internally)
            let message =obstacle ? `OBSTACLE: Impossible reaching the target ${deliveryTile} from ${believes.me.x},${believes.me.y} because of the obstacle ${obstacle}` : `NO PATH: Impossible reaching the target ${deliveryTile} from ${believes.me.x},${believes.me.y}`;
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO,message);
            
            //add the delivery point to the black list
            let index = believes.deliveryPoints.findIndex(obj => obj.x === this.intention.target.x && obj.y === this.intention.target.y);
            believes.blackList.deliveryPoints.push(believes.deliveryPoints[index]);//temporary ignore this delivery point, since it is unreachables
            believes.deliveryPoints.splice(index, 1);//remove the delivery point from the list

            //if the delivery point is unreachable due to an obstacle, the obstacle may be removed, so we can retry
            //if the unreachability is not due an obastacle it mean that we can never reach that delivery point, keep that delivery point in the black list
            if(obstacle){
                setTimeout(() => {
                    let index = believes.blackList.deliveryPoints.findIndex(obj => obj.x === this.intention.target.x && obj.y === this.intention.target.y);
                    believes.deliveryPoints.push(believes.blackList.deliveryPoints[index]);//add the delivery point back to the list
                    believes.blackList.deliveryPoints.splice(index, 1);//remove the delivery point from the blacklist
                    Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Delivery tile ${deliveryTile} removed from the blacklist`+JSON.stringify(believes.deliveryPoints));
                }, hyperParams.blacklist_timeout);
            }

            //debugging purpose log
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, "Delivery points"+JSON.stringify(believes.deliveryPoints));
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, "Black list delivery points"+JSON.stringify(believes.blackList.deliveryPoints));
            console.groupEnd()

            this.stop = true;
            return;
        }
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Plan generated: ${JSON.stringify(this.plan)}`);
    }
    // async execute(){
    //     await Plan.pddlExecutor.exec(this.plan);
    // }
}