# Runtime Contract

## Purpose

This contract defines the stable execution interface above providers, profiles, and repository adapters.

The runtime contract is where a bounded work item becomes visible execution behavior.

## Minimum Input Surface

- work item context
- repository adapter context
- profile context
- lifecycle state
- topology
- policy configuration
- control-plane provider

## Minimum Output Surface

- visible preflight plan or handoff
- branch creation or reuse result
- verification result publication
- review artifact creation or update
- lifecycle transition result
- blocker or failure publication

## Runtime Requirements

- execution must be bounded to the scoped work item
- execution must honor lifecycle and policy contracts
- execution must publish visible outcome, blocker, or failure state
- execution must not depend on undocumented proving-ground glue

## Implementation Flexibility

This contract allows multiple runtime implementations over time, including:

- local CLI-assisted execution
- workflow-driven execution
- hosted dispatch or runners
- hybrid execution

Those are implementation choices behind the same public runtime surface.
