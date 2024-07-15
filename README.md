# Deliveroo autonomous agent (23/24)

The objective of the project was to develop an autonomous software able to play the Deliveroo game on our behalf. The goal of the game is to pick up the parcels and bring them to a delivery zone to gain points. We structured our agent following the BDI architecture. The BDI gives an approach to designing systems that operate in an autonomous way, making decisions by sensing and interacting with the environment. Also, the agent is able to continuously revise and replan its intention to choose the best
option accordingly to the circumstances. A multi-agent version has been developed as well.

## Authors

- [@Marco Wang](https://github.com/marco3724)
- [@Cristian Murtas](https://github.com/SecondarySkyler)

## Repository Structure

```
ASA-project/
├── Communication/
│   ├── communication.js       # Handle sending and receiving message from other agent
|
├── Plans/
│   ├── Pickup.js              # Handle pickup problem generation and replanning
│   ├── Plan.js                # General Plan execution (parent class)
│   ├── Putdown.js             # Handle Putdown problem generation and replanning
│   ├── TargetMove.js          # Handle an arbitrary movement problem generation and replanning
│   ├── StandStill.js          # Wait other agent signal
|
├── Utility/
│   ├── Astar.js               # A star algorithm for path finding
│   ├── Logger.js              # Centralized logger system
│   ├── utility.js             # General Utility functions
|
├── Agent.js                   # Entry point of the agent
├── Intention.js               # Logic for intention generation and revision
├── Believes.js                 # All the beliefs of our agent
├── package.json               # Project dependencies
├── .gitignore                 # Files to be ignored by Git
└── README.md                  # Project documentation
```

### Install

```
git clone git@github.com:marco3724/ASA-project.git  # clone the repo
cd ASA-project                                      # change the current directory
npm install                                         # install the dependecies
```

### Config

Modify the parameter of the Believes.js to fit your specific requirements, such as the host of the Deliveroo.js game, or the token of the agent.

### Run

run the agent with the online PDDL planner

```
node Agent.js
```

run the agent with the A\* offline planner

```
node Agent.js -o
```
