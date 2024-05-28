import {distance,nearestDelivery} from "./Utility/utility.js"
import * as astar from "./Utility/astar.js"
import {mapConstant,radius_distance,min_reward,believes,client} from "./Believes.js"
import {Intention} from "./Intention.js"


//Setup
const logBelieves = (process.argv.includes('-b') || process.argv.includes('--believe')) 



//Updating Believes
client.onMap((width, height, tiles) => {
    mapConstant.mapX = width;
    mapConstant.mapY = height;
    mapConstant.map = new Array(mapConstant.mapX).fill(0).map( () => new Array(mapConstant.mapY).fill(0));

    tiles.forEach((tile) => {
        mapConstant.map[tile.x][tile.y] = tile.delivery ? 2 : 1; // 2 is delivery point, 1 is normal tile
        if (tile.delivery) {
            believes.deliveryPoints.push(tile);
        }
    });
    mapConstant.graph = new astar.Graph(mapConstant.map);
    if(logBelieves)
        console.log("Graph: ",mapConstant.graph.toString())
});
client.onAgentsSensing( (agents) => {
    agents.forEach(agents =>{
    believes.agentsPosition.has(agents.id) ? 
        believes.agentsPosition.set(agents.id, {x:agents.x,y:agents.y,score:agents.score})
        : 
        believes.agentsPosition.set(agents.id, {x:agents.x,y:agents.y,score:agents.score})
    })
    if(logBelieves)
        console.log("Agents position: ",believes.agentsPosition)
    
} )


client.onYou( ( {id, name, x, y, score} ) => {
    believes.me.id = id
    believes.me.name = name
    believes.me.x = Math.floor(x)
    believes.me.y = Math.floor(y)
    believes.me.score = score
    if(logBelieves)
        console.log("Me: ",believes.me)    
} )


client.onParcelsSensing( async ( perceived_parcels ) => {
    believes.parcels = perceived_parcels.filter( p => p.carriedBy == null || p.carriedBy== believes.me.id ).map(p=> {return {...p,x:Math.round(p.x),y:Math.round(p.y)}})
    if(logBelieves)
        console.log("Parcels: ",believes.parcels) 
} )
client.onConfig( (config) => {
    believes.config = config
    believes.config.rewardDecayRatio = 0
    if(believes.config.PARCEL_DECADING_INTERVAL=="infinite")
        //min_reward = 0 TODO
        console.log("a caso")
    else
        believes.config.rewardDecayRatio = config.MOVEMENT_DURATION/(config.PARCEL_DECADING_INTERVAL.split("s")[0] *1000) //cost of moving one step
    if(logBelieves)
        console.log("Config: ",believes.config) 
})


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
let intentionGenerator = new Intention()
async function agentLoop(){
    let action = intentionGenerator.generateAndFilterOptions()
    //await sleep(2000) //wait the map initialization
    await action.execute()
    await agentLoop()
}

agentLoop()
