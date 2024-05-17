import {believes,mapConstant,client} from "../Believes.js"
import * as astar from "../Utility/astar.js"
export class TargetMove{
    constructor(intention,intentionRevision){
        this.intention = intention
        this.intensionRevision =  intentionRevision
        this.replan = replan
    }
    async execute(){
        let {intention} = this
        console.log("Moving towards target",intention.target)
        let status,failed_movemets=0
        let {me} = believes
        let graph = mapConstant.graph

        let current_pos = graph.grid[Math.round(me.x)][Math.round(me.y)];
        let parcel_node = graph.grid[intention.target.x][intention.target.y];
        let result = astar.astar.search(graph, current_pos, parcel_node, {diagonal: false});

        for (let i =0;i < result.length;i++){
            const direction = result[i].movement
            status = await client.move(direction)
            if(status){
                console.log("Movement status:",status)
                believes.me.x = status.x
                believes.me.y = status.y
            }
            else{
                console.log("Failed movements") 
                i--
                failed_movemets++
            }

    }
}
}