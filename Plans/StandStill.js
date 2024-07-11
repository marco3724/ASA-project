import { Logger } from "../Utility/Logger.js";
import { notifyToAwake } from "../Communication/communication.js";
import { Plan } from "./Plan.js";
export class StandStill extends Plan{
    constructor(intention,notifyToAwake,belongsToCoordination){
        super(notifyToAwake,belongsToCoordination)
        this.planType = "standStill";
        this.intention = intention
    }
    async generatePlan(){
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, "No need to generate, just wait");
    }
    //override the execute function
    async execute(){
        while(!this.stop){
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if(this.notifyToAwake){
            notifyToAwake();
            Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, "Awaking the other agent!");
        }
        Logger.logEvent(Logger.logType.PLAN, Logger.logLevels.INFO, "Finally awake!");
    }
    get target(){
        return this.intention.target;
    }
}