import http from "node:http";
import type { WorldEditorService } from "./WorldEditorService.js";
import type { SqlValue } from "../database/Database.js";
import { isRecord, optionalId, optionalString, readJsonBody, routeParts, sendJson } from "./EditorHttp.js";

export async function handleDomainRequest(request: http.IncomingMessage, response: http.ServerResponse, service: WorldEditorService): Promise<boolean> {
  const parts = routeParts(request);
  if (parts[0] !== "api" || parts[1] !== "domain") return false;

  if (request.method === "POST" && parts[2] === "competition" && parts[4] === "duplicate" && parts[5] === undefined) {
    sendJson(response, 201, service.duplicateCompetition(positiveInteger(parts[3], "competitionId")));
    return true;
  }
  if (request.method === "POST" && parts[2] === "stadium" && parts[4] === "duplicate" && parts[5] === undefined) {
    sendJson(response, 201, service.duplicateStadium(positiveInteger(parts[3], "stadiumId")));
    return true;
  }
  if (request.method === "POST" && parts[2] === "club") {
    const body = await readJsonBody(request);
    if (!isRecord(body) || typeof body.name !== "string") throw new Error("name is required.");
    const result = service.createClub({ name: body.name, shortName: optionalString(body.shortName), nationId: optionalId(body.nationId), cityId: optionalId(body.cityId), stadiumName: optionalString(body.stadiumName) });
    sendJson(response, 201, result);
    return true;
  }
    if (request.method === "POST" && parts[2] === "player") {
      const body = await readJsonBody(request);
      if (!isRecord(body) || typeof body.fullName !== "string" || !Number.isInteger(body.personTypeId)) {
        throw new Error("fullName and integer personTypeId are required.");
      }
      sendJson(response, 201, service.createPlayer({
        fullName: body.fullName,
        commonName: optionalString(body.commonName),
        birthDate: optionalString(body.birthDate),
        personTypeId: Number(body.personTypeId),
        positionId: optionalId(body.positionId),
        positionRating: optionalId(body.positionRating),
      }));
      return true;
    }
    if (request.method === "POST" && parts[2] === "nation-regions-import") {
      const body = await readJsonBody(request);
      if (!isRecord(body) || !Number.isInteger(body.nationId) || !Array.isArray(body.rows)) {
        throw new Error("nationId and rows are required.");
      }
      const rows = body.rows.map((row, index) => {
        if (!isRecord(row)) throw new Error(`Row ${index + 1} is invalid.`);
        const line = Number(row.line);
        if (!Number.isInteger(line) || typeof row.name !== "string") throw new Error(`Row ${index + 1} has invalid line/name fields.`);
        return { line, name: row.name, shortName: optionalString(row.shortName), population: row.population == null || row.population === "" ? undefined : Number(row.population) };
      });
      sendJson(response, 200, service.importNationRegions(Number(body.nationId), rows));
      return true;
    }
    if ((request.method === "POST" || request.method === "PUT") && parts[2] === "competition-stage" && (request.method !== "PUT" || parts[3] !== undefined)) {
      const body = await readJsonBody(request);
      if (!isRecord(body) || !isRecord(body.format) || typeof body.name !== "string") throw new Error("name and format are required.");
      const format = body.format;
      if (!["LEAGUE", "GROUP", "KNOCKOUT"].includes(String(format.type))) throw new Error("format.type must be LEAGUE, GROUP or KNOCKOUT.");
      const integer = (value: unknown, field: string, optional = false): number | undefined => {
        if (optional && value === undefined) return undefined;
        const parsed = Number(value);
        if (!Number.isInteger(parsed)) throw new Error(`${field} must be an integer.`);
        return parsed;
      };
      const array = (value: unknown, field: string): unknown[] => {
        if (value === undefined) return [];
        if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
        return value;
      };
      const points = body.points === undefined ? undefined : body.points;
      if (points !== undefined && !isRecord(points)) throw new Error("points must be an object.");
      const schedule = body.schedule === undefined ? undefined : body.schedule;
      if (schedule !== undefined && !isRecord(schedule)) throw new Error("schedule must be an object.");
      const setup = {
        seasonId: integer(body.seasonId, "seasonId")!, name: body.name, stageOrder: integer(body.stageOrder, "stageOrder")!, stageTypeId: optionalId(body.stageTypeId),
        format: {
          type: format.type as "LEAGUE" | "GROUP" | "KNOCKOUT",
          participantCount: integer(format.participantCount, "participantCount", true), groupCount: integer(format.groupCount, "groupCount", true),
          participantsPerGroup: integer(format.participantsPerGroup, "participantsPerGroup", true), legs: integer(format.legs, "legs")!,
          homeAway: format.homeAway === true, aggregateScore: format.aggregateScore === true,
          extraTime: format.extraTime === true, penalties: format.penalties === true, awayGoalsRule: format.awayGoalsRule === true,
        },
        points: points === undefined ? undefined : { win: integer(points.win, "points.win")!, draw: integer(points.draw, "points.draw")!, loss: integer(points.loss, "points.loss")! },
        schedule: schedule === undefined ? undefined : {
          type: typeof schedule.type === "string" ? schedule.type : "ROUND_ROBIN", startDate: optionalString(schedule.startDate), endDate: optionalString(schedule.endDate),
          intervalDays: integer(schedule.intervalDays, "schedule.intervalDays", true), homeAwayBalanced: schedule.homeAwayBalanced !== false,
        },
        standingRules: array(body.standingRules, "standingRules").map(String),
        matchRules: array(body.matchRules, "matchRules").map((rule, index) => {
          if (!isRecord(rule) || typeof rule.type !== "string") throw new Error(`matchRules[${index}] is invalid.`);
          return { type: rule.type, value: optionalString(rule.value) };
        }),
        qualificationRules: array(body.qualificationRules, "qualificationRules").map((rule, index) => {
          if (!isRecord(rule)) throw new Error(`qualificationRules[${index}] is invalid.`);
          return { positionFrom: integer(rule.positionFrom, `qualificationRules[${index}].positionFrom`)!, positionTo: integer(rule.positionTo, `qualificationRules[${index}].positionTo`)!, type: typeof rule.type === "string" ? rule.type : "QUALIFY", destinationCompetitionId: optionalId(rule.destinationCompetitionId), destinationStageId: optionalId(rule.destinationStageId) };
        }),
      };
      const result = request.method === "PUT" ? service.updateCompetitionStage(positiveInteger(parts[3], "stageId"), setup) : service.createCompetitionStage(setup);
      sendJson(response, request.method === "PUT" ? 200 : 201, result);
      return true;
    }
    if (request.method === "POST" && parts[2] === "league") {
      const body = await readJsonBody(request);
      if (!isRecord(body) || typeof body.name !== "string" || !Array.isArray(body.teamIds)) {
        throw new Error("name and teamIds are required.");
      }
      const ids = body.teamIds.map(Number);
      if (!ids.every(id => Number.isInteger(id) && id > 0)) throw new Error("teamIds must be positive integer IDs.");
      const result = service.createLeague({
        name: body.name,
        nationId: optionalId(body.nationId),
        competitionTypeId: optionalId(body.competitionTypeId),
        shortName: optionalString(body.shortName),
        year: Number(body.year),
        teamIds: ids,
        startDate: typeof body.startDate === "string" ? body.startDate : "",
        endDate: optionalString(body.endDate),
        intervalDays: body.intervalDays === undefined ? 7 : Number(body.intervalDays),
        winPoints: body.winPoints === undefined ? 3 : Number(body.winPoints),
        drawPoints: body.drawPoints === undefined ? 1 : Number(body.drawPoints),
        lossPoints: body.lossPoints === undefined ? 0 : Number(body.lossPoints),
      });
      sendJson(response, 201, result);
      return true;
    }
    if (parts[1] === "domain") {
      if (request.method === "POST" && parts[2] === "transfer") {
        sendJson(response, 201, service.createTransfer(await readObjectBody<Parameters<WorldEditorService["createTransfer"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "contract") {
        sendJson(response, 201, service.createContract(await readObjectBody<Parameters<WorldEditorService["createContract"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "finance") {
        sendJson(response, 200, service.saveClubFinance(await readObjectBody<Parameters<WorldEditorService["saveClubFinance"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "history") {
        sendJson(response, 201, service.createCompetitionHistory(await readObjectBody<Parameters<WorldEditorService["createCompetitionHistory"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "award-history") {
        sendJson(response, 201, service.createAwardHistory(await readObjectBody<Parameters<WorldEditorService["createAwardHistory"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "press-source") {
        sendJson(response, 201, service.createPressSource(await readObjectBody<Parameters<WorldEditorService["createPressSource"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "climate-profile") {
        sendJson(response, 201, service.createClimateProfile(await readObjectBody<Parameters<WorldEditorService["createClimateProfile"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "award") {
        sendJson(response, 201, service.createAward(await readObjectBody<Parameters<WorldEditorService["createAward"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "player-career") {
        sendJson(response, 201, service.createPlayerCareerHistory(await readSqlPayloadBody(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "staff-career") {
        sendJson(response, 201, service.createStaffCareerHistory(await readSqlPayloadBody(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "achievement") {
        sendJson(response, 201, service.createPlayerAchievement(await readObjectBody<Parameters<WorldEditorService["createPlayerAchievement"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "record") {
        sendJson(response, 201, service.createRecord(await readObjectBody<Parameters<WorldEditorService["createRecord"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "derby") {
        sendJson(response, 201, service.createDerby(await readObjectBody<Parameters<WorldEditorService["createDerby"]>[0]>(request)));
        return true;
      }
      if (request.method === "POST" && parts[2] === "climate-region") {
        const body = await readObjectBody<{ nationRegionId: number; climateId: number }>(request);
        body.nationRegionId = positiveId(body.nationRegionId, "nationRegionId");
        body.climateId = positiveId(body.climateId, "climateId");
        sendJson(response, 201, service.mapClimateToRegion(body.nationRegionId, body.climateId));
        return true;
      }
      if (request.method === "POST" && parts[2] === "weather-season") {
        const body = await readObjectBody<{ name: string }>(request);
        if (typeof body.name !== "string" || !body.name.trim()) throw new Error("name is required.");
        sendJson(response, 201, service.createWeatherSeason(body.name));
        return true;
      }
      if (request.method === "POST" && parts[2] === "nationality-rule") {
        sendJson(response, 201, service.createNationalityRule(await readObjectBody<Parameters<WorldEditorService["createNationalityRule"]>[0]>(request)));
        return true;
      }
    }

  return false;
}



async function readObjectBody<T extends object>(request: http.IncomingMessage): Promise<T> {
  const body = await readJsonBody(request);
  if (!isRecord(body)) throw new Error("Request body must be an object.");
  return body as unknown as T;
}

async function readSqlPayloadBody(request: http.IncomingMessage): Promise<Record<string, SqlValue | undefined>> {
  const body = await readObjectBody<Record<string, unknown>>(request);
  for (const [key, value] of Object.entries(body)) {
    if (value !== null && typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") throw new Error(`${key} must be a scalar value.`);
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error(`${key} must be a finite number.`);
  }
  return body as Record<string, SqlValue | undefined>;
}

function positiveId(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}




function positiveInteger(value: unknown, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} must be a positive integer.`);
  return parsed;
}
