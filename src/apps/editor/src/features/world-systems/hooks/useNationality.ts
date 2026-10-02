import { useState } from "react";
import { useDomainSubmit } from "./useDomainSubmit";

export function useNationality() {
  const { message, error, submit } = useDomainSubmit();
  const [nationality, setNationality] = useState({
    nation:"", ruleType:"RESIDENCE_YEARS", value:"", requiredNation:"", cumulative:false, minAge:"", maxAge:"",
    years:"", matches:"", treatmentNation:"", treatmentType:"", treatmentValue:"",
  });
  return { message, error, submit, nationality, setNationality };
}
