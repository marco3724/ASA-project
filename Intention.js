import { believes, hyperParams } from './Believes.js';
import { Pickup } from './Plans/Pickup.js';
import { Putdown } from './Plans/Putdown.js';
import {RandomMove} from './Plans/RandomMove.js'
import { TargetMove } from './Plans/TargetMove.js'
import { distance } from './Utility/utility.js';
import { Logger } from './Utility/Logger.js';
export class Intention{
    generateAndFilterOptions(){
        // if(believes.parcels.some(p=>p.carriedBy==believes.me.id)){ //if i am carrying some parcel i want to deliver
        //     let nearestDelivery = believes.deliveryPoints.sort((a,b)=>distance(believes.me,a)-distance(believes.me,b))[0]
        //     return new Putdown({target:nearestDelivery});
        // } else 
        // if(believes.parcels.filter(p =>p.carriedBy === null && p.carriedBy != believes.me.id).length !== 0){ //if there are parcel that are not picked by anyone i want to  pick
        //     let nearestParcel = believes.parcels.filter(p =>p.carriedBy != believes.me.id).sort((a,b)=>distance(believes.me,a)-distance(believes.me,b))[0]
        //     return new Pickup({target:nearestParcel})
        // }
        // return new RandomMove() //is there is no action available i will move randomly
        console.groupEnd()
        if (believes.parcels.some(p => p.carriedBy === believes.me.id) // if i have some package i may want to deliver
            && believes.parcels.filter(p => p.carriedBy === null && distance(believes.me, p)<hyperParams.radius_distance).length==0) { //if there are no package near me i deliver, other i pick up
            let nearestDelivery = believes.deliveryPoints.sort((a, b) => distance(believes.me, a) - distance(believes.me, b))[0]
            Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Deliver parcel to ${nearestDelivery.x}, ${nearestDelivery.y}`);
            console.group()
            return new Putdown({ target: nearestDelivery });
        } else if (believes.parcels.filter(p => p.carriedBy === null && p.carriedBy != believes.me.id).length !== 0) {
            let nearestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => distance(believes.me, a) - distance(believes.me, b))[0]
            Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Pick up parcel from ${nearestParcel.x}, ${nearestParcel.y}`);
            console.group()
            return new Pickup({ target: nearestParcel })
        } else {
            /**
             * Here im thinking that probably using a Map is not a good idea.
             * "algorithmically" speaking, probably it would be better to use 
             * some kind of fancy binary tree.
             * 
             * Also what happens if the heatmap is not ready yet?
             */
            if (believes.heatmap.size > 0) {
                let prob = Math.floor(Math.random() * 100);
                if (prob <= 5) {
                    Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Exploring randomly`);
                    let keys = Array.from(believes.heatmap.keys());
                    let randomKey = keys[Math.floor(Math.random() * keys.length)];
                    let target = believes.heatmap.get(randomKey);
                    return new TargetMove({ target: { x: target.x, y: target.y } });
                } else {
                    let sortedHeatmap = new Map([...believes.heatmap.entries()].sort((a, b) => b[1].prob - a[1].prob));
                
                    let possibleTargets = []
                    let it = sortedHeatmap.values();
                    for (let i = 0; i < 3; i++) {
                        possibleTargets.push(it.next().value);
                    }
    
                    let random = Math.floor(Math.random() * possibleTargets.length);
                    let target = possibleTargets[random];
                    Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Exploring to ${target.x}, ${target.y}`);
                    console.group();
                    return new TargetMove({ target: { x: target.x, y: target.y } });
                }
            }
            return new RandomMove();
        }
        
    }
    async revise(plan){
        if(plan instanceof Pickup)
            this.revisePickUp(plan)
        else if(plan instanceof Putdown)
            this.revisePutDown(plan)
        else if(plan instanceof TargetMove)
            this.reviseTargetMove(plan)
    }
    //do the revision for everyplan TODO
    async revisePickUp(plan){
        const {intention} = plan
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise pick up')
        while ( !plan.stop ) {
            if (!believes.parcels.some(p=>(p.id==intention.target.id))){ //if the parcel is not there anymore
                plan.stop = true
            }
            await new Promise( res => setImmediate( res ) );
        }  
    }
    async revisePutDown(plan){
        const {intention} = plan
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise put down')
        while ( !plan.stop ) {
            if (!believes.parcels.some(p=>p.carriedBy==believes.me.id)) //if i'm not carrying any parcel anymore
                plan.stop = true
        
            if (believes.parcels.filter(p => p.carriedBy === null && distance(believes.me, p)<hyperParams.radius_distance).length!=0) //if a parcel is near me when i try to deliver i want to pick that parcel
                plan.stop = true
            
            await new Promise( res => setImmediate( res ) );
        }
    }
    async reviseTargetMove(plan){
        const {intention} = plan
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise target move')
        while ( !plan.stop ) {
            if (believes.parcels.length>0){ //if i sense some parcel, instead of exploring i want to pick that parcel
                plan.stop = true
            }
            await new Promise( res => setImmediate( res ) );
        }
    }
}

