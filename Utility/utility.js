import fs from 'fs';
import * as astar from "./astar.js";
import { Pickup } from '../Plans/Pickup.js';
import { Putdown } from '../Plans/Putdown.js';
import { TargetMove } from '../Plans/TargetMove.js';
import { StandStill } from '../Plans/StandStill.js';
export function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}
export function readFile ( path ) {
    
    return new Promise( (res, rej) => {

        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })

    })

}
export function removeArbitraryStringPatterns(text, arbitraryString) {
    const regex = new RegExp(`\\([^()]*${arbitraryString}[^()]*\\)`, 'g');//match the pattern (.....arbitrarystring....)
    return text.replace(regex, '');//remove
}
export function astarDistance(start, end, graph){
    let startNode = graph.grid[start.x][start.y]
    let endNode = graph.grid[end.x][end.y]
    let result = astar.astar.search(graph, startNode, endNode)
    return result.length
}
export function convertToPlanType(intention){
    switch(intention.type){
        case "pickup":
            return new Pickup(intention,intention.notifyToAwake ,intention.belongsToCoordination)
        case "putdown":
            return new Putdown(intention,intention.notifyToAwake,intention.belongsToCoordination)
        case "targetMove":
            return new TargetMove(intention,intention.notifyToAwake,intention.belongsToCoordination)
        case "standStill":
            return new StandStill(intention,intention.notifyToAwake,intention.belongsToCoordination)
    }
}