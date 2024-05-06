import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import {distance,nearestDelivery} from "./utility.js"
import * as astar from "./astar.js"
const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjA5ZmQ2NDllNzZlIiwibmFtZSI6Im1hcmNvIiwiaWF0IjoxNjc5OTk3Njg2fQ.6_zmgL_C_9QgoOX923ESvrv2i2_1bgL_cWjMw4M7ah4'
)

//BELIEVES 
//parcel { id: 'p283', x: 4, y: 4, carriedBy: null, reward: 23 }
//deliveryPoint { x: 1, y: 0, delivery: true, parcelSpawner: false }
//me { id: '09fd649e76e', name: 'marco', x: 0, y: 0, score: 0 }
const believes = {
    parcels: [],
    deliveryPoints: [],
    me: {},
    agentsPosition: []
    //semsing of other players
}
let graph
let map
let mapX 
let mapY 
const radius_distance = 3
const min_reward = 15

client.onAgentsSensing( (agents) => {
    console.log("Agents:",agents)
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
    console.log(graph.toString())
    console.log("graphs: ",graph)

});
// client.onMap( ( x, y, delivery ) => {
//     console.log(delivery)
//     believes.deliveryPoints = delivery.filter(d=>d.delivery)
//     console.log("Delivery Points:",believes.deliveryPoints)
// })


client.onYou( ( {id, name, x, y, score} ) => {
    believes.me.id = id
    believes.me.name = name
    believes.me.x = Math.round(x)
    believes.me.y = Math.round(y)
    believes.me.score = score
} )


client.onParcelsSensing( async ( perceived_parcels ) => {
    believes.parcels = perceived_parcels.filter( p => p.carriedBy == null || p.carriedBy== believes.me.id ).map(p=> {return {...p,distance: distance(believes.me,p)}})
} )
client.onConfig( (config) => {
    believes.config = config
    believes.config.rewardDecayRatio = config.MOVEMENT_DURATION/(config.PARCEL_DECADING_INTERVAL.split("s")[0] *1000) //cost of moving one step
    console.log("CONFIG:",believes.config)
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
let failRandom
while (true){
    //move randomly if there are no parcels sensed or a plan is not defined
    if(believes.parcels.length==0 && intentions.length==0){
        // let dir = []
        // console.log("Random move")
        // if(map){
        //     if(believes.me.y!=mapY){
        //         if( map[believes.me.x][believes.me.y+1]==1)
        //             dir.push('up')
        //         if(map[believes.me.x][believes.me.y-1]==1)
        //             dir.push('down')
        //     }
        //     if(believes.me.x!=mapX){
        //         if(map[believes.me.x-1][believes.me.y]==1)
        //             dir.push('left')
        //         if(map[believes.me.x+1][believes.me.y]==1)
        //             dir.push('right')
        //     }
    
        // }

        // dir = dir[Math.floor(Math.random()*dir.length)] || "right"
        console.log("Random move")
        let dir = ['up','down','left','right'][Math.floor(Math.random()*4)]
        let status =await client.move(dir)
        if(!status){
            failRandom++
            console.log("Random move status:",status,"In total: ",failRandom)
        }
        

    }
    // //if there are parcels sensed and no plan is defined, pick the nearest parcel
    // else if(believes.parcels.length>0 && intentions.length==0){
    //     believes.parcels.sort( (a,b) => a.distance - b.distance )
    //     intentions.push({type: actions.pick_parcel, target: believes.parcels[0]})
    // }
    else{

        console.log("choosing intention")
        if(believes.parcels.some(p=>p.carriedBy==believes.me.id)){
            const parcels = believes.parcels
                .filter(p=>p.carriedBy!=believes.me.id)
                .sort( (a,b) => a.distance - b.distance )
                console.log(parcels)
            if(parcels.length!=0  && (parcels[0].reward-parcels[0].distance*believes.config.rewardDecayRatio)>min_reward) //find the right tradeoff between distance and reward parcels[0].distance < radius_distance
                intentions.push({type: actions.pick_parcel, target: parcels[0]}) //need more reasoning for the condition such as other agents, maybe also the distance
                //for instance if there are othere near agentfrom the parcels and i already have a packet i won't go for it, since i might loose time and parcels drop in reward
            else
                intentions.push({type: actions.deliver_parcel, target: believes.deliveryPoints.sort( (a,b) => distance(believes.me,a) - distance(believes.me,b) )[0]})//we are finding the nearest delivery point not the a star algoritmW
        }

        else{
            let option = []
            //intention revision (without selecfting multiple intention)
            believes.parcels.map( p => {return {...p,distance: distance(believes.me,p)}} )
    
            believes.parcels.sort( (a,b) => a.distance - b.distance )

            intentions.push({type: actions.pick_parcel, target: believes.parcels[0]})
        }

        //console.log("Parcels:",believes.parcels)
        //console.log("Intentions:",intentions)
    }


    //execute the action
    if(intentions.length>0){
        console.log("action")
        let intention = intentions[0]
        console.log("Intentions",intention)
        if(intention.type == actions.pick_parcel){
            if(intention.target.distance == 0){
                await client.pickup()
                intentions.shift()
            }
            else{
                
                while(believes.me.x!=intention.target.x || believes.me.y!=intention.target.y){
                    console.log("PARCEL intention:",intention.target.id,"Parcels availabe:",believes.parcels)
                    console.log("Moving to parcel")
                    console.log("Me 1:",believes.me)
                    let status,failed_movemets=0
                    let {me} = believes
                    let current_pos = graph.grid[Math.round(me.x)][Math.round(me.y)];
                    let parcel_node = graph.grid[intention.target.x][intention.target.y];
                    let result = astar.astar.search(graph, current_pos, parcel_node, {diagonal: false});
                    for (let i =0;i < result.length;i++){
                        const direction = result[i].movement //if the loop is still advancing why the agent still make the same move?
                        status = await client.move(direction)
                        console.log("MOVEMENTS status:",status)
                        if(status){ 
                            
                            believes.me.x = status.x
                            believes.me.y = status.y
                        }
                        else{
                            i--
                            failed_movemets++
                            console.log("Failed movements AAAAAAAAAAAa")
                        }
                            
                        // if(failed_movemets>10){
                        //     console.log("Failed movements")
                        //     i = 0
                        //     intentions.shift()
                        //     intentions.push({type: actions.deliver_parcel, target: believes.deliveryPoints.sort( (a,b) => distance(believes.me,a) - distance(believes.me,b) )[1]})//we are finding the nearest delivery point not the a star algoritmW
                            
                        //     current_pos = graph.grid[Math.round(me.x)][Math.round(me.y)];
                        //     parcel_node = graph.grid[intention.target.x][intention.target.y];
                        //     result = astar.astar.search(graph, current_pos, parcel_node, {diagonal: false});
                        // }
                            
                        if(!believes.parcels.some(p=>p.id==intention.target.id)){
                            intentions.shift()
                            break
                        }
                    }
                    // if(believes.me.x!=intention.target.x)
                    //     status = await client.move(intention.target.x>believes.me.x?'right':'left')
                    // if(believes.me.y!=intention.target.y)
                    //     status = await client.move(intention.target.y<believes.me.y?'down':'up')
                console.log("Me 2:",believes.me)
                }
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
                while(believes.me.x!=intention.target.x || believes.me.y!=intention.target.y){
                    console.log("Moving to delivery point")
                    console.log("Me 1:",believes.me)
                    let status,failed_movemets=0
                    let {me} = believes
                    let noCarrying = false
                    let current_pos = graph.grid[Math.round(me.x)][Math.round(me.y)];
                    let parcel_node = graph.grid[intention.target.x][intention.target.y];
                    let result = astar.astar.search(graph, current_pos, parcel_node, {diagonal: false});
                    for (let i =0;i < result.length;i++){
                        const direction = result[i].movement
                        status = await client.move(direction)
                        console.log("MOVEMENTS status:",status)
                        if(status){
                            believes.me.x = status.x
                            believes.me.y = status.y
                        }
                        else{
                            i--
                            failed_movemets++
                        }
                            
                        // if(failed_movemets>10){
                        //         console.log("Failed movements")
                        //         i = 0
                        //         intentions.shift()
                        //         intentions.push({type: actions.deliver_parcel, target: believes.deliveryPoints.sort( (a,b) => distance(believes.me,a) - distance(believes.me,b) )[1]})//we are finding the nearest delivery point not the a star algoritmW
                                
                        //         current_pos = graph.grid[Math.round(me.x)][Math.round(me.y)];
                        //         parcel_node = graph.grid[intention.target.x][intention.target.y];
                        //         result = astar.astar.search(graph, current_pos, parcel_node, {diagonal: false});
                        // }
                        if(!believes.parcels.some(p=>p.carriedBy==believes.me.id)){
                            console.log("SHIFTING INTENTION, PARCELS I WAS CARRYING IS GONE")
                            noCarrying = true
                            break
                        }
                    }
                    if(noCarrying)
                        break
                    console.log("Me 2:",believes.me)
                }
                await client.putdown()
                intentions.shift()
            }
        }
    }


    //Wait for the next tick 
    await new Promise( res => setImmediate( res ) );
}

/*
BASIC FUNCTIONALITY
- move randomly
- pick the nearest parcel
- deliver the parcel to the nearest delivery point

EDGE CASES
- [DONE]parcel disappear while i'm carrying it -> need to stop and drop the current intention (probably need prof's architecture) 
- avoid player
- [DONE]parcel disappear while i'm moving to pick it -> need to stop and drop the current intention (probably need prof's architecture) 
- [DONE](christian) need to use a path finding algorithm to move to the target in order to not get stuck in some cases (when the target is reached by one of the two coordinates but not by the other but the othercoordinate is blocked----------------^------------- where that arrow should go)

ENHANCEMENTS
- try to pick more packet on the way to the delivery point
- calculate also the distance between the delivery point and the parcel (currently just calculating the distance between me and the parcel)
- (?) put more intention and then do a filter (currently directly filtering from the believes)
- (?) use professor's architecture 
*/