import path from "node:path";
import { GameApplication } from "../app/GameApplication.js";



const root = process.cwd();

const saveName = "Minha Carreira";

const savePath = path.resolve(
  root,
  "saves",
  "carreira.fgs",
);

const packagePath = path.resolve(
  root,
  "database",
  "packages",
  "brasileirao.mysql",
);

const application = new GameApplication();

await application.start({
  saveName,
  savePath,
  packagePath,
  competitionSlug: "brasileirao-serie-a",
  seasonYear: 2026,
});