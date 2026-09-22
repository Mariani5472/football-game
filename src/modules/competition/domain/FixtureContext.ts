import type { Fixture } from "./Fixture.js";

export interface FixtureContext extends Fixture {
  id: number;
  stageId: number;
}
