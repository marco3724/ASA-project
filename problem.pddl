(define (problem grid-navigation)
    (:domain default)
    
    ;; Define the objects: tiles, agent, and parcels
    (:objects 
        tile1 tile2 tile3 tile4 tile5 tile6 tile7 tile8 tile9  ;; tiles
        agent1                                                   ;; agent
        parcel1                                                  ;; parcel
    )

    ;; Define the initial state
    (:init 
        (tile tile1) (tile tile2) (tile tile3) (tile tile4) (tile tile5)
        (tile tile6) (tile tile7) (tile tile8) (tile tile9)
        (agent agent1)
        (parcel parcel1)
        (me agent1)
        (at agent1 tile1)
        (at parcel1 tile5)
        
        ;; Define tile adjacency
        (right tile1 tile2) (right tile2 tile3)
        (right tile4 tile5) (right tile5 tile6)
        (right tile7 tile8) (right tile8 tile9)
        (left tile2 tile1) (left tile3 tile2)
        (left tile5 tile4) (left tile6 tile5)
        (left tile8 tile7) (left tile9 tile8)
        (up tile4 tile1) (up tile5 tile2) (up tile6 tile3)
        (up tile7 tile4) (up tile8 tile5) (up tile9 tile6)
        (down tile1 tile4) (down tile2 tile5) (down tile3 tile6)
        (down tile4 tile7) (down tile5 tile8) (down tile6 tile9)
    )

    ;; Define the goal state
    (:goal 
        (and 
            (at agent1 tile5)       ;; agent1 should reach tile5
            (carrying agent1 parcel1) ;; agent1 should be carrying parcel1
        )
    )
)
