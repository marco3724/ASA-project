import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import {distance,nearestDelivery} from "./utility.js"
import * as astar from "./astar.js"
const client = new DeliverooApi(
    "http://localhost:8080/",
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjcyZDI4M2VlMjU3IiwibmFtZSI6ImNpYW8iLCJpYXQiOjE3MTUxNjA5NzF9.me_Fvg-V48fiYGQLPVJtShxX6kjNkiMAo2E2qjdXw-8'
  );

//BELIEVES 
//parcel { id: 'p283', x: 4, y: 4, carriedBy: null, reward: 23 }
//deliveryPoint { x: 1, y: 0, delivery: true, parcelSpawner: false }
//me { id: '09fd649e76e', name: 'marco', x: 0, y: 0, score: 0 }
const believes = {
    parcels: [],
    deliveryPoints: [],
    me: {},
    agentsPosition: new Map()
    //semsing of other players
}
let graph
let map
let mapX 
let mapY 
const radius_distance = 3
let min_reward = 15

client.onAgentsSensing( (agents) => {
    agents.forEach(agents =>{
    believes.agentsPosition.has(agents.id) ? 
        believes.agentsPosition.set(agents.id, {x:agents.x,y:agents.y,score:agents.score}) //add an array to have an history (is it necessary?)
        : 
        believes.agentsPosition.set(agents.id, {x:agents.x,y:agents.y,score:agents.score})
    })
    console.log("Agents:",believes.agentsPosition)
} )
client.onMap((width, height, tiles) => {
    mapX = width;
    mapY = height;
    map = new Array(mapX).fill(0).map( () => new Array(mapY).fill(0));

    tiles.forEach((tile) => {
        map[tile.x][tile.y] = tile.delivery ? 2 : 1; // 2 is delivery point, 1 is normal tile
        if (tile.delivery) {
            believes.deliveryPoints.push(tile);
        }
    });
    graph = new astar.Graph(map);
    //console.log(graph.toString())
    //console.log("graphs: ",graph)

});
// client.onMap( ( x, y, delivery ) => {
//     console.log(delivery)
//     believes.deliveryPoints = delivery.filter(d=>d.delivery)
//     console.log("Delivery Points:",believes.deliveryPoints)
// })


client.onYou( ( {id, name, x, y, score} ) => {
    believes.me.id = id
    believes.me.name = name
    believes.me.x = Math.floor(x)
    believes.me.y = Math.floor(y)
    believes.me.score = score
} )


client.onParcelsSensing( async ( perceived_parcels ) => {
    believes.parcels = perceived_parcels.filter( p => p.carriedBy == null || p.carriedBy== believes.me.id ).map(p=> {return {...p,x:Math.round(p.x),y:Math.round(p.y),distance: distance(believes.me,p)}})
} )
client.onConfig( (config) => {
    believes.config = config
    believes.config.rewardDecayRatio = 0
    if(believes.config.PARCEL_DECADING_INTERVAL=="infinite")
        min_reward = 0
    else
        believes.config.rewardDecayRatio = config.MOVEMENT_DURATION/(config.PARCEL_DECADING_INTERVAL.split("s")[0] *1000) //cost of moving one step
    //console.log("CONFIG:",believes.config)
    //random agent speed will be needed for calculate how many times to retry the same path when blocked
})

//INTENTIONS
//intention {type: 'move_to', target: {x: 1, y: 0}}
const actions ={
    pick_parcel: 'pick_parcel',
    deliver_parcel: 'deliver_parcel',
    find_package: 'find_package',
    move_to: 'move_to'
}
const intentions = []
let failRandom = 0
let previousDirection =""
while (true){
    //move randomly if there are no parcels sensed or a plan is not defined
    if(believes.parcels.length==0 && intentions.length==0){
        let dir = ['up','down','left','right']
        if(map)
            dir = getAvailableDirections()

        let direction = dir[Math.floor(Math.random()*dir.length)]
        let status = await client.move(direction)

        if(!status){
            console.log("Failed moving ",direction)
            failRandom++
            //it means that someone is blocking our agent
            if(failRandom>20){
                failRandom = 0
                previousDirection =""
                continue
            }
        }else{
            console.log("Moving ",direction)
            previousDirection = direction
            believes.me.x = Math.floor( status.x)
            believes.me.y = Math.floor(status.y)
        }
        

    }else{
        //if MY agent is carrying some parcel, i may want to deliver
        if(believes.parcels.some(p=>p.carriedBy==believes.me.id)){
            const parcels = believes.parcels
                .filter(p=>p.carriedBy!=believes.me.id)
                .sort((a,b) => a.distance - b.distance)
            //TODO: find the right tradeoff between distance and reward parcels[0].distance < radius_distance
            //need more reasoning for the condition such as other agents, maybe also the distance
            //for instance if there are othere near agentfrom the parcels and i already have a packet i won't go for it, since i might loose time and parcels drop in reward
            if(parcels.length!=0  && (parcels[0].reward-parcels[0].distance*believes.config.rewardDecayRatio)>min_reward) 
                intentions.push({type: actions.pick_parcel, target: parcels[0]}) 
            //if there are no parcels, i want to deliver, we are finding the nearest delivery point not the a star algoritmW
            //TODO: calculate the 3 (n) nearest delivery point, and use the astar to find the real distance
            else 
                intentions.push({type: actions.deliver_parcel, target: believes.deliveryPoints.sort( (a,b) => distance(believes.me,a) - distance(believes.me,b) )[0]})
        }else{//if my agent is not carrying anything, i want to pick the nearest parcel 
            // TODO trade off between taking a packer or not, in this case need to be more aggressive
            let option = [] //intention revision (without selecfting multiple intention)
            believes.parcels.map( p => {return {...p,distance: distance(believes.me,p)}} )
    
            believes.parcels.sort( (a,b) => a.distance - b.distance )

            intentions.push({type: actions.pick_parcel, target: believes.parcels[0]})
        }
    }


    //execute the action
    if(intentions.length>0){
        let intention = intentions[0]
        console.log("Intentions",intention)
        if(intention.type == actions.pick_parcel){
            if(intention.target.distance == 0){
                await client.pickup()
                intentions.shift()
            }
            else{
                await moveTo(intention,parcelGone)  
                await client.pickup()
                intentions.shift()
            }
        }
        if(intention.type == actions.deliver_parcel){
            if(intention.target.distance == 0){
                await client.putdown()
                intentions.shift()
            }
            else{
                await moveTo(intention,carryingParcelGone)
                await client.putdown()
                intentions.shift()
            }
        }
    }


    //Wait for the next tick 
    await new Promise( res => setImmediate( res ) );
}


// SUPPORT FUNCTION
function getAvailableDirections(){
    let dir = []
    if(Math.ceil(believes.me.y)<mapY-1 && map[believes.me.x][believes.me.y+1]==1 && previousDirection !== 'down')
        dir.push('up')
    if(Math.floor(believes.me.y)>0 && map[believes.me.x][believes.me.y-1]==1 && previousDirection !== 'up')
        dir.push('down')
    if(Math.floor(believes.me.x)>0 && map[believes.me.x-1][believes.me.y]==1 && previousDirection !== 'right')
        dir.push('left')
    if(Math.ceil(believes.me.x)<mapX-1 && map[believes.me.x+1][believes.me.y]==1 && previousDirection !== 'left')
        dir.push('right')
    if(dir.length==0){
        if(Math.ceil(believes.me.y)<mapY-1 && map[believes.me.x][believes.me.y+1]==1 )
            dir.push('up')
        if(Math.floor(believes.me.y)>0 && map[believes.me.x][believes.me.y-1]==1 )
            dir.push('down')
        if(Math.floor(believes.me.x)>0 && map[believes.me.x-1][believes.me.y]==1)
            dir.push('left')
        if(Math.ceil(believes.me.x)<mapX-1 && map[believes.me.x+1][believes.me.y]==1)
            dir.push('right')
    }
    return dir
}

async function moveTo(intention,needToStop){
    while(believes.me.x!=intention.target.x || believes.me.y!=intention.target.y){
        console.log("Moving towards target",intention.target)
        let status,failed_movemets=0
        let {me} = believes
        let stopAction = false
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
                console.log("Failed movements") //BUG(???)
                i--
                failed_movemets++
            }
                
            if(failed_movemets>20){
                    failed_movemets = 0
                    console.log("Recalculating path to delivery point")
                    i = 0
                    let delpoints = believes.deliveryPoints.filter(d=>d.x!=intention.target.x && d.y!=intention.target.y)
                    intentions.shift()
                    intentions.push({type: actions.deliver_parcel, target: delpoints.sort( (a,b) => distance(believes.me,a) - distance(believes.me,b) )[0]})//we are finding the nearest delivery point not the a star algoritmW
                    intention = intentions[0]
                
                    current_pos = graph.grid[Math.round(me.x)][Math.round(me.y)];
                    parcel_node = graph.grid[intention.target.x][intention.target.y];
                   
                    result = astar.astar.search(graph, current_pos, parcel_node, {diagonal: false});
                    
            }
            if(needToStop(intention,i,result))    
                break
        }
        if(stopAction)
            break
    }
}

function carryingParcelGone(){
    return !believes.parcels.some(p=>p.carriedBy==believes.me.id)
}
function parcelGone(intention,i,result){
    return   (!believes.parcels.some(p=>(p.id==intention.target.id) && result.length-i<4))//se il pacco non c'e piu e sono molto vicino  allora lo toglo, altrimenti se il pacco non ce piu ma sono lontano voglio provcare a raggiungerlo 
           
}

