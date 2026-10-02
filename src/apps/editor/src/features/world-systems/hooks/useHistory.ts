import { useState } from "react";
import { useDomainSubmit } from "./useDomainSubmit";

export function useHistory() {
  const { message, error, submit } = useDomainSubmit();
  const [award, setAward] = useState({ name:"", competition:"", period:"", recipientType:"", awardType:"", votingType:"", organizer:"", position:"" });
  const [derby, setDerby] = useState({ name:"", club1:"", club2:"", world:"", national:"" });
  const [achievement, setAchievement] = useState({ player:"", team:"", competition:"", type:"" });
  const [history, setHistory] = useState({
    competition:"", year:"", firstTeam:"", secondTeam:"", thirdTeam:"", hostNation:"", hostStadium:"", club:"", position:"",
    award:"", awardYear:"", ranking:"", recipientPerson:"", recipientClub:"", recipientNation:"",
  });
  return { message, error, submit, award, setAward, derby, setDerby, achievement, setAchievement, history, setHistory };
}
