import { believes, client, communication, hyperParams, mapConstant } from './Believes.js';
import { Pickup } from './Plans/Pickup.js';
import { Putdown } from './Plans/Putdown.js';
import {RandomMove} from './Plans/RandomMove.js'
import { TargetMove } from './Plans/TargetMove.js'
import { distance,astarDistance } from './Utility/utility.js';
import { Logger } from './Utility/Logger.js';
import { sendBelief, otherAgent } from './Communication/communication.js';
import { StandStill } from './Plans/StandStill.js';
export class Intention{
    constructor(){
        this.queue = [] //for sub intention
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
        if(communication.intentionQueue.length>0){
            Logger.logEvent(Logger.logType.COORDINATION, Logger.logLevels.INFO, `Fill the queue with the intention sent from the other agent, need to coordinate`);
            this.queue.push(...communication.intentionQueue)
            communication.intentionQueue = [] //clear the intention queue
        }

        //calculate if it is worth to deliver the parcel that i'm carrying (this is just one of the condition)
        let mustDeliver = false
        if(believes.parcels.filter(p => p.carriedBy === null).length>0){
        let highestRewardParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => 
            (b.reward - astarDistance(believes.me, b,mapConstant.graph)* believes.config.rewardDecayRatio)
            - 
            (a.reward - astarDistance(believes.me, a,mapConstant.graph)* believes.config.rewardDecayRatio)
        )[0]
    
        let distanceFromParcel = astarDistance(believes.me, highestRewardParcel,mapConstant.graph)
        let loss = believes.parcels.filter(p => p.carriedBy === believes.me.id).length * believes.config.rewardDecayRatio * distanceFromParcel
       
        //i deliver the parcels that i'm carrying  if the loss is more than the reward that i will get 
        mustDeliver = loss> highestRewardParcel.reward - believes.config.rewardDecayRatio * distanceFromParcel
        }
        if (this.queue.length > 0) {
            console.group()
            let intention = this.queue.shift()
            Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Executing from queue: ${intention.planType}`);
            if (this.queue.length==0) //restart the original intention
                intention.stop = false
            return intention; //return and remove the first intention in the queue
        }
        else if ( believes.parcels.filter(p => p.carriedBy === believes.me.id).length >=hyperParams.max_carryingParcels || //if i'm carrying too many parcels, deliver first
                mustDeliver || //if the loss is more than the reward that i will get (from any parcel), i deliver the parcel that i'm carrying first
            ( 
            believes.parcels.some(p => p.carriedBy === believes.me.id) // if i have some package i may want to deliver
            && believes.parcels.filter(p => p.carriedBy === null && astarDistance(believes.me, p,mapConstant.graph)<hyperParams.radius_distance).length==0 //if there are no package near me i deliver, otherwise i pick up
            && believes.deliveryPoints.length > 0) //if there are no non blocked delivery points, i won't deliver for now, i could also reinstate the blocked delivery points, but if the reinstated delivery point is blocked again i would have a loop and basically do nothing ( so we need to wait the blacklist of the delivery points), so if there are no delivery point avbailable is better to pick other packet
        ) { 
            let nearestDelivery = believes.deliveryPoints.sort((a, b) => astarDistance(believes.me, a,mapConstant.graph) - astarDistance(believes.me, b,mapConstant.graph))[0]
            Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Deliver parcel to ${nearestDelivery.x}, ${nearestDelivery.y}`);
            console.group()
            return new Putdown({ target: nearestDelivery },false,false);
        } else if (believes.parcels.filter(p => p.carriedBy === null && p.carriedBy != believes.me.id && !this.isFriendlyFire(p)).length !== 0) { // if there are parcels which are not carried by anyone and that are not the intention of the other agent
            let crowdness = 0
            let bestParcel = []
            //calculate the crowdness
            believes.agentsPosition.forEach((agent) => {   // TODO will exclude the friends from the crowdness
                //hyperParams.radius_distance*believes.config.MOVEMENT_DURATION
                // the unseen paramter is updated for every step, 
                console.log(agent)
                // so we want to check the currently seen agent and the angent that we havent seen not to long ago (they may still be nearby)
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
                bestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => (astarDistance(believes.me, a,mapConstant.graph))- (astarDistance(believes.me, b,mapConstant.graph)))[0]
            }
            else{
                // if there is no reward decay and no variance, i want to pick up the parcel that is the nearest
                if(believes.config.PARCEL_DECADING_INTERVAL=="infinite" && believes.config.PARCEL_REWARD_VARIANCE==0 ){
                    intentionReason =  `No reward decay and no variance, pick up the parcel that is the nearest parcel`
                    bestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => (astarDistance(believes.me, a,mapConstant.graph))- (astarDistance(believes.me, b,mapConstant.graph)))[0]
                }
                else if(believes.config.PARCEL_DECADING_INTERVAL=="infinite" ){  //in there is no reward decay, i want to pick up the parcel with the highest reward without considering the distance
                    intentionReason =  `No reward decay, pick up the parcel with the highest reward`
                    bestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) =>b.reward-a.reward)[0]
                }
                else{  // otherwise (not crowded with reward decay) i want to pick up the parcel with the highest reward when reaching that parcel
                    intentionReason = `pick up the parcel with the highest reward when reaching that parcel`
                    bestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => 
                        (b.reward - astarDistance(believes.me, b,mapConstant.graph)* believes.config.rewardDecayRatio)
                        - 
                        (a.reward - astarDistance(believes.me, a,mapConstant.graph)* believes.config.rewardDecayRatio)
                    )[0]
                }
                if(!reasonable && crowdness > hyperParams.crowdedThreshold  ) // if im not reasonable, wish me luck
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
            return new Pickup({ target: bestParcel },false,false)
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
                    Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Exploring to ${target.x}, ${target.y}`);
                    console.group();
                    return new TargetMove({ target: { x: target.x, y: target.y } },false,false);
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
                    Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO, `Exploring to ${target.x}, ${target.y}`);
                    console.group();
                    return new TargetMove({ target: { x: target.x, y: target.y } },false,false);
                }
            }        
            console.log("NON VA BENE")
            return new RandomMove();
        }
    }

    async revise(intention){
        //if there is a coordination going on, i dont' want my intention to be revised. no need for distraction
        if(!intention.belongsToCoordination){
            if(intention instanceof Pickup)
                this.revisePickUp(intention)
            else if(intention instanceof Putdown)
                this.revisePutDown(intention)
            else if(intention instanceof TargetMove)
                this.reviseTargetMove(intention)
        }
        else{
            Logger.logEvent(Logger.logType.COORDINATION, Logger.logLevels.INFO,'Coordination, needs to be concetrated! No revise for pickup putdown and target move')
        }
        if(intention instanceof StandStill)
            this.reviseStandStill(intention)
    }
    
    async revisePickUp(plan){
        const {intention} = plan     
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise pick up')
        while ( !plan.stop ) {
            //if have some communication for coordination it means that we need to stop and
            if(communication.intentionQueue.length>0)
                plan.stop = true
            //if i can't sense the parcel and that parcel is within my view, it mean that is gone or someone took it, so stop, but if it is outside of my view the parcel may still be there
            if (!believes.parcels.some(p=>(p.id==intention.target.id)) && 
            astarDistance(intention.target,believes.me,mapConstant.graph)<believes.config.PARCELS_OBSERVATION_DISTANCE-1){ //this solve the problem of the parcel that is outside of the view once i have the intention to pick it
                plan.stop = true
            }

            //filter the parcel that are one block away from me and that are not the parcel that i'm trying to pick up and my plan (the packet that im trying to pick) is still far away (2 is one block away and pick up)

            let parcelsOnTheWay = believes.parcels.filter(p => p.carriedBy === null && p.id!== intention.target.id && astarDistance(believes.me, p,mapConstant.graph)<2 && plan.plan.length-plan.index>2)
            
            parcelsOnTheWay = parcelsOnTheWay.filter(p1=>!this.queue.some(p=>p.intention.target.id===p1.id)) //if the parcel is already in the queue 
            if(parcelsOnTheWay.length>0 ){ //if there are parcerls very near during my path i also want to pick them up
                plan.stop = true
                if(this.queue.length==0){//since i still want to achieve this, but after picking up the parcel that is on the way
                    this.queue.push(plan)
                } 
                    
                this.queue.unshift(new Pickup({target: parcelsOnTheWay[0]},false,false))
            }

            let deliveryOnPath = believes.deliveryPoints.filter(p => astarDistance(believes.me, p,mapConstant.graph)<2)
            let carryingSomeParcel = believes.parcels.filter(p => p.carriedBy === believes.me.id)
            //if i'm carrying some parcel and there is a delivery point on my path, i want to deliver those parcels first
            if(deliveryOnPath.length>0 && carryingSomeParcel.length>0){ 
                plan.stop = true
                if(this.queue.length==0){//since i still want to achieve this, but af
                    this.queue.push(plan)
                } 
                console.log("DELIVERY ON PATH")
                let nearestDeliveryPoint = deliveryOnPath.sort((a, b) => astarDistance(believes.me, a,mapConstant.graph) - astarDistance(believes.me, b,mapConstant.graph))[0]
                this.queue.unshift(new Putdown({target: nearestDeliveryPoint},false,false))

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
        
            if (believes.parcels.filter(p => p.carriedBy === believes.me.id).length < hyperParams.max_carryingParcels && //allowed to stop the putdown if i'm carrying too many parcels
                 believes.parcels.filter(p => p.carriedBy === null &&
                 astarDistance(believes.me, p,mapConstant.graph)<hyperParams.radius_distance).length!=0 && 
                 plan.plan.length-plan.index>hyperParams.radius_distance) //if a parcel is near me when i try to deliver i want to pick that parcel 
                plan.stop = true
            
            await new Promise( res => setImmediate( res ) );
        }
        //it means that my friend is blocking me, and we need to coordinates somehow
        if(plan.needCoordination ){
            let agent = believes.agentsPosition.get(otherAgent.id);
            let availableDirections = [[0,-1],[0,1],[1,0],[-1,0]];//the direction that my friend can move
            let [_,x,y] = plan.coordinationInformation.obstacle.split("_");
            this.queue.push(new StandStill({ target: {x:x,y:y} },false,true))//da cambiare coordinate anche s enon usato
            Logger.logEvent(Logger.logType.COORDINATION, Logger.logLevels.INFO,`STARTING COORDINATION WITH AGENT ${otherAgent.id}`);
            for (let i = 0; i < availableDirections.length; i++) {  
                let new_x = parseInt(agent.x) + availableDirections[i][0];
                let new_y = parseInt(agent.y) + availableDirections[i][1];
                if(mapConstant.map[new_x][new_y] != 0 && (new_x!=believes.me.x || new_y!=believes.me.y)){
                    Logger.logEvent(Logger.logType.COORDINATION, Logger.logLevels.INFO,`Found where ${otherAgent.id} can move: ${new_x},${new_y}`);
                    //i start filling the other agent's (B) coordination queue
                    /*
                    1) he (B) will need to move away and stand still
                    2) this agent (A) will need to put down the parcel in the position where B was from
                    3) this agent (A) will need to move back to the position where he was and stand still
                    4) so B will need to pick up the parcel and and notify A that he can finally move
                    */
                    let reply = await client.say(otherAgent.id, {
                        type: "coordination",
                        senderId: client.id,
                        content: JSON.stringify([
                            {
                                type: "targetMove",
                                target: { x: new_x, y: new_y },
                                notifyToAwake:true,
                                belongsToCoordination:true
                            },{
                                type:"standStill",
                                target: { x: new_x, y:new_y  },
                                belongsToCoordination:true
                            },{
                                type: "pickup",
                                target: { x: x, y: y },
                                belongsToCoordination:true
                                
                            },
                            {
                                type: "putdown",
                                target: { x: plan.target.x, y: plan.target.y },
                                notifyToAwake:true,
                                belongsToCoordination:true
                            }


                        ])
                    });
                    Logger.logEvent(Logger.logType.COORDINATION, Logger.logLevels.INFO,`Coordination message sent to agent ${otherAgent.id} with reply: ${reply}`);
                    Logger.logEvent(Logger.logType.COORDINATION, Logger.logLevels.INFO,`Setting my coordination plan`);


                    // i want to put down the parcel in the new position, where my friend has moved, and then move back so he can pick up the parcel
                    
                    this.queue.push(new Putdown({ target: {x:x,y:y} },false,true)) 
                    this.queue.push(new TargetMove({ target: { x: believes.me.x, y: believes.me.y } },true,true))
                    this.queue.push(new StandStill({ target: {x:x,y:y} },false,false))//da cambiare coordinate anche s enon usato

                    break;
                }
            }
        }
    }

    async reviseTargetMove(plan){
        const {intention} = plan
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise target move')
        while ( !plan.stop ) {
            //if have some communication for coordination it means that we need to stop and
            if(communication.intentionQueue.length>0)
                plan.stop = true
            //if i sense some parcel (that is not already carried by anyone), instead of exploring i want to pick that parcel 
            //(the carried by null condition needed only when no delivery point is available, because the agent keep sensing his packet and stop the target move, but we don't want that)
            if (believes.parcels.filter(p => p.carriedBy == null).length>0){ 
                plan.stop = true
            } 
            await new Promise( res => setImmediate( res ) );
        }
    }
    async reviseStandStill(plan){
        const {intention} = plan
        Logger.logEvent(Logger.logType.INTENTION, Logger.logLevels.INFO,'Starting to revise stand still')
        while ( !plan.stop ) {
            if(communication.shouldTheAgentAwake){
                plan.stop = true //the agent need to awake
                communication.shouldTheAgentAwake = false
            }
            await new Promise( res => setImmediate( res ) );
        }
    }
}

