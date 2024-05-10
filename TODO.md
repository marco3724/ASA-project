# Enhancements
- find the right tradeoff between distance and reward parcels[0].distance < radius_distance. This enhancement should be revised for both cases (carrying or not carrying), in the case we already have a packet we want to be less greedy, meanwhile, without packet we should be more aggressive <br >
Need more reasoning for the condition such as other agents, maybe also the distance, for instance if there are othere near agent from the parcels and i already have a packet i won't go for it, since i might loose time and parcels drop in reward.
- calculate the 3 (n) nearest delivery point, and use the astar to find the real distance.

# Bugs
- Failed movements
    -      