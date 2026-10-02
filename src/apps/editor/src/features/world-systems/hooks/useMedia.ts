import { useState } from "react";
import { useDomainSubmit } from "./useDomainSubmit";

export function useMedia() {
  const { message, error, submit } = useDomainSubmit();
  const [media, setMedia] = useState({ name:"", period:"", reach:"", pressTypes:"", areaType:"nation", areaId:"", conferences:false });
  return { message, error, submit, media, setMedia };
}
