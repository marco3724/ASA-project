import { TargetMove } from "./TargetMove.js";
import { believes, client } from "../Believes.js";
import fs from 'fs';
import { Plan } from "./Plan.js";
import { onlineSolver } from "@unitn-asa/pddl-client";    
function readFile ( path ) {
    
    return new Promise( (res, rej) => {

        fs.readFile( path, 'utf8', (err, data) => {
            if (err) rej(err)
            else res(data)
        })

    })

}
export class Pickup{
    constructor(intention) {
        this.intention = intention;
    }

    async execute() {
        // let action = new TargetMove(this.intention);
        // console.log('Pickup');
        // await client.pickup(); TODO Domani generation ad refactor
        let domain = await readFile('./domain.pddl' );
        let problem = await readFile('./problem.pddl' ); //needs to be generated
        //console.log( problem );
        var plan = await onlineSolver(domain, problem);
        //console.log( plan );
        Plan.pddlExecutor.exec( plan );
    }
    // async replan() {
    // //     let action = new TargetMove(this.intention);
    // //    return 
    // }
}