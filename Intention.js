import { believes, hyperParams } from './Believes.js';
import { Pickup } from './Plans/Pickup.js';
import { Putdown } from './Plans/Putdown.js';
import {RandomMove} from './Plans/RandomMove.js'
import { TargetMove } from './Plans/TargetMove.js'
import { distance } from './Utility/utility.js';
import { Logger } from './Utility/Logger.js';
export class Intention{
    generateAndFilterOptions(){
        console.groupEnd()
        Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.INFO, `Parcels: ${JSON.stringify(believes.parcels)}`);
        if (believes.parcels.some(p => p.carriedBy === believes.me.id) // if i have some package i may want to deliver
            && believes.parcels.filter(p => p.carriedBy === null && distance(believes.me, p)<hyperParams.radius_distance).length==0) { //if there are no package near me i deliver, other i pick up
            let nearestDelivery = believes.deliveryPoints.sort((a, b) => distance(believes.me, a) - distance(believes.me, b))[0]
            Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Deliver parcel to ${nearestDelivery.x}, ${nearestDelivery.y}`);
            console.group()
            return new Putdown({ target: nearestDelivery });
        } else if (believes.parcels.filter(p => p.carriedBy === null && p.carriedBy != believes.me.id).length !== 0) { // if there are parcels which are not carried by anyone
            // Select the parcel which is nearest to me
            let nearestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => distance(believes.me, a) - distance(believes.me, b))[0]
            /**
             * A possible improvement could be to select the parcel
             * which is deliverable
             * By deliverable I mean that the parcel should have enough reward to be worth
             * to be delivered (i.e. it doesnt make sense to go pick up a parcel which will dissapear before reaching the delivery point)
             */
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
                    Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.INFO, `Sorted heatmap: ${JSON.stringify([...sortedHeatmap.entries()].slice(0, 5))}`);
                    let possibleTargets = []
                    const it = sortedHeatmap.values();
                    let val = it.next();
                    let maxCounter = val.value.prob;
                    let excededThreshold = false;
                    while (!val.done) {
                        if (val.value.prob >= (maxCounter - hyperParams.counterThreshold)) {
                            possibleTargets.push(val.value);
                        } else {
                            excededThreshold = true;
                        }
                        val = it.next();
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

