import {RandomMove} from './Plans/RandomMove.js'
import { TargetMove } from './Plans/TargetMove.js'

export class Intention{
    generateAndFilterOptions(){
        //still need to filter from beleives generate option and filter the best option to execute
        //return new RandomMove()
        return new TargetMove({target:{x:1,y:1}})
    }
}

