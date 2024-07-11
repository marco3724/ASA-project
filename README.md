# Deliveroo auotnomous agent

## Authors

- [@Marco Wang](https://github.com/marco3724)
- [@Cristian Murtas](https://github.com/SecondarySkyler)

## Description

Project for the course of Autonomous software agent 23/24.

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
│   ├── StandStill.js          # Wait other agent signale
|
├── Utility/
│   ├── Astar.js               # A star algorithm for path finding
│   ├── Logger.js              # Centralized logger system
│   ├── utility.js             # General Utility functions
|
├── Agent.js                   # Entry point of the agent
├── Intention.js               # Logic for intention generation and revision
├── Belives.js                 # All the beliefs of our agent
├── package.json               # Project dependencies
├── .gitignore                 # Files to be ignored by Git
└── README.md                  # Project documentation
```
