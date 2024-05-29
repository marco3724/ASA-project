import { TargetMove } from "./TargetMove.js";
import { client } from "../Believes.js";
import fs from 'fs';
import { Plan } from "./Plan.js";
import { onlineSolver, PddlProblem } from "@unitn-asa/pddl-client";
import { mapConstant, believes } from "../Believes.js";

function readFile ( path ) {
    
    return new Promise( (res, rej) => {

        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })

    })

}

export class Putdown {
    constructor(intention) {
        this.intention = intention;
    }

    async execute() {
        // let action = new TargetMove(this.intention);
        // console.log('Putdown');
        // await action.execute();
        // await client.putdown();

        console.log("putdown intention", this.intention);

        let domain = await readFile('./domain.pddl');
        let deliveryTile = `t_${this.intention.target.x}_${this.intention.target.y}`;
        let pddlProblem = new PddlProblem(
            'putdown',
            mapConstant.pddlMapObjects + 'parcel1 ' + 'agent1',
            mapConstant.pddlTiles +
            mapConstant.pddlNeighbors +
            mapConstant.pddlDeliveryPoints +
            `(at agent1 t_${believes.me.x}_${believes.me.y}) ` +
            `(agent agent1) ` +
            `(me agent1) ` +
            `(carrying agent1 parcel1) ` +
            `(parcel parcel1) `,
            `and (at agent1 ${deliveryTile}) (not (carrying agent1 parcel1))`
        );

        let problem = pddlProblem.toPddlString();
        console.log(problem.split('goal')[1]);
        var plan = await onlineSolver(domain, problem);
        console.log(plan);
        await Plan.pddlExecutor.exec(plan);
    }
}