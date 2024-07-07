import fs from 'fs';
import * as astar from "./astar.js";
export function nearestDelivery(){
    let min = Number.MAX_VALUE
    let target;
    for (let d of deliveryPoints){
        let d1 = distance(me,d)
        if(d1<min){
            min = d1
            target = d
        }
    }
    return target
}
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