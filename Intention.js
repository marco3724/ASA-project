import {RandomMove} from './Plans/RandomMove.js'

export class Intention{
    generateAndFilterOptions(){
        //still need to filter from beleives generate option and filter the best option to execute
        return new RandomMove()
    }
}
// import { mapConstant } from "./Believes.js";

// export const loggers = () => setInterval(() => {
//     let {map, mapX, mapY} = mapConstant;
//     console.log("FROM INTENTION",mapX, mapY, map);
// },1000)

//when the destructuring happen before the function since it create a new value
//destructuring the object won't show the updated value, while using the object without destructuring will show the updated value 
