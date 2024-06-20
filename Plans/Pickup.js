
import { Plan } from "./Plan.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { mapConstant, believes } from "../Believes.js";  
export class Pickup extends Plan{
    constructor(intention) {
        super()
        this.intention = intention;
    }

    async generatePlan() {
        console.log("pickup intention", this.intention);
        let parcelTile = `t_${this.intention.target.x}_${this.intention.target.y}`;
        let pddlProblem = new PddlProblem(
            'pickup',
            mapConstant.pddlMapObjects + 'parcel1 ' + 'agent1',
            mapConstant.pddlTiles +  
            mapConstant.pddlNeighbors + 
            mapConstant.pddlDeliveryPoints + 
            `(at parcel1 ${parcelTile}) ` + 
            `(at agent1 t_${believes.me.x}_${believes.me.y}) ` +
            `(agent agent1) ` +
            `(me agent1) ` + 
            `(parcel parcel1) `,
            `and (at agent1 ${parcelTile}) (carrying agent1 parcel1)`
        );

        let problem = pddlProblem.toPddlString();

        //console.log( problem.split('goal')[1] );
        super.plan = await onlineSolver(Plan.domain, problem);
    }

    // async execute(){
    //     await Plan.exec(this.plan);
    // }
    
    // async replan() {
    // //     let action = new TargetMove(this.intention);
    // //    return 
    // }
}