import { Fixture } from "./Fixture.js";

export interface FixtureContext extends Fixture {
  stageId: number;
}