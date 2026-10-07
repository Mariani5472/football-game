import { describe, expect, it } from "vitest";
import { ParticipantResolutionService } from "./ParticipantResolutionService.js";
import type { CompetitionParticipant, ParticipantSource } from "../domain/CompetitionParticipant.js";

const team=(teamId:number): CompetitionParticipant=>({teamId,name:`Team ${teamId}`,reputation:50});

describe("ParticipantResolutionService",()=>{
  it("resolves multiple source ranges into one unique participant set",()=>{
    const direct=[1,2,3,4].map(team);
    const sources: ParticipantSource[]=[
      {type:"STANDING",sourceStageId:10,positionFrom:1,positionTo:2},
      {type:"QUALIFICATION",sourceStageId:10,positionFrom:3,positionTo:4},
    ];
    const service=new ParticipantResolutionService({
      findParticipants:(seasonId)=>seasonId===1?direct:[],
      findStageParticipantSources:()=>sources,
      resolveParticipantSource:(source)=>({source,teamIds:source.positionFrom===1?[1,2]:[3,4]}),
      findSeasonById:()=>null,
      findById:()=>null,
    });
    expect(service.resolve(1,20).participants.map(t=>t.teamId)).toEqual([1,2,3,4]);
  });

  it("builds transitions from ordered stages without assuming adjacent ids",()=>{
    const service=new ParticipantResolutionService({
      findParticipants:()=>[],
      findStageParticipantSources:()=>[],
      resolveParticipantSource:()=>({source:{type:"DIRECT"},teamIds:[]}),
      findSeasonById:()=>null,
      findById:()=>null,
    });
    const transitions=service.buildTransitions([
      {id:30,stageOrder:2,participantSources:[{type:"STANDING",sourceStageId:10,positionFrom:1,positionTo:4}]},
      {id:10,stageOrder:1,participantSources:[]},
      {id:50,stageOrder:3,participantSources:[{type:"QUALIFICATION",sourceStageId:30,positionFrom:1,positionTo:2}]},
    ]);
    expect(transitions).toEqual([
      {fromStageId:10,toStageId:30,sourceType:"STANDING",sourcePositions:[1,2,3,4]},
      {fromStageId:30,toStageId:50,sourceType:"QUALIFICATION",sourcePositions:[1,2]},
    ]);
  });
});
