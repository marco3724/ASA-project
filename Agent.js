import { readFile, astarDistance} from "./Utility/utility.js"
import * as astar from "./Utility/astar.js"
import { mapConstant, hyperParams, believes, client, launchConfig } from "./Believes.js"
import { Intention } from "./Intention.js"
import { Plan } from "./Plans/Plan.js"
import { Logger } from "./Utility/Logger.js"
import { initCommunication, sendIntention } from "./Communication/communication.js"
//Setup
const logBelieves = (process.argv.includes('-b') || process.argv.includes('--believe'))
launchConfig.offLineSolver = (process.argv.includes('-o') || process.argv.includes('--offline'))


//Updating Believes
client.onMap((width, height, tiles) => {
    mapConstant.mapX = width;
    mapConstant.mapY = height;
    mapConstant.map = new Array(mapConstant.mapX).fill(0).map( () => new Array(mapConstant.mapY).fill(0));
    mapConstant.parcelSpawner = [];

    tiles.forEach((tile) => {
        // each tile has this format: { x: 0, y: 0, delivery: t/f, parcelSpawner: t/f }
        mapConstant.map[tile.x][tile.y] = tile.delivery ? 2 : 1; // 2 is delivery point, 1 is normal tile
        if (tile.delivery) {
            believes.deliveryPoints.push(tile);
        }

        /**
         * Heatmap initialization
         * We initialize the heatmap with 1 if the tile is a parcel spawner, so that
         * the agent will be more likely to go there.
         */
        if (tile.parcelSpawner) {
            mapConstant.parcelSpawner.push({x: tile.x, y: tile.y});
        }
    });

    /**
     * Initially, each parcel spawner has the same probability to spawn a parcel
     */
    let numSpawners = mapConstant.parcelSpawner.length;
    let prob = 1 / numSpawners;
    mapConstant.parcelSpawner.forEach(spawner => {
        believes.heatmap.set(`t_${spawner.x}_${spawner.y}`, {x: spawner.x, y: spawner.y, currentParcelId: null, prob: prob});
    });


    if(logBelieves)
        Logger.logEvent(Logger.logType.BELIEVES,Logger.logLevels.INFO,"heatmap: "+JSON.stringify([...believes.heatmap.entries()]))
        

    for (let i = 0; i < mapConstant.map.length; i++) {
        for (let j = 0; j < mapConstant.map[i].length; j++) {
            if (mapConstant.map[i][j] != 0) {
                let currentTile = `t_${i}_${j}`;
                mapConstant.pddlMapObjects += `${currentTile} `;
                mapConstant.pddlTiles += `(tile ${currentTile}) `;

                // check for neighbors
                if (i > 0 && mapConstant.map[i - 1][j] != 0) {
                    let neighborTile = `t_${i - 1}_${j}`;
                    mapConstant.pddlNeighbors += `(left ${currentTile} ${neighborTile}) `;
                }
                if (i < mapConstant.mapX - 1 && mapConstant.map[i + 1][j] != 0) {
                    let neighborTile = `t_${i + 1}_${j}`;
                    mapConstant.pddlNeighbors += `(right ${currentTile} ${neighborTile}) `;
                }
                if (j > 0 && mapConstant.map[i][j - 1] != 0) {
                    let neighborTile = `t_${i}_${j - 1}`;
                    mapConstant.pddlNeighbors += `(down ${currentTile} ${neighborTile}) `;
                }
                if (j < mapConstant.mapY - 1 && mapConstant.map[i][j + 1] != 0) {
                    let neighborTile = `t_${i}_${j + 1}`;
                    mapConstant.pddlNeighbors += `(up ${currentTile} ${neighborTile}) `;
                }
            }

            // check for delivery points
            if (mapConstant.map[i][j] == 2) {
                let currentTile = `t_${i}_${j}`;
                mapConstant.pddlDeliveryPoints += `(delivery ${currentTile}) `;
            }
        }
    }


    // is this necessary?
    mapConstant.graph = new astar.Graph(mapConstant.map);
    if(logBelieves)
        Logger.logEvent(Logger.logType.BELIEVES,Logger.logLevels.INFO,"Graph: "+mapConstant.graph.toString())
});
client.onAgentsSensing( (agents) => {

    believes.agentsPosition.forEach((value, key) => {
        believes.agentsPosition.set(key, {...value, unseen: value.unseen+1});
    })

    agents.forEach(agents =>{
    believes.agentsPosition.has(agents.id) ? 
        believes.agentsPosition.set(agents.id, {x:agents.x,y:agents.y,score:agents.score,unseen:0})
        : 
        believes.agentsPosition.set(agents.id, {x:agents.x,y:agents.y,score:agents.score,unseen:0})
    })
    if(logBelieves){
        let mapArray = [...believes.agentsPosition.entries()];
        Logger.logEvent(Logger.logType.BELIEVES,Logger.logLevels.INFO,"Agents: "+JSON.stringify(mapArray))
    }
    
       
} )

let firstTime = true
client.onYou( ( {id, name, x, y, score} ) => {
    believes.me.id = id
    believes.me.name = name
    believes.me.x = Math.floor(x)
    believes.me.y = Math.floor(y)
    believes.me.score = score
    if(logBelieves)
        Logger.logEvent(Logger.logType.BELIEVES,Logger.logLevels.INFO,"Me: "+JSON.stringify(believes.me))

    //once i spawn, i want to remove all the unreachable delivery points and spawn points
    if(firstTime){ //doing it only at the beggining (assuming that the map doesn;t change)
        firstTime = false
        Logger.logEvent(Logger.logType.BELIEVES,Logger.logLevels.INFO,"Removing unreachable delivery points and spawn points")
        let reachableDeliveryPoints = []
        for (let i = 0; i < believes.deliveryPoints.length; i++) {
            if ((believes.deliveryPoints[i].x==believes.me.x && believes.deliveryPoints[i].y == believes.me.y) || astarDistance(believes.deliveryPoints[i], believes.me,mapConstant.graph)!=0){
                reachableDeliveryPoints.push(believes.deliveryPoints[i]);
            }
            else{
                believes.blackList.deliveryPoints.push(believes.deliveryPoints[i]);
            }
        }
        believes.deliveryPoints = reachableDeliveryPoints;

        let reachableSpawnpoint = []
        for (let i = 0; i < mapConstant.parcelSpawner.length; i++) {
            if ((mapConstant.parcelSpawner[i].x==believes.me.x && mapConstant.parcelSpawner[i].y == believes.me.y) || astarDistance(mapConstant.parcelSpawner[i], believes.me,mapConstant.graph)!=0){
                reachableSpawnpoint.push(mapConstant.parcelSpawner[i]);
            }
            else{
                //add unreachable spawn points to the blacklist, so we ignore the parcels that spawn there
                believes.blackList.spawnPoints.push(mapConstant.parcelSpawner[i]);
                //after updating the heatmap also normalize again
                believes.heatmap.delete(`t_${mapConstant.parcelSpawner[i].x}_${mapConstant.parcelSpawner[i].y}`);
                let sum = 0;
                believes.heatmap.forEach((value, key) => {
                    sum += value.prob;
                });
                // update each prob such that currprob = currprob/sum
                believes.heatmap.forEach((value, key) => {
                    believes.heatmap.set(key, {...value, prob: value.prob / sum});
                });
            }
        }
        mapConstant.parcelSpawner = reachableSpawnpoint
    }

} )


client.onParcelsSensing( async ( perceived_parcels ) => {
    // parcels have this format { id: 'p0', x: 7, y: 6, carriedBy: null, reward: 29 }
    //keep only the parcels that are not carried by other agents (only me or no one), and also ignore the blacklisted parcels
    believes.parcels = perceived_parcels.filter( p => !believes.blackList.parcels.includes(p.id) && (p.carriedBy == null || p.carriedBy== believes.me.id ) ).map(p=> {return {...p,x:Math.round(p.x),y:Math.round(p.y)}})
    believes.parcels = believes.parcels.filter(p => p.reward > 0)//ignore parcels with negative reward
    believes.parcels = believes.parcels.filter(p => !believes.blackList.spawnPoints.some(sp => sp.x == p.x && sp.y == p.y))//ignore parcels that are in the black list (since unreachable)
    if(logBelieves)
        Logger.logEvent(Logger.logType.BELIEVES,Logger.logLevels.INFO,"Parcels: "+JSON.stringify(believes.parcels))

    //Update heatmap
    perceived_parcels.forEach( parcel => {
        if(parcel.carriedBy == null || parcel.carriedBy !== believes.me.id){
            let parcelPosition = `t_${Math.round(parcel.x)}_${Math.round(parcel.y)}`
            if (believes.heatmap.has(parcelPosition)) {
                let tileInfo = believes.heatmap.get(parcelPosition)
                /**
                 * if the we haven't seen a parcel in this tile, increease the probability
                 * if we see a parcel with a different id then previous, increase the probability
                 * this is done to avoid increasing the probability of the same parcel
                 */
                if (tileInfo.currentParcelId == null || tileInfo.currentParcelId !== parcel.id) {
                    believes.heatmap.set(parcelPosition, {...tileInfo, currentParcelId: parcel.id, prob: tileInfo.prob * 1.05})
                }
            }
        }
    });

    // calculate the sum of the probabilities of the parcel spawners
    let sum = 0;
    believes.heatmap.forEach((value, key) => {
        sum += value.prob;
    });
    // update each prob such that currprob = currprob/sum
    believes.heatmap.forEach((value, key) => {
        believes.heatmap.set(key, {...value, prob: value.prob / sum});
    });

    if(logBelieves)
        Logger.logEvent(Logger.logType.BELIEVES,Logger.logLevels.INFO,"Heatmap: "+JSON.stringify([...believes.heatmap.entries()]))
});

client.onConfig( (config) => {
    believes.config = config
    // here we set up the communication with the other agent
    initCommunication(client);
    believes.config.PARCEL_REWARD_VARIANCE = parseInt(config.PARCEL_REWARD_VARIANCE) //sometimes is a string
    believes.config.rewardDecayRatio = 0 // if the reward decay is infinite, the reward will never decrease so i don't want to consider the distance (in case there is not crowd)
    if(believes.config.PARCEL_DECADING_INTERVAL!="infinite")
        believes.config.rewardDecayRatio = config.MOVEMENT_DURATION/(config.PARCEL_DECADING_INTERVAL.split("s")[0] *1000) //cost of moving one step (for each step how much the reward decrease ex movDuration 1s and decadingInterval =2, then the reward decrease of 0.5 for each step)
    if(logBelieves)
        Logger.logEvent(Logger.logType.BELIEVES,Logger.logLevels.INFO,"Config: "+JSON.stringify(believes.config))
})

async function agentLoop(){
    let agent = new Intention()
    Plan.domain = await readFile('./domain.pddl' );
    await new Promise((resolve) => setTimeout(resolve, 100));
    while(true){
        let intention = agent.generateAndFilterOptions();        
        await sendIntention(intention.type, intention.target);
        await intention.generatePlan();
        agent.revise(intention);
        await intention.execute();
    }
}

agentLoop()

