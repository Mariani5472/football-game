import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { WorldDatabase } from "../../database/world/WorldDatabase.js";
import { SaveDatabase } from "../../database/save/SaveDatabase.js";
import { CompetitionEngine } from "../../modules/competition/engine/CompetitionEngine.js";
import { CompetitionRepository } from "../../modules/competition/repository/CompetitionRepository.js";

export interface NewCareerOptions {
  savePath: string;
  saveName: string;
  gameDate: string;
  managerPersonId: number;
  managerClubId: number;
  packageName?: string;
  packageVersion?: string;
  sourcePath?: string;
}

export interface NewCareerResult {
  saveId: number;
  savePath: string;
  teams: number;
  players: number;
  contracts: number;
  competitions: number;
  fixtures: number;
}

interface WorldMetadata {
  schemaVersion: string;
}

export class NewCareerService {
  constructor(
    private readonly world: WorldDatabase,
  ) {}

  create(
    options: NewCareerOptions,
  ): NewCareerResult {
    this.validateManager(
      options.managerPersonId,
      options.managerClubId,
    );

    const save = SaveDatabase.create(
      options.savePath,
    );

    try {
      const packageMetadata =
        this.resolvePackageMetadata(options);

      const saveId =
        this.createSave(
          save,
          options,
          packageMetadata,
        );

      save.transaction(() => {
        this.snapshotManager(
          save,
          saveId,
          options,
        );

        const teams =
          this.snapshotTeams(
            save,
            saveId,
          );

        const players =
          this.snapshotPlayers(
            save,
            saveId,
            options.gameDate,
          );

        const contracts =
          this.snapshotContracts(
            save,
            saveId,
          );

        const competitions =
          this.snapshotCompetitions(
            save,
            saveId,
            options.gameDate,
          );

        const fixtures =
          this.snapshotFixtures(
            save,
            saveId,
            competitions,
          );

        this.snapshotCalendar(
          save,
          saveId,
          options.gameDate,
          competitions,
          fixtures,
        );

        return {
          teams,
          players,
          contracts,
          competitions,
          fixtures,
        };
      });

      const counts = this.countSnapshot(
        save,
        saveId,
      );

      return {
        saveId,
        savePath: options.savePath,
        ...counts,
      };
    } catch (error) {
      save.close();

      if (fs.existsSync(options.savePath)) {
        fs.unlinkSync(options.savePath);
      }

      throw error;
    } finally {
      if (save.connection.open) {
        save.close();
      }
    }
  }

  private createSave(
    save: SaveDatabase,
    options: NewCareerOptions,
    metadata: WorldMetadata & {
      packageName: string;
      packageVersion: string;
      sourcePath: string | null;
      packageHash: string | null;
      importedAt: string;
    },
  ): number {
    const result = save.connection
      .prepare(
        `
          INSERT INTO save (
            name,
            created_at,
            last_saved_at,
            game_date,
            status,
            version
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        options.saveName,
        metadata.importedAt,
        metadata.importedAt,
        options.gameDate,
        "ACTIVE",
        1,
      );

    const saveId =
      Number(result.lastInsertRowid);

    save.connection
      .prepare(
        `
          INSERT INTO save_world (
            save_id,
            package_name,
            package_version,
            package_hash,
            source_path,
            imported_at
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        saveId,
        metadata.packageName,
        metadata.packageVersion,
        metadata.packageHash,
        metadata.sourcePath,
        metadata.importedAt,
      );

    save.connection
      .prepare(
        `
          INSERT INTO calendar_state (
            save_id,
            game_date,
            season_year,
            day_phase
          )
          VALUES (?, ?, ?, ?)
        `,
      )
      .run(
        saveId,
        options.gameDate,
        Number(options.gameDate.slice(0, 4)),
        "START_OF_DAY",
      );

    return saveId;
  }

  private snapshotManager(
    save: SaveDatabase,
    saveId: number,
    options: NewCareerOptions,
  ): void {
    save.connection
      .prepare(
        `
          INSERT INTO save_manager (
            save_id,
            person_id,
            club_id
          )
          VALUES (?, ?, ?)
        `,
      )
      .run(
        saveId,
        options.managerPersonId,
        options.managerClubId,
      );

    save.connection
      .prepare(
        `
          INSERT INTO manager_history (
            save_id,
            person_id,
            club_id,
            start_date
          )
          VALUES (?, ?, ?, ?)
        `,
      )
      .run(
        saveId,
        options.managerPersonId,
        options.managerClubId,
        options.gameDate,
      );
  }

  private snapshotTeams(
    save: SaveDatabase,
    saveId: number,
  ): number {
    const teams = this.world.connection
      .prepare(
        `
          SELECT
            id AS team_id,
            COALESCE(reputation, 50) AS reputation
          FROM team
          ORDER BY id
        `,
      )
      .all() as Array<{
        team_id: number;
        reputation: number;
      }>;

    const insert = save.connection
      .prepare(
        `
          INSERT INTO team_state (
            save_id,
            team_id,
            reputation,
            morale,
            financial_balance,
            transfer_budget,
            wage_budget
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      );

    for (const team of teams) {
      insert.run(
        saveId,
        team.team_id,
        team.reputation,
        100,
        0,
        0,
        0,
      );
    }

    return teams.length;
  }

  private snapshotPlayers(
    save: SaveDatabase,
    saveId: number,
    gameDate: string,
  ): number {
    const players = this.world.connection
      .prepare(
        `
          SELECT
            p.person_id AS player_id,
            (
              SELECT pc.club_id
              FROM person_contract pc
              WHERE pc.person_id = p.person_id
                AND (
                  pc.start_date IS NULL
                  OR pc.start_date <= ?
                )
                AND (
                  pc.end_date IS NULL
                  OR pc.end_date >= ?
                )
              ORDER BY
                CASE
                  WHEN pc.end_date IS NULL THEN 0
                  ELSE 1
                END,
                pc.end_date DESC
              LIMIT 1
            ) AS current_club_id,
            p.estimated_value AS current_value
          FROM player p
          ORDER BY p.person_id
        `,
      )
      .all(
        gameDate,
        gameDate,
      ) as Array<{
        player_id: number;
        current_club_id: number | null;
        current_value: number | null;
      }>;

    const insertPlayer = save.connection
      .prepare(
        `
          INSERT INTO player_state (
            save_id,
            player_id,
            current_club_id,
            condition,
            match_fitness,
            morale,
            sharpness,
            current_value
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      );

    const insertAttribute = save.connection
      .prepare(
        `
          INSERT INTO player_attribute_state (
            save_id,
            player_id,
            attribute_key,
            value
          )
          VALUES (?, ?, ?, ?)
        `,
      );

    for (const player of players) {
      insertPlayer.run(
        saveId,
        player.player_id,
        player.current_club_id,
        100,
        100,
        100,
        0,
        player.current_value,
      );
    }

    this.snapshotPlayerAttributes(
      save,
      saveId,
      insertAttribute,
    );

    return players.length;
  }

  private snapshotPlayerAttributes(
    save: SaveDatabase,
    saveId: number,
    insertAttribute: DatabaseInsert,
  ): void {
    const tables = [
      "player_technical_attribute",
      "player_physical_attribute",
      "player_psychological_attribute",
      "player_goalkeeper_attribute",
    ];

    for (const table of tables) {
      const columns = this.world.connection
        .prepare(
          `
            PRAGMA table_info(${table})
          `,
        )
        .all() as Array<{
          name: string;
        }>;

      const attributeColumns =
        columns
          .map((column) => column.name)
          .filter(
            (name) => name !== "player_id",
          );

      if (attributeColumns.length === 0) {
        continue;
      }

      const rows = this.world.connection
        .prepare(
          `
            SELECT
              player_id,
              ${attributeColumns.join(", ")}
            FROM ${table}
          `,
        )
        .all() as Array<
          Record<string, number | null>
        >;

      for (const row of rows) {
        for (const key of attributeColumns) {
          const value = row[key];

          if (value === null || value === undefined) {
            continue;
          }

          insertAttribute.run(
            saveId,
            Number(row.player_id),
            key,
            value,
          );
        }
      }
    }
  }

  private snapshotContracts(
    save: SaveDatabase,
    saveId: number,
  ): number {
    const contracts = this.world.connection
      .prepare(
        `
          SELECT
            id,
            person_id,
            club_id,
            employment_id,
            contract_type,
            start_date,
            end_date,
            salary,
            squad_number
          FROM person_contract
          ORDER BY id
        `,
      )
      .all() as Array<{
        id: number;
        person_id: number;
        club_id: number;
        employment_id: number | null;
        contract_type: string | null;
        start_date: string | null;
        end_date: string | null;
        salary: number | null;
        squad_number: number | null;
      }>;

    const insert = save.connection
      .prepare(
        `
          INSERT INTO contract_state (
            save_id,
            world_contract_id,
            person_id,
            club_id,
            employment_id,
            contract_type_id,
            start_date,
            end_date,
            salary,
            squad_number,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      );

    for (const contract of contracts) {
      insert.run(
        saveId,
        contract.id,
        contract.person_id,
        contract.club_id,
        contract.employment_id,
        null,
        contract.start_date,
        contract.end_date,
        contract.salary,
        contract.squad_number,
        "ACTIVE",
      );
    }

    return contracts.length;
  }

  private snapshotCompetitions(
    save: SaveDatabase,
    saveId: number,
    gameDate: string,
  ): CompetitionSnapshot[] {
    const year =
      Number(gameDate.slice(0, 4));

    const seasons = this.world.connection
      .prepare(
        `
          SELECT
            cs.id,
            cs.competition_id,
            cs.year,
            cs.status,
            cs.start_date,
            cs.end_date
          FROM competition_season cs
          WHERE cs.year = ?
          ORDER BY cs.competition_id
        `,
      )
      .all(year) as Array<{
        id: number;
        competition_id: number;
        year: number;
        status: string | null;
        start_date: string | null;
        end_date: string | null;
      }>;

    const insertSeason = save.connection
      .prepare(
        `
          INSERT INTO season_state (
            save_id,
            competition_id,
            competition_season_id,
            year,
            status,
            start_date,
            end_date
          )
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      );

    const snapshots: CompetitionSnapshot[] = [];

    for (const season of seasons) {
      const result = insertSeason.run(
        saveId,
        season.competition_id,
        season.id,
        season.year,
        season.status ?? "PLANNED",
        season.start_date,
        season.end_date,
      );

      const seasonStateId =
        Number(result.lastInsertRowid);

      const stage =
        new CompetitionRepository(
          this.world,
        ).findStage(season.id);

      if (!stage) {
        continue;
      }

      const stageResult = save.connection
        .prepare(
          `
            INSERT INTO stage_state (
              save_id,
              season_state_id,
              world_stage_id,
              status,
              current_round_number
            )
            VALUES (?, ?, ?, ?, ?)
          `,
        )
        .run(
          saveId,
          seasonStateId,
          stage.id,
          "NOT_STARTED",
          0,
        );

      const stageStateId =
        Number(stageResult.lastInsertRowid);

      const generated =
        new CompetitionEngine(
          this.world,
        ).generateSeason({
          competitionSeasonId:
            season.id,
        });

      this.snapshotStandings(
        save,
        saveId,
        stageStateId,
        generated.participants,
      );

      for (const participant of generated.participants) {
        save.connection
          .prepare(
            `
              INSERT INTO team_competition_state (
                save_id,
                team_id,
                competition_id,
                competition_season_id,
                status,
                current_position
              )
              VALUES (?, ?, ?, ?, ?, ?)
            `,
          )
          .run(
            saveId,
            participant.teamId,
            season.competition_id,
            season.id,
            "REGISTERED",
            null,
          );
      }

      snapshots.push({
        seasonStateId,
        stageStateId,
        competitionId:
          season.competition_id,
        seasonId: season.id,
        generated,
      });
    }

    return snapshots;
  }

  private snapshotStandings(
    save: SaveDatabase,
    saveId: number,
    stageStateId: number,
    participants: Array<{ teamId: number }>,
  ): void {
    const insert = save.connection
      .prepare(
        `
          INSERT INTO standing (
            save_id,
            stage_state_id,
            team_id
          )
          VALUES (?, ?, ?)
        `,
      );

    for (const participant of participants) {
      insert.run(
        saveId,
        stageStateId,
        participant.teamId,
      );
    }
  }

  private snapshotFixtures(
    save: SaveDatabase,
    saveId: number,
    competitions: CompetitionSnapshot[],
  ): number {
    const insertRound = save.connection
      .prepare(
        `
          INSERT INTO round_state (
            save_id,
            stage_state_id,
            round_number,
            status,
            scheduled_date
          )
          VALUES (?, ?, ?, ?, ?)
        `,
      );

    const insertFixture = save.connection
      .prepare(
        `
          INSERT INTO fixture_state (
            save_id,
            round_state_id,
            home_team_id,
            away_team_id,
            scheduled_at,
            status
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      );

    let fixtures = 0;

    for (const competition of competitions) {
      const rounds = new Map<
        number,
        Array<{
          homeTeamId: number;
          awayTeamId: number;
          scheduledAt: string;
        }>
      >();

      for (const fixture of competition.generated.fixtures) {
        const current =
          rounds.get(
            fixture.roundNumber,
          ) ?? [];

        current.push({
          homeTeamId:
            fixture.homeTeamId,
          awayTeamId:
            fixture.awayTeamId,
          scheduledAt:
            fixture.scheduledAt,
        });

        rounds.set(
          fixture.roundNumber,
          current,
        );
      }

      for (const [
        roundNumber,
        roundFixtures,
      ] of rounds) {
        const roundDate =
          roundFixtures[0]?.scheduledAt.slice(
            0,
            10,
          ) ?? null;

        const roundResult =
          insertRound.run(
            saveId,
            competition.stageStateId,
            roundNumber,
            "SCHEDULED",
            roundDate,
          );

        const roundStateId =
          Number(
            roundResult.lastInsertRowid,
          );

        for (const fixture of roundFixtures) {
          insertFixture.run(
            saveId,
            roundStateId,
            fixture.homeTeamId,
            fixture.awayTeamId,
            fixture.scheduledAt,
            "SCHEDULED",
          );

          fixtures++;
        }
      }
    }

    return fixtures;
  }

  private snapshotCalendar(
    save: SaveDatabase,
    saveId: number,
    gameDate: string,
    competitions: CompetitionSnapshot[],
    fixtures: number,
  ): void {
    save.connection
      .prepare(
        `
          INSERT INTO calendar_event (
            save_id,
            event_type,
            event_date,
            priority,
            title,
            description
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        saveId,
        "CAREER_CREATED",
        gameDate,
        100,
        "New Career",
        "Career created from the selected world package.",
      );

    const insertFixtureEvent =
      save.connection.prepare(
        `
          INSERT INTO calendar_event (
            save_id,
            event_type,
            event_date,
            priority,
            title,
            description
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `,
      );

    for (const competition of competitions) {
      const competitionName =
        this.world.connection
          .prepare(
            "SELECT name FROM competition WHERE id = ? LIMIT 1",
          )
          .pluck()
          .get(competition.competitionId) as
          | string
          | undefined;

      for (const fixture of competition.generated.fixtures) {
        insertFixtureEvent.run(
          saveId,
          "FIXTURE",
          fixture.scheduledAt.slice(0, 10),
          50,
          "Matchday",
          `${competitionName ?? "Competition"}: ${fixture.homeTeamId} vs ${fixture.awayTeamId}`,
        );
      }
    }

    save.connection
      .prepare(
        `
          INSERT INTO save_variable (
            save_id,
            variable_key,
            variable_value
          )
          VALUES (?, ?, ?)
        `,
      )
      .run(
        saveId,
        "initial_fixture_count",
        String(fixtures),
      );
  }

  private countSnapshot(
    save: SaveDatabase,
    saveId: number,
  ): Omit<
    NewCareerResult,
    "saveId" | "savePath"
  > {
    const count = (table: string): number =>
      (
        save.connection
          .prepare(
            `SELECT COUNT(*) AS count FROM ${table} WHERE save_id = ?`,
          )
          .get(saveId) as { count: number }
      ).count;

    return {
      teams: count("team_state"),
      players: count("player_state"),
      contracts: count("contract_state"),
      competitions: count("season_state"),
      fixtures: count("fixture_state"),
    };
  }

  private validateManager(
    personId: number,
    clubId: number,
  ): void {
    const person = this.world.connection
      .prepare(
        "SELECT id FROM person WHERE id = ? LIMIT 1",
      )
      .get(personId);

    if (!person) {
      throw new Error(
        `Manager person não encontrado: ${personId}`,
      );
    }

    const club = this.world.connection
      .prepare(
        `
          SELECT team_id
          FROM club
          WHERE team_id = ?
          LIMIT 1
        `,
      )
      .get(clubId);

    if (!club) {
      throw new Error(
        `Manager club não encontrado: ${clubId}`,
      );
    }
  }

  private resolvePackageMetadata(
    options: NewCareerOptions,
  ): WorldMetadata & {
    packageName: string;
    packageVersion: string;
    sourcePath: string | null;
    packageHash: string | null;
    importedAt: string;
  } {
    const metadataRows =
      this.world.connection
        .prepare(
          `
            SELECT key, value
            FROM database_metadata
          `,
        )
        .all() as Array<{
          key: string;
          value: string;
        }>;

    const metadata = new Map(
      metadataRows.map(
        (row) => [row.key, row.value],
      ),
    );

    const sourcePath =
      options.sourcePath ??
      this.world.connection.name;

    const packageHash =
      sourcePath &&
      sourcePath !== ":memory:" &&
      fs.existsSync(sourcePath)
        ? crypto
            .createHash("sha256")
            .update(
              fs.readFileSync(sourcePath),
            )
            .digest("hex")
        : null;

    return {
      schemaVersion:
        metadata.get("schema_version") ??
        "unknown",
      packageName:
        options.packageName ??
        path.basename(sourcePath),
      packageVersion:
        options.packageVersion ??
        `world-schema-${metadata.get("schema_version") ?? "unknown"}`,
      sourcePath:
        sourcePath === ":memory:"
          ? null
          : sourcePath,
      packageHash,
      importedAt:
        new Date().toISOString(),
    };
  }
}

type DatabaseInsert = {
  run: (
    saveId: number,
    playerId: number,
    attributeKey: string,
    value: number,
  ) => unknown;
};

interface CompetitionSnapshot {
  seasonStateId: number;
  stageStateId: number;
  competitionId: number;
  seasonId: number;
  generated: ReturnType<
    CompetitionEngine["generateSeason"]
  >;
}
