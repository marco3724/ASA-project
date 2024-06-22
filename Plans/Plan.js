import { client,believes,hyperParams } from '../Believes.js';
import { Logger } from "../Utility/Logger.js";
import * as astar from "../Utility/astar.js";   
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
                for(let i= 0; i< status.length;i++){
                    let index = believes.parcels.findIndex(p=>p.id==status[i].id)
                    believes.parcels[index].carriedBy = believes.me.id
                }
            }
            return status

        } ],
        [ 'PUT-DOWN', async  (l)=> {
            let status = await client.putdown() 
            if(status && status.length>0){ //update the believes (because the believes are updated before the action is executed)
                for(let i= 0; i< status.length;i++){// i want to remove all the parcels that i have put down
                    believes.parcels = believes.parcels.filter(p=>p.id!==status[i].id)
                }

                
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
    offlineSolver(current_graph,IntentionTarget,lastAction,lastArgs){
        let current_pos = current_graph.grid[Math.round(believes.me.x)][Math.round(believes.me.y)];
        let target = current_graph.grid[IntentionTarget.x][IntentionTarget.y];
        let generated_plan = astar.astar.search(current_graph, current_pos, target, {diagonal: false});
        this.plan = [];
        let action;
        let args;
        if (generated_plan.length == 0) {
            this.plan = null;
        } else {
            generated_plan.forEach((step, index) => {
                // log the step coordinates
                Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Step ${index}: ${step.x}, ${step.y}`);
                
                action = `MOVE-${step.movement.toUpperCase()}`;
                // In this case step.x and step.y differ from the second argument of args of the onlineSolver
                // In the future, maybe this would become step.x -1 and step.y -1 to represent the current position of the agent before the move, to match the onlineSolver
                args = ["AGENT1", `T_${step.x}_${step.y}`, `T_${generated_plan[index].x}_${generated_plan[index].y}`];
                
                this.plan.push({
                    "parallel": false,
                    "action": action,
                    "args": args
                });
            });
            if(lastAction && lastArgs){
                this.plan.push({
                    "parallel": false,
                    "action": lastAction,
                    "args": lastArgs
                });
            }
        }
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
            Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.DEBUG, `status ${JSON.stringify(status)}`);

            if(!status){
                retry++ //since it has failed, increment the retry number
                if(retry>hyperParams.max_retry){
                    //replanning
                    if(actionName.includes("MOVE")){  
                        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Replanning to avoid obstacle`);
                        let obstacle =  this.plan[i].args[2].toLowerCase()//the tile that is blocking me
                        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, `Obstacle to avoid ${obstacle}`);
                        await this.generatePlan(obstacle)
                        
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