import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
import * as astar from "./astar.js";
// console.log(astar);

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJiOTRiYjFmNzc5IiwibmFtZSI6ImNhdGFycm8iLCJpYXQiOjE3MTM5NjU0NTR9.yond1PecxeP-PDvBacprld-vfNKcI7w0V65RJ8guhcw'
)

function calc_distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}

const directions = ['right', 'down', 'left', 'up'];
const parcels = new Map();
const me = {}
let mapX = 0;
let mapY = 0;
let map = [];
let graph;
let delivery_areas = []

client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = Math.round(x)
    me.y = Math.round(y)
    me.score = score
} )

client.onMap((width, height, tiles) => {
    mapX = width;
    mapY = height;
    map = new Array(mapX).fill(0).map( () => new Array(mapY).fill(0));

    tiles.forEach((tile) => {
        map[tile.x][tile.y] = tile.delivery ? 2 : 1;
        if (tile.delivery) {
            delivery_areas.push([tile.x, tile.y]);
        }
    });
    graph = new astar.Graph(map);
    console.log(graph.toString())

});

client.onParcelsSensing( async (received_parcels) => {
    for (const parcel of received_parcels) {
        if (parcels.has(parcel.id)) {
            continue;
        }
        parcels.set(parcel.id, parcel);
    }
    await new Promise(resolve => setImmediate(resolve));
})


function nearestParcel() {
    let min = Number.MAX_VALUE;
    let nearest = null;
    for (const parcel of parcels.values()) {
        const distance = calc_distance(me, parcel);
        if (distance < min) {
            min = distance;
            nearest = parcel;
        }
    }
    return nearest;
}

function nearestDeliveryArea() {
    let min = Number.MAX_VALUE;
    let nearest = null;
    for (const area of delivery_areas) {
        const distance = calc_distance(me, {x: area[0], y: area[1]});
        if (distance < min) {
            min = distance;
            nearest = area;
        }
    }
    return nearest;
}

async function moveTowards(path) {
    path.forEach(async (node) => {
        const direction = node.movement;
        console.log("Moving ", direction)
        await client.move(direction);
    });
}

async function moveAndDrop() {
    let nearest_delivery_area = nearestDeliveryArea();
    console.log("Found delivery area at: ", nearest_delivery_area[0], nearest_delivery_area[1]);
    let current_pos = graph.grid[me.x][me.y];
    let delivery_node = graph.grid[nearest_delivery_area[0]][nearest_delivery_area[1]];
    let delivery_path = astar.astar.search(graph, current_pos, delivery_node, {diagonal: false});
    await moveTowards(delivery_path);
    await client.putdown();
}

async function loop() {
    while (true) {
        if (parcels.size === 0) {
            await client.move(directions[Math.floor(Math.random() * 4)]);
        } else {
            let current_pos = graph.grid[me.x][me.y];
            let parcel = nearestParcel();
            console.log("Found parcel at: ", parcel.x, parcel.y);
            let parcel_node = graph.grid[parcel.x][parcel.y];
            let result = astar.astar.search(graph, current_pos, parcel_node, {diagonal: false});
            await moveTowards(result);
            await client.pickup();
            await moveAndDrop();
            parcels.delete(parcel.id);
        }
        await new Promise( res => setImmediate( res ) );
    }
}

loop();


