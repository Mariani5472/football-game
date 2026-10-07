import type { ParticipantSource, CompetitionParticipant, ResolvedParticipantSource } from "../domain/CompetitionParticipant.js";
import type { StageQualificationRule } from "../domain/CompetitionStage.js";
import type { CompetitionSeason } from "../domain/CompetitionSeason.js";
import type { Competition } from "../domain/Competition.js";

export interface StageTransition {
  fromStageId: number;
  toStageId: number;
  sourceType: string;
  sourcePositions: number[];
}

export interface StageParticipantResolution {
  participants: CompetitionParticipant[];
  sources: ResolvedParticipantSource[];
}

export class ParticipantResolutionService {
  constructor(
    private readonly competitionRepository: {
      findParticipants(seasonId: number): CompetitionParticipant[];
      findStageParticipantSources(stageId: number): ParticipantSource[];
      resolveParticipantSource(source: ParticipantSource): ResolvedParticipantSource;
      findSeasonById(id: number): CompetitionSeason | null;
      findById(id: number): Competition | null;
    },
  ) {}

  resolve(seasonId: number, stageId: number): StageParticipantResolution {
    const direct = this.competitionRepository.findParticipants(seasonId);
    const sources = this.competitionRepository.findStageParticipantSources(stageId);

    if (!sources.length) {
      return { participants: direct, sources: [] };
    }

    const resolvedSources = sources.map((source) => {
      if (source.type === "DIRECT") {
        return { source, teamIds: direct.map((participant) => participant.teamId) };
      }
      return this.competitionRepository.resolveParticipantSource(source);
    });

    const teamIds = new Set(resolvedSources.flatMap((source) => source.teamIds));
    const directById = new Map(direct.map((participant) => [participant.teamId, participant]));
    const missingIds = [...teamIds].filter((teamId) => !directById.has(teamId));

    if (missingIds.length > 0) {
      const externalTeams = new Map<number, CompetitionParticipant>();

      for (const source of resolvedSources) {
        const sourceSeasonId = source.source.sourceSeasonId;
        if (sourceSeasonId == null) continue;

        for (const participant of this.competitionRepository.findParticipants(sourceSeasonId)) {
          externalTeams.set(participant.teamId, participant);
        }
      }

      for (const participant of externalTeams.values()) {
        directById.set(participant.teamId, participant);
      }
    }

    const participants = [...teamIds]
      .map((teamId) => directById.get(teamId))
      .filter((participant): participant is CompetitionParticipant => Boolean(participant));

    return { participants, sources: resolvedSources };
  }

  buildTransitions(stages: Array<{ id: number; stageOrder: number; participantSources: ParticipantSource[] }>): StageTransition[] {
    const ordered = [...stages].sort((left, right) => left.stageOrder - right.stageOrder);
    const transitions: StageTransition[] = [];

    for (let index = 1; index < ordered.length; index += 1) {
      const from = ordered[index - 1];
      const to = ordered[index];

      const sources = to.participantSources.length
        ? to.participantSources
        : [{ type: "DIRECT" as const }];

      for (const source of sources) {
        if (source.sourceStageId != null && source.sourceStageId !== from.id) {
          continue;
        }

        const start = source.positionFrom ?? 1;
        const end = source.positionTo ?? start;

        transitions.push({
          fromStageId: from.id,
          toStageId: to.id,
          sourceType: source.type,
          sourcePositions: Array.from({ length: end - start + 1 }, (_, offset) => start + offset),
        });
      }
    }

    return transitions;
  }

  filterQualification(
    standings: readonly { teamId: number }[],
    rule: StageQualificationRule,
  ): number[] {
    const start = Math.max(0, rule.positionFrom - 1);
    const end = Math.min(standings.length, rule.positionTo);
    return standings.slice(start, end).map((standing) => standing.teamId);
  }
}
