- **Denormalization:** Models are flattened as much as possible to improve query speed and readability for non-technical users.
    
    To provide a more streamlined data experience, this architecture offers denormalized views with precomputed joins. Instead of pulling from multiple sources, all related attributes are consolidated into a single, comprehensive table.
    
    To enhance these joined views, a **dual-perspective naming convention** is applied. For any attribute subject to change over time, two specific versions are provided:
    
    - **`at_event_`**: Represents the data as it existed at the exact moment of the transaction (a "point-in-time" join).
    - **`cur_`**: Represents the "live" version of that data, joined from the most recent records available.