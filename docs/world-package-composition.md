# World Package Composition

The World database is a materialized projection of its enabled package sources.

## Composition contract

`world.base` priority 0 is the foundation. Higher priorities are applied later and have higher scalar override precedence.

Priority and load order are separate:

- priority selects the composition layer;
- load order is the deterministic tie-breaker inside the same priority;
- dependencies/providers must be loaded before their dependants.

## Record identity

Entity identity is resolved by UUID when the table has an identity policy, then natural key, then previous import mapping. Ordinary relational rows fall back to primary-key identity.

`world_entity_identity` is the materialized identity map. UUID/natural-key disagreement is an identity conflict and priority never changes entity identity.

## Source and package identity

A package is identified by normalized `packageKey` plus version. The registry stores package type, priority, load order, source path, source SHA-256, capabilities, dependencies and conflicts.

Sources are treated as read-only input. The source hash is checked before import/rebuild. A same-key/same-version package from a different source is rejected; a newer version replaces the installed version and the previous metadata is retained in `world_package_version_history`; downgrades are rejected.

## Override

For scalar attributes, higher priority wins. Lower priority keeps the current value. Equal-priority changes follow application/import order.

Rebuild applies packages from the lowest effective layer to the highest, so the final materialized value follows the same precedence model.

## Merge

Composite-primary-key rows represent relational membership. A new composite key is added; an existing composite key is treated as the same relation instead of creating a duplicate. Attribute differences on the same relation still follow the normal conflict policy.

## Conflict

Hard package conflicts include duplicate package identity/version, capability overlap, missing or incompatible dependencies, explicit package conflicts and version downgrades.

Identity conflicts require explicit resolution. Ordinary scalar conflicts are normally resolved by priority. Immutable event records never receive destructive overrides.

## Removal

Package removal is source based: disable the package, rebuild the World, verify its current provenance is gone, then remove the registry entry. Rebuild regenerates the World from enabled sources and therefore removes disabled package contributions without modifying source databases.

`world.base` is immutable and cannot be disabled or removed.

## Traceability

Composition is traceable through `world_package`, `world_package_version_history`, `world_entity_identity`, `world_entity_provenance`, `world_attribute_provenance`, `world_import_session`, `world_import_id_map` and `world_import_conflict`.

These records preserve package identity, source hash, row/attribute ownership, import mapping and conflict decisions.

## Default data

`world.base` is the mandatory foundational reference package with package type `BASE` and priority 0. Ordinary content packages default to priority 10. Additional layers can use 20, 30 and so on.

The current source filename remains `world.base.<version>.db`; `default.db` is the architectural role, not a required physical filename.

## Load-order algorithm

Enabled packages are resolved by dependency graph first. Among packages whose dependencies are satisfied, the deterministic order is:

`priority ASC → loadOrder ASC → packageKey ASC → registry id ASC`.

If the dependency graph contains a cycle, composition fails.

## Materialization

`World = compose(enabledPackages, dependencyOrder, priorityLayers, loadOrder, identityMapping, conflictPolicy)`.

Changing enabled state, source, version, priority or load order marks composition dirty and requires rebuild before the materialized World is authoritative.