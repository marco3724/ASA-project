import {PddlExecutor } from "@unitn-asa/pddl-client";   
import { client,believes } from '../Believes.js';

export const  Plan ={
     domain : null,
     pddlExecutor : new PddlExecutor( 
        { name: 'MOVE-UP',   executor: async  (l)=> {
            let status = await client.move("up") 
            if(status){
                believes.me.x = status.x
                believes.me.y = status.y
            }
        }
        },
        { name: 'MOVE-DOWN',  executor: async  (l)=> {
            let status = await client.move("down") 
            if(status){
                believes.me.x = status.x
                believes.me.y = status.y
            }
        }  },
        { name: 'MOVE-RIGHT',   executor: async  (l)=> {
            let status = await client.move("right") 
            if(status){
                believes.me.x = status.x
                believes.me.y = status.y
            }
        } },
        { name: 'MOVE-LEFT',  executor: async  (l)=> {
            let status = await client.move("left") 
            if(status){
                believes.me.x = status.x
                believes.me.y = status.y
            }
        } },
        { name: 'pick-up',  executor: async  (l)=> {
            let status = await client.pickup()
            console.log("pickup status",status)
            if(status && status.length>0){ //update the believes (because the believes are updated before the action is executed)
                let index = believes.parcels.findIndex(p=>p.id==status[0].id)
                believes.parcels[index].carriedBy = believes.me.id
            }

        } },
        { name: 'put-down',  executor: async  (l)=> {
            let status = await client.putdown() 
            console.log("putdown status",status)
            if(status && status.length>0){ //update the believes (because the believes are updated before the action is executed)
                believes.parcels = believes.parcels.filter(p=>p.id!==status[0].id)
                
            }
        }}
    )
    //stati domain file generate there TODO domain generation non asyncrhonous but using the prof wrapper
    
}