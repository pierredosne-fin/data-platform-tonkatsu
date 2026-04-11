# dbt-generate-doc

When triggered, you must generate a documentation for the given model, that must strictly follow this template:

- **Table Documentation Template**
    - **1. Business Purpose & Grain**
        - **Table Description:** A high-level summary using business terminology.
        - **Grain (The "Atom"):** Define exactly what one row represents.
            ◦ *Example: "One row represents a unique transaction line-item for a customer."*
        - • **Primary/Surrogate Keys:** List the columns that uniquely identify the grain defined above.
    - **2. Use Cases**
        - Provide 2–3 concrete examples of business questions this table can answer.
        **Example:** "Use this table to calculate Monthly Recurring Revenue (MRR) or to identify churn patterns by product tier."
    - **3. Column Definitions**
        - For every column, provide the following context:
            - **Attribute Description Business Logic** What does this field represent in the real world? Why do we track it?
            - **Data Nature** Is it **Categorical** (discrete groups) or **Continuous** (measurable amounts)?
            - **Categorical Metadata** If categorical, is it **Ordinal** (has a specific order, like 'Bronze, Silver, Gold')? If possible, list the expected value range.
            - **Continuous Metadata** if continuous, is it **Cumulative** (a running total) or **Point-in-Time**? Give associated Unit.
            - **Nullability Logic** Is the presence of a `NULL` deterministic?