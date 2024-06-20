
import { believes,mapConstant,client } from '../Believes.js'

export class RandomMove{

    async generatePlan(){
        console.log("RandomMove")
    }

    async execute(){
        let {map, mapX, mapY} = mapConstant;
        let previousDirection = believes.me.previousDirection
        let dir = []
        if(map){
            if(Math.ceil(believes.me.y)<mapY-1 && map[believes.me.x][believes.me.y+1]==1 && previousDirection !== 'down')
                dir.push('up')
            if(Math.floor(believes.me.y)>0 && map[believes.me.x][believes.me.y-1]==1 && previousDirection !== 'up')
                dir.push('down')
            if(Math.floor(believes.me.x)>0 && map[believes.me.x-1][believes.me.y]==1 && previousDirection !== 'right')
                dir.push('left')
            if(Math.ceil(believes.me.x)<mapX-1 && map[believes.me.x+1][believes.me.y]==1 && previousDirection !== 'left')
                dir.push('right')
            if(dir.length==0){
                if(Math.ceil(believes.me.y)<mapY-1 && map[believes.me.x][believes.me.y+1]==1 )
                    dir.push('up')
                if(Math.floor(believes.me.y)>0 && map[believes.me.x][believes.me.y-1]==1 )
                    dir.push('down')
                if(Math.floor(believes.me.x)>0 && map[believes.me.x-1][believes.me.y]==1)
                    dir.push('left')
                if(Math.ceil(believes.me.x)<mapX-1 && map[believes.me.x+1][believes.me.y]==1)
                    dir.push('right')
            }
        }
     else{
        dir = ['up','down','left','right']
     }
     console.log("DIRECTIONS: ",dir)
     let direction = dir[Math.floor(Math.random()*dir.length)]
     let status = await client.move(direction)
     if(!status){
        console.log("failed blind move")
    }else{
        believes.me.previousDirection = direction
        believes.me.x = Math.floor( status.x)
        believes.me.y = Math.floor(status.y)
    }
    }
}