import { Plan } from "./Plan.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { mapConstant, believes, hyperParams, launchConfig} from "../Believes.js";
import { Logger } from "../Utility/Logger.js";
import { removeArbitraryStringPatterns } from "../Utility/utility.js";
import * as astar from "../Utility/astar.js";
import { otherAgent } from "../Communication/communication.js";
export class Putdown extends Plan{
    constructor(intention,notifyToAwake,belongsToCoordination) {
        super(notifyToAwake,belongsToCoordination)
        this.intention = intention;
        this.planType = "putdown";
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
            if(launchConfig.offLineSolver){
                let mapWithObstacle = mapConstant.map;
                let obstacleCoordinates = obstacle.split("_");
                // Set to 0 the tile where the obstacle is
                mapWithObstacle[parseInt(obstacleCoordinates[1])][parseInt(obstacleCoordinates[2])] = 0;
                current_graph = new astar.Graph(mapWithObstacle);
            }
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
            let action = "PUT-DOWN";
            let args = ["AGENT1", `PARCEL1`, `T_${this.intention.target.x}_${this.intention.target.y}`];
            await this.offlineSolver(current_graph, this.intention.target,action,args);
        } else {
            this.plan = await onlineSolver(Plan.domain, problem);
        }
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, `Plan generated: ${JSON.stringify(this.plan)}`);

        if (!this.plan) {
            //it can't be uncreachable due to 2 reasons: 1. the delivery point is unreachable 2. the delivery point is blocked by an obstacle (agent that may be blocked by us, or it is stuck internally)
            let message =obstacle ? `OBSTACLE: Impossible reaching the target ${deliveryTile} from ${believes.me.x},${believes.me.y} because of the obstacle ${obstacle}` : `NO PATH: Impossible reaching the target ${deliveryTile} from ${believes.me.x},${believes.me.y}`;
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO,message);

            //impossible to reach the target, i want to check if it is my friend that is blocking me, 
            //a put down cal be deliver into an uncreachble point which has not obstacle (but is due to the map), so we need to check if there is an obstacle amd if that obracle is our friend
            //if dont check an obstacle every time it is impossible we are assuming is our friend or due to an obstacle when it is not
            //i want to coordinates only if there is only one delivery point left, otherwise i want to try other delivery points
            if(believes.deliveryPoints.length == 1 && otherAgent.id!="" && believes.agentsPosition.has(otherAgent.id) && obstacle){
                let agent = believes.agentsPosition.get(otherAgent.id);
                let [_,x,y] = obstacle.split("_");
                if(agent.x ==x && agent.y == y){//the agent blocking him is his friend
                    Logger.logEvent(Logger.logType.COORDINATION, Logger.logLevels.INFO,`NEED COORDINATION: The target is blocked by my friend ${otherAgent.id}`);
                    this.needCoordination = true;
                    this.coordinationInformation = {
                        obstacle: obstacle,
                    }
                }
            }

            // if(otherAgent.id!="" && believes.agentsPosition.has(otherAgent.id)){
            //     let agent = believes.agentsPosition.get(otherAgent.id);
            //     let [_,x,y] = obstacle.split("_");
            //     if(agent.x ==x && agent.y == y){
            //         Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO,`The target is blocked by my friend ${otherAgent.id}`);
            //         //send a message to the other agent to coordinate
            //         let availableDirections = [[0,-1],[0,1],[1,0],[-1,0]];
            //         for (let i = 0; i < availableDirections.length; i++) {  
            //             let new_x = parseInt(agent.x) + availableDirections[i][0];
            //             let new_y = parseInt(agent.y) + availableDirections[i][1];
            //             if(mapConstant.map[x][y] != 0){
                            
            //                 let reply = await client.ask(otherAgent.id, {
            //                     type: "coordination",
            //                     senderId: client.id,
            //                     content: [
            //                         new TargetMove({target: { x: new_x, y: new_y }}),

            //                     ]
            //                 });

            //                 break;
            //             }
            //         }
            //         mapConstant.map[agent.x][parseInt(y)] = 0;//remove the obstacle
            //         client.say(otherAgent.id, {
            //             type: "coordination",
            //             senderId: client.id,
            //             content: [

            //             ]
            //         });
            //     }   
            // }



            //add the delivery point to the black list
            let index = believes.deliveryPoints.findIndex(obj => obj.x === this.intention.target.x && obj.y === this.intention.target.y);
            believes.blackList.deliveryPoints.push(believes.deliveryPoints[index]);//temporary ignore this delivery point, since it is unreachables
            believes.deliveryPoints.splice(index, 1);//remove the delivery point from the list

            //if the delivery point is unreachable due to an obstacle, the obstacle may be removed, so we can retry
            //if the unreachability is not due an obastacle it mean that we can never reach that delivery point, keep that delivery point in the black list
            let timeout = Math.floor(Math.random() * (hyperParams.blackList.max_timeout - hyperParams.blackList.min_timeout + 1) + hyperParams.blackList.min_timeout);
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.INFO, `Delivery tile ${deliveryTile} added to the blacklist for ${timeout}ms`);
            if(obstacle){
                setTimeout(() => {
                    let index = believes.blackList.deliveryPoints.findIndex(obj => obj.x === this.intention.target.x && obj.y === this.intention.target.y);
                    believes.deliveryPoints.push(believes.blackList.deliveryPoints[index]);//add the delivery point back to the list
                    believes.blackList.deliveryPoints.splice(index, 1);//remove the delivery point from the blacklist
                    Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.INFO, `Delivery tile ${deliveryTile} removed from the blacklist`+JSON.stringify(believes.deliveryPoints));
                }, timeout);
            }

            //debugging purpose log
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, "Delivery points"+JSON.stringify(believes.deliveryPoints));
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, "Black list delivery points"+JSON.stringify(believes.blackList.deliveryPoints));
            console.groupEnd()

            this.stop = true;
            return;
        }
        console.groupEnd()
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, `Plan generated: ${JSON.stringify(this.plan)}`);
    }

    get target() {
        return this.intention.target;
    }

}