import { client,believes,hyperParams } from '../Believes.js';
import { Logger } from "../Utility/Logger.js";

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
            if(status && status.length>0){ //update the believes (because the believes are updated before the action is executed)
                let index = believes.parcels.findIndex(p=>p.id==status[0].id)
                believes.parcels[index].carriedBy = believes.me.id
            }
            return status

        } ],
        [ 'PUT-DOWN', async  (l)=> {
            let status = await client.putdown() 
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
    //geenratePlan Interface
    async generatePlan(){
        throw new Error("generatePlan is not implemented")
    }

    async execute (){
        if(!this.plan || this.plan.length==0 || this.stop){
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `No plan to execute`);
            return
        }

        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Start Executing the plan`);
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, "Plan object "+JSON.stringify(this.plan));
        let retry = 0
        for (let i = 0; i < this.plan.length; i++) {
            let actionName = this.plan[i].action
            let exec= this.actions.get(actionName)
            let status = await exec()

            if(!status){
                retry++ //since it has failed, increment the retry number
                if(retry>hyperParams.max_retry){
                    //replanning
                    if(actionName.includes("MOVE")){  
                        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Replanning to avoid obstacle`);
                        let obstacle =  this.plan[i].args[2].toLowerCase()//the tile that is blocking me
                        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, `Obstacle to avoid ${obstacle}`);
                        await this.generatePlan(obstacle)
                        /* TODO: if the new plan is not possible, in the pick up case is ok, simply change intention
                        in the drop down case, we may need to find another delivery and try again with that delivery point
                        */
                        if(!this.plan){//it means the intention is not achieavable
                            this.stop = true
                            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `No plan generated, intention not achievable`);
                            return //stop the plan
                        }

                        i = -1 //so the next iteration can start with the new plan from 0
                        retry = 0 //reset the retry
                        continue
                    }
                    break //no replanning possible, stop the plan
                }
                Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.DEBUG, `Action ${actionName} failed, retrying ${retry} time`);
                i--
                continue
            }

            retry = 0
            if(this.stop){
                Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Plan stopped due to revision`);
                return
            }
        }
        this.stop = true
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Plan succesfully executed`);
    }
    
    
}