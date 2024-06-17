import { believes } from './Believes.js';
import { Pickup } from './Plans/Pickup.js';
import { Putdown } from './Plans/Putdown.js';
import {RandomMove} from './Plans/RandomMove.js'
import { TargetMove } from './Plans/TargetMove.js'
import { distance } from './Utility/utility.js';

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

        if (believes.parcels.some(p => p.carriedBy === believes.me.id)) {
            let nearestDelivery = believes.deliveryPoints.sort((a, b) => distance(believes.me, a) - distance(believes.me, b))[0]
            return new Putdown({ target: nearestDelivery });
        } else if (believes.parcels.filter(p => p.carriedBy === null && p.carriedBy != believes.me.id).length !== 0) {
            let nearestParcel = believes.parcels.filter(p => p.carriedBy === null).sort((a, b) => distance(believes.me, a) - distance(believes.me, b))[0]
            return new Pickup({ target: nearestParcel })
        } else {
            /**
             * Here im thinking that probably using a Map is not a good idea.
             * "algorithmically" speaking, probably it would be better to use 
             * some kind of fancy binary tree.
             * 
             * Also what happens if the heatmap is not ready yet?
             */
            // sort the heatmap
            if (believes.heatmap.size > 0) {
                let sortedHeatmap = new Map([...believes.heatmap.entries()].sort((a, b) => b[1].prob - a[1].prob));
                let firstValue = sortedHeatmap.values().next().value;
                return new TargetMove({ target: {x: firstValue.x, y: firstValue.y} });
            }
            return new RandomMove();
        }
        
    }
    //do the revision for everyplan TODO
    // revisePlan(){
    //     this.plan = this.generateAndFilterOptions()
    // }
}

