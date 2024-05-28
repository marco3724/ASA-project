import {PddlExecutor } from "@unitn-asa/pddl-client";   
import { client } from '../Believes.js';

export class Plan{
    static pddlExecutor = new PddlExecutor( 
        { name: 'MOVE-UP',   executor: async  (l)=> await client.move("up") },
        { name: 'MOVE-DOWN',  executor: async  (l)=> await client.move("down")  },
        { name: 'MOVE-RIGHT',   executor: async  (l)=> await client.move("right") },
        { name: 'MOVE-LEFT',  executor: async  (l)=> await client.move("left")  },
        { name: 'pick-up',  executor: async  (l)=> await client.pickup() },
        { name: 'put-down',  executor: async  (l)=> await client.putdown() }
    );
    //stati domain file generate there TODO domain generation non asyncrhonous but using the prof wrapper
    
}