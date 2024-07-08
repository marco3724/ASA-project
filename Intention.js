import { believes, hyperParams, mapConstant } from './Believes.js';
import { Pickup } from './Plans/Pickup.js';
import { Putdown } from './Plans/Putdown.js';
import {RandomMove} from './Plans/RandomMove.js'
import { TargetMove } from './Plans/TargetMove.js'
import { distance } from './Utility/utility.js';
import { Logger } from './Utility/Logger.js';
import { sendBelief, otherAgent } from './Communication/communication.js';
export class Intention{
    constructor(){
        this.queue = [] //the idea is that when stopping a plan there are 2 possibility, 1 that we still want to keep that intention, 2 we dont want to for example we change a put down with a pick up, and we dont want to keet the put down because we in picky another parcel we may want to deliver in another place
    }

    /**
     * Function used to check whether the current parcel is the intention of the other agent
     * @param {*} parcel 
     */
    isFriendlyFire(parcel) {
        if (otherAgent.intention.type === "pickup") {
            if (parcel.id == otherAgent.intention.target.id) {
                return true;
            }
        } else {
            return false;
        }
    }

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
        } else if (believes.parcels.filter(p => p.carriedBy === null && p.carriedBy != believes.me.id && !this.isFriendlyFire(p)).length !== 0) { // if there are parcels which are not carried by anyone
            let crowdness = 0
            let bestParcel = []
            //calculate the crowdness
            believes.agentsPosition.forEach((agent) => {   // TODO will exclude the friends from the crowdness
                //hyperParams.radius_distance*believes.config.MOVEMENT_DURATION
                // the unseen paramter is updated for every step, 
                console.log(agent)
                // so we want to check the agent that has moved for radius distance, we need to multiply the radius distance with the movement duration (???)
                // radius distance = unseen/ movement duration value.unseen<hyperParams.radius_distance*believes.config.MOVEMENT_DURATION 
                // adding this  && distance(believes.me, agent) < hyperParams.radius_distance woul be less crwoded, we need to test TODO
                if (agent.unseen<hyperParams.radius_distance) {
                    crowdness += 1
                }
            })
            console.log(crowdness)
            let intentionReason = ""
            //if very crowded, i want to pick up the parcel with that is the nearest (need to be less pretentious)
            //but there is alway a probability that even if crwoded, i want to pick up the parcel with the highest reward
            let beingPretentious = Math.random()  //but there is alway a small probability that even if crowded, i want to pick up the parcel with the highest reward
            let reasonable = beingPretentious<hyperParams.reasonable//if i'm not enough pretentious i stay reasonable
            if (crowdness > hyperParams.crowdedThreshold && reasonable ) { 
                intentionReason =  "Crowded, pick up the nearest parcel"
                bestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => (distance(believes.me, a))- (distance(believes.me, b)))[0]
            }
            else{
                // if there is no reward decay and no variance, i want to pick up the parcel that is the nearest
                if(believes.config.PARCEL_DECADING_INTERVAL=="infinite" && believes.config.PARCEL_REWARD_VARIANCE==0 ){
                    intentionReason =  `No reward decay and no variance, pick up the parcel that is the nearest parcel`
                    bestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => (distance(believes.me, a))- (distance(believes.me, b)))[0]
                }
                else if(believes.config.PARCEL_DECADING_INTERVAL=="infinite" ){  //in there is no reward decay, i want to pick up the parcel with the highest reward without considering the distance
                    intentionReason =  `No reward decay, pick up the parcel with the highest reward`
                    bestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) =>b.reward-a.reward)[0]
                }
                else{  // otherwise (not crowded with reward decay) i want to pick up the parcel with the highest reward when reaching that parcel
                    intentionReason = `pick up the parcel with the highest reward when reaching that parcel`
                    bestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => 
                        (b.reward - distance(believes.me, b)* believes.config.rewardDecayRatio)
                        - 
                        (a.reward - distance(believes.me, a)* believes.config.rewardDecayRatio)
                    )[0]
                }
                if(!reasonable) // if im not reasonable, wish me luck
                    intentionReason = `Wish me Luck!, ${intentionReason} |${beingPretentious}`
            }


            /**
             * A possible improvement could be to select the parcel
             * which is deliverable
             * By deliverable I mean that the parcel should have enough reward to be worth
             * to be delivered (i.e. it doesnt make sense to go pick up a parcel which will dissapear before reaching the delivery point)
             */
            Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Pick up parcel from ${bestParcel.x}, ${bestParcel.y} | Reason: ${intentionReason}`);
            console.group()
            // filter the parcels removing the one chose to pick up and the one that are already carried by someone
            let parcelsToShare = believes.parcels.filter(p => p.id !== bestParcel.id && p.carriedBy === null);
            sendBelief("parcels", parcelsToShare);
            return new Pickup({ target: bestParcel })
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
                // We leave a 5% chance to explore randomly
                if (prob <= 5) {
                    Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Exploring randomly`);
                    let keys = Array.from(believes.heatmap.keys());
                    let randomKey = keys[Math.floor(Math.random() * keys.length)];
                    let target = believes.heatmap.get(randomKey);
                    return new TargetMove({ target: { x: target.x, y: target.y } });
                } else {

                    // Cumulative probability
                    const cumulativeSum = Array.from(believes.heatmap.values()).reduce((acc, obj) => {
                        const newSum = acc.sum + obj.prob;
                        acc.cumulativeArray.push(newSum);
                        acc.sum = newSum;
                        return acc;
                    }, { sum: 0, cumulativeArray: [] }).cumulativeArray;
                    // Generate a random number
                    let threshold = Math.random();
                    let target = null;
                    // Find the target, which has the probability higher than the threshold
                    for (let i = 0; i < cumulativeSum.length; i++) {
                        if (cumulativeSum[i] >= threshold) {
                            target = Array.from(believes.heatmap.values())[i];
                            break;
                        }
                    }
                    // console.log("cumulativeSum: ", cumulativeSum);
                    // console.log("threshold: ", threshold);
                    // console.log("target: ", target);

                    



                    // let sortMap = [...believes.heatmap.entries()].sort((a, b) => b[1].prob - a[1].prob);
                    // let maxDiff = sortMap[0][1].prob - sortMap[sortMap.length - 1][1].prob;
                    // let possibleTargets = []
                    /**
                     * if the difference between the highest and the lowest probability is less than the threshold
                     * then just take the 5 farthest tiles from me, and select one of them randomly
                     *  */ 
                    // if (maxDiff < hyperParams.highDensityThreshold) {
                    //     sortMap = sortMap.sort((a, b) => distance(believes.me, {x: b[1].x, y: b[1].y}) - distance(believes.me, {x: a[1].x, y: a[1].y}));
                    //     sortMap.slice(0, 5).forEach((value) => {
                    //         possibleTargets.push(value[1]);
                    //     });
                    // } else {
                    //     let sortedHeatmap = new Map(sortMap);
                    //     Logger.logEvent(Logger.logType.BELIEVES, Logger.logLevels.INFO, `Sorted heatmap: ${JSON.stringify([...sortedHeatmap.entries()].slice(0, 5))}`);
                    //     const it = sortedHeatmap.values();
                    //     let val = it.next();
                    //     let maxCounter = val.value.prob;
                    //     let excededThreshold = false;
                    //     while (!val.done) {
                    //         if (val.value.prob >= (maxCounter - hyperParams.counterThreshold)) {
                    //             possibleTargets.push(val.value);
                    //         } else {
                    //             excededThreshold = true;
                    //         }
                    //         val = it.next();
                    //     }
                    // }
                    
                    //let random = Math.floor(Math.random() * possibleTargets.length);
                    //let target = possibleTargets[random];
                    //Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Exploring to ${target.x}, ${target.y}`);
                    //console.group();
                    return new TargetMove({ target: { x: target.x, y: target.y } });
                }
            }        
            console.log("NON VA BENE")
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

            // if(believes.parcels.filter(p => {
            //         p.carriedBy === null && 
            //         p.id !== intention.target.id 
            //         && distance(believes.me, p) < distance(believes.me,intention.target)
            //         }).length > 0) {//if a parcel is nearer than the one i'm trying to pick up, i want to pick that parcel
            //     plan.stop = true
            // }
            await new Promise( res => setImmediate( res ) );
        }
    }

    async revisePutDown(plan){
        const {intention} = plan
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise put down')
        while ( !plan.stop ) {
            if (!believes.parcels.some(p=>p.carriedBy==believes.me.id)) //if i'm not carrying any parcel anymore
                plan.stop = true
        
            if (believes.parcels.filter(p => p.carriedBy === null &&
                 distance(believes.me, p)<hyperParams.radius_distance).length!=0) //if a parcel is near me when i try to deliver i want to pick that parcel
                plan.stop = true
            
            await new Promise( res => setImmediate( res ) );
        }
    }

    async reviseTargetMove(plan){
        const {intention} = plan
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise target move')
        while ( !plan.stop ) {
            //if i sense some parcel (that is not already carried by anyone), instead of exploring i want to pick that parcel 
            //(the carried by null condition needed only when no delivery point is available, because the agent keep sensing his packet and stop the target move, but we don't want that)
            if (believes.parcels.filter(p => p.carriedBy == null).length>0){ 
                plan.stop = true
            }
            await new Promise( res => setImmediate( res ) );
        }
    }
}

