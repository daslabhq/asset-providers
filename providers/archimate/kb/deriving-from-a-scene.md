---
summary: The mapping from scene assets and job history to architecture elements, and why the model cannot go stale.
---
# Deriving a model from a scene

A scene already knows what it is made of. Its assets are the systems it touches, its jobs are the work that ran, and the tools each job called are the functions those systems performed. `archimate_derive` turns that record into a model that passes the relationship table.

## The mapping

| In the scene | In the model | Joined by |
|---|---|---|
| The scene | Grouping | aggregates everything below |
| A provider (from asset types and tool prefixes) | Application Component | |
| A provider account asset | Application Interface | Assignment from the component |
| A device or machine asset | Device, or Equipment for physical providers | Assignment from the component |
| An agent asset | Application Component, specialised from Daslab | |
| A note or document asset | Representation | Access from Daslab |
| A script asset | Application Process | Assignment from Daslab |
| Any other resource asset | Data Object | Access from its provider's component |
| A human member | Business Actor and Business Role | Assignment |
| A tool a job called | Application Function | Assignment from its provider |
| A job | Business Process | Serving from each function it used |
| Two tools called in sequence | Flow between the functions | |
| An approval rule or policy | Constraint | Association to the function |

## Collecting the snapshot

The tool takes a snapshot the agent assembles from the scene tools:

1. `daslab_get_scene_assets` for assets. Keep id, name, type, status.
2. `daslab_list_jobs` for jobs, then `daslab_get_job_summary` per job for the tools it called, in order.
3. `daslab_list_members` for members.
4. Scene settings for approval rules, if any.

Forty jobs is the default cap. Raise it for a quieter scene, lower it for a busy one; the functions and flows saturate quickly.

## Why this is different from an architecture repository

A repository describes the enterprise and drifts from it the moment someone stops updating it. A derived model is a view of the record: re-run the derivation and it is current again. Store it in an `archimate/model` asset, and the scene's commit history gives you every earlier state and the diff between any two.

## After deriving

- `archimate_validate` to confirm the model passes the table. A derived model should always pass; a finding is a bug in the mapping, report it.
- `archimate_export` to write the exchange file. Open it in Archi, which is free and open source, to see the layered view, or import it into the repository your architects already use.
- Add what the record cannot know: capabilities, goals, the constraints nobody wrote down. Those are the elements a human contributes, and the derived part stays regenerable underneath them.
