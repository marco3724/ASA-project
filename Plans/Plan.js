import {PddlExecutor } from "@unitn-asa/pddl-client";   
import { client,believes,hyperParams } from '../Believes.js';

export class Plan {
     static domain = null
     actions = new Map([
        ['MOVE-UP',async  (l)=> {
            let status = await client.move("up") 
            if(status){
                believes.me.x = status.x
                believes.me.y = status.y
            }
            return status
        }
        ],
        [ 'MOVE-DOWN', async  (l)=> {
            let status = await client.move("down") 
            if(status){
                believes.me.x = status.x
                believes.me.y = status.y
            }
            return status
        }],
        ['MOVE-RIGHT',  async  (l)=> {
            let status = await client.move("right") 
            if(status){
                believes.me.x = status.x
                believes.me.y = status.y
            }
            return status
        } ],
        ['MOVE-LEFT', async  (l)=> {
            let status = await client.move("left") 
            if(status){
                believes.me.x = status.x
                believes.me.y = status.y
            }
            return status
        } ],
        ['PICK-UP', async  (l)=> {
            let status = await client.pickup()
            //console.log("pickup status",status)
            if(status && status.length>0){ //update the believes (because the believes are updated before the action is executed)
                let index = believes.parcels.findIndex(p=>p.id==status[0].id)
                believes.parcels[index].carriedBy = believes.me.id
            }
            return status

        } ],
        [ 'PUT-DOWN', async  (l)=> {
            let status = await client.putdown() 
            //console.log("putdown status",status)
            if(status && status.length>0){ //update the believes (because the believes are updated before the action is executed)
                believes.parcels = believes.parcels.filter(p=>p.id!==status[0].id)
                
            }
            return status
        }]
    ])
    constructor(){
        this.plan = null
        this.stop = false  
    }
     async execute (){
        let retry = 0
        for (let i = 0; i < this.plan.length; i++) {
            let actionName = this.plan[i].action
            let exec= this.actions.get(actionName)
            let status = await exec()
            if(retry>hyperParams.max_retry){
                //replan
            }
            if(!status){
                console.log("Failed action, retry")
                i--
                retry++
                continue
            }
            retry = 0
            if(this.stop){
                console.log("Plan stopped")
                break
            }
        }
        this.stop = true
        console.log("plan executed succesfully")
        console.log("plan: ",this)
    }
    
    
}