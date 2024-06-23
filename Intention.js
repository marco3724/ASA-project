import { believes, hyperParams, mapConstant } from './Believes.js';
import { Pickup } from './Plans/Pickup.js';
import { Putdown } from './Plans/Putdown.js';
import {RandomMove} from './Plans/RandomMove.js'
import { TargetMove } from './Plans/TargetMove.js'
import { distance,isParcelOnPath } from './Utility/utility.js';
import { Logger } from './Utility/Logger.js';
export class Intention{
    generateAndFilterOptions(){
        console.groupEnd()
        Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.INFO, `Parcels: ${JSON.stringify(believes.parcels)}`);
        if (believes.parcels.some(p => p.carriedBy === believes.me.id) // if i have some package i may want to deliver
            && believes.parcels.filter(p => p.carriedBy === null && distance(believes.me, p)<hyperParams.radius_distance).length==0 //if there are no package near me i deliver, otherwise i pick up
            && believes.deliveryPoints.length > 0 //if there are no non blocked delivery points, i won't deliver for now, i could also reinstate the blocked delivery points, but if the reinstated delivery point is blocked again i would have a loop and basically do nothing ( so we need to wait the blacklist of the delivery points), so if there are no delivery point avbailable is better to pick other packet
        ) { 
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
    
    async revisePickUp(plan){
        const {intention} = plan
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise pick up')
        while ( !plan.stop ) {
            //if i can't sense the parcel and that parcel is within my view, it mean that is gone or someone took it, so stop, but if it is outside of my view the parcel may still be there
            if (!believes.parcels.some(p=>(p.id==intention.target.id)) && 
            distance(intention.target,believes.me)<believes.config.PARCELS_OBSERVATION_DISTANCE-1){ //this solve the problem of the parcel that is outside of the view once i have the intention to pick it
                plan.stop = true
            }
            // if(believes.parcels.filter(p => p.carriedBy === null && p.id!== intention.target.id && distance(believes.me, p)<distance(believes.me,intention.target)).length>0) //if a parcel is nearer than the one i'm trying to pick up, i want to pick that parcel
            //     plan.stop = true
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
            //if i sense some parcel (that is not already carried by anyone), instead of exploring i want to pick that parcel 
            //(the carried by null condition needed only when no delivery point is aviailable, because the agent keep sensing his packet and stop the target move, but we don't want that)
            if (believes.parcels.filter(p => p.carriedBy == null).length>0){ 
                plan.stop = true
            }
            await new Promise( res => setImmediate( res ) );
        }
    }
}

