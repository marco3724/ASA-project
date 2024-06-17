import {believes,mapConstant,client} from "../Believes.js"
import {onlineSolver, PddlProblem} from "@unitn-asa/pddl-client";
import {Plan} from "./Plan.js"

export class TargetMove{
    constructor(intention,intentionRevision){
        this.intention = intention
        this.plan = null
        // this.obstacle = this.obstacle
        // this.intensionRevision =  intentionRevision
        // this.replan = replan
    }
    async generatePlan(){
        let {intention} = this // is this necessary?
        console.log("Moving towards target",intention.target)
        let domain = Plan.domain;
        let destinationTile = `t_${intention.target.x}_${intention.target.y}`
        let pddlProblem = new PddlProblem(
            'move',
            mapConstant.pddlMapObjects + 'agent1',
            mapConstant.pddlTiles +  
            mapConstant.pddlNeighbors + 
            mapConstant.pddlDeliveryPoints + 
            `(at agent1 t_${believes.me.x}_${believes.me.y}) ` +
            `(agent agent1) ` +
            `(me agent1) `,
            `at agent1 ${destinationTile}`
        );

        let problem = pddlProblem.toPddlString();
        this.plan = await onlineSolver(domain, problem);

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

    async execute(){
        await Plan.pddlExecutor.exec(this.plan);
    }
}