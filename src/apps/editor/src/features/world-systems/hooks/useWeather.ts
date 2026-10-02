import { useState } from "react";
import { useDomainSubmit } from "./useDomainSubmit";

export function useWeather() {
  const { message, error, submit } = useDomainSubmit();
  const [weather, setWeather] = useState({
    climate:"", season:"", startDay:"", rainDry:"", rainHumid:"", rainShower:"", windCalm:"", windBreeze:"", windStorm:"",
    variation:"", variationValue:"", region:"",
  });
  return { message, error, submit, weather, setWeather };
}
