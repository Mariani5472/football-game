import type { PackageManifest } from "./WorldPackageTypes.js";

export interface PackageCompositionNode {
  id: number;
  packageKey: string;
  version: string;
  priority: number;
  loadOrder: number;
  packageType: string;
  dependencies: NonNullable<PackageManifest["dependencies"]>;
  provides: string[];
}

export interface PackageCompositionLayer {
  priority: number;
  packages: PackageCompositionNode[];
}

/**
 * Deterministic World package composition:
 * dependencies first, then priority layers, then explicit load order.
 * Higher priority is a later override layer; load order is the tie-breaker.
 */
export class WorldPackageCompositionService {
  sort(packages: PackageCompositionNode[]): PackageCompositionNode[] {
    const providers = new Map<string, PackageCompositionNode[]>();

    for (const pkg of packages) {
      this.addProvider(providers, pkg.packageKey, pkg);
      for (const capability of pkg.provides) {
        this.addProvider(providers, capability, pkg);
      }
    }

    const dependencies = new Map<number, Set<number>>();
    for (const pkg of packages) {
      const deps = new Set<number>();

      for (const dependency of pkg.dependencies ?? []) {
        const key = dependency.key.trim().toLowerCase();
        if (!key) continue;

        const exact = packages.find(
          candidate =>
            candidate.id !== pkg.id &&
            candidate.packageKey.trim().toLowerCase() === key,
        );

        const candidates = exact
          ? [exact]
          : (providers.get(key) ?? []).filter(
              candidate => candidate.id !== pkg.id,
            );

        if (candidates.length === 0) {
          throw new Error(
            "Package dependency cannot be resolved during composition: " +
              pkg.packageKey +
              " requires " +
              dependency.key,
          );
        }

        deps.add(
          [...candidates].sort(comparePackagePrecedence)[0].id,
        );
      }

      dependencies.set(pkg.id, deps);
    }

    const result: PackageCompositionNode[] = [];
    const remaining = new Map(
      packages.map(pkg => [pkg.id, pkg]),
    );

    while (remaining.size > 0) {
      const ready = [...remaining.values()]
        .filter(pkg =>
          [...(dependencies.get(pkg.id) ?? [])].every(id =>
            result.some(item => item.id === id),
          ),
        )
        .sort(comparePackagePrecedence);

      if (ready.length === 0) {
        const cycle = [...remaining.values()]
          .sort(comparePackagePrecedence)
          .map(pkg => pkg.packageKey)
          .join(", ");

        throw new Error(
          "Package dependency cycle detected: " + cycle,
        );
      }

      for (const pkg of ready) {
        result.push(pkg);
        remaining.delete(pkg.id);
      }
    }

    return result;
  }

  layers(packages: PackageCompositionNode[]): PackageCompositionLayer[] {
    const sorted = this.sort(packages);
    const layers = new Map<number, PackageCompositionNode[]>();

    for (const pkg of sorted) {
      const list = layers.get(pkg.priority) ?? [];
      list.push(pkg);
      layers.set(pkg.priority, list);
    }

    return [...layers.entries()]
      .sort(([left], [right]) => left - right)
      .map(([priority, layer]) => ({
        priority,
        packages: layer,
      }));
  }

  assertBasePackage(packages: PackageCompositionNode[]): void {
    const base = packages.find(
      pkg => pkg.packageKey.trim().toLowerCase() === "world.base",
    );

    if (!base) {
      throw new Error(
        "World composition requires the world.base package.",
      );
    }

    if (base.packageType !== "BASE") {
      throw new Error("world.base must be a BASE package.");
    }

    if (base.priority !== 0) {
      throw new Error("world.base must keep priority 0.");
    }
  }

  isHigherPrecedence(
    incomingPriority: number,
    existingPriority: number,
  ): boolean {
    return incomingPriority > existingPriority;
  }

  private addProvider(
    providers: Map<string, PackageCompositionNode[]>,
    key: string,
    pkg: PackageCompositionNode,
  ): void {
    const normalized = key.trim().toLowerCase();
    if (!normalized) return;

    const list = providers.get(normalized) ?? [];
    list.push(pkg);
    providers.set(normalized, list);
  }
}

function comparePackagePrecedence(
  left: Pick<
    PackageCompositionNode,
    "priority" | "loadOrder" | "packageKey" | "id"
  >,
  right: Pick<
    PackageCompositionNode,
    "priority" | "loadOrder" | "packageKey" | "id"
  >,
): number {
  return (
    left.priority - right.priority ||
    left.loadOrder - right.loadOrder ||
    left.packageKey.localeCompare(right.packageKey) ||
    left.id - right.id
  );
}
