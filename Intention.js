import { believes } from './Believes.js';
import { Pickup } from './Plans/Pickup.js';
import { Putdown } from './Plans/Putdown.js';
import {RandomMove} from './Plans/RandomMove.js'
import { TargetMove } from './Plans/TargetMove.js'
import { distance } from './Utility/utility.js';

export class Intention{
    generateAndFilterOptions(){
        if(believes.parcels.some(p=>p.carriedBy==believes.me.id)){ //if i am carrying some parcel i want to deliver
            let nearestDelivery = believes.deliveryPoints.sort((a,b)=>distance(believes.me,a)-distance(believes.me,b))[0]
            return new Putdown({target:nearestDelivery});
        } else if(believes.parcels.filter(p =>p.carriedBy === null).length!==0){ //if there are parcel that are not picked by anyone i want to  pick
            let nearestParcel = believes.parcels.filter(p =>p.carriedBy != believes.me.id).sort((a,b)=>distance(believes.me,a)-distance(believes.me,b))[0]
            return new Pickup({target:nearestParcel})
        }
        return new RandomMove() //is there is no action available i will move randomly
        
    }
    //do the revision for everyplan TODO
    // revisePlan(){
    //     this.plan = this.generateAndFilterOptions()
    // }
}

