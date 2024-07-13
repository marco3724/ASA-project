/* EXAMPLE BELIEVES
    parcels: [
        { id: 'p399', x: 6, y: 9, carriedBy: null, reward: 4, distance: 1 },
        { id: 'p402', x: 6, y: 7, carriedBy: null, reward: 4, distance: 3 }
    ],
    deliveryPoints: [
      { x: 1, y: 0, delivery: true, parcelSpawner: false },
      ...
      { x: 9, y: 9, delivery: true, parcelSpawner: false }
    ],
    me: { id: '72d283ee257', name: 'ciao', x: 7, y: 9, score: 0 },
    agentsPosition: Map(1) { 'a0' => { x: 8, y: 6, score: 0 } },
    config: {
      MAP_FILE: 'default_map',
      ...
      rewardDecayRatio: 0.05
    }
  
  */
import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";
export const client = new DeliverooApi(
    "http://localhost:8080/",
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjcyZDI4M2VlMjU3IiwibmFtZSI6ImNpYW8iLCJpYXQiOjE3MTUxNjA5NzF9.me_Fvg-V48fiYGQLPVJtShxX6kjNkiMAo2E2qjdXw-8'
  );
export const believes = {
  parcels: [],
  deliveryPoints: [],
  me: {
    previousDirection: '',
  },
  agentsPosition: new Map(),
  config: {},
  heatmap: new Map(), // maybe this should be somewhere else
  blackList: {
    parcels: [],
    deliveryPoints: [],// unreachable delivery points, if unreachable due to obstacle the delivery point will be remove within a certain timeout
    spawnPoints: [],// unreachable spawn points
  }

}
export const communication = {
  intentionQueue: [],
  shouldTheAgentAwake: false  
}
export const launchConfig = {
  offLineSolver: false,
}

export const mapConstant = {
  map: null,
  mapX: 0,
  mapY: 0,
  graph: null,
  parcelSpawner: [],
  pddlMapObjects: "",
  // Initialization
  pddlTiles: "",
  pddlNeighbors: "",
  pddlDeliveryPoints: "",
}

//Hyperparameter
export const hyperParams = {
  radius_distance: 5,
  min_reward: 15,
  crowdedThreshold: 1,
  retry:{
    min_retry: 50,
    max_retry: 100,
  },
  blackList: {
    max_timeout: 1000,
    min_timeout: 500,
  },
  max_carryingParcels:100,
  reasonable: 0.9,
  randomMoveChance: 5,
}
