import { useState } from "react";
import { useDomainSubmit } from "./useDomainSubmit";

export function useFinance() {
  const { message, error, submit } = useDomainSubmit();
  const [finance, setFinance] = useState({
    club: "", balance: "", transferBudget: "", wageBudget: "", monthlyWage: "", embargoType: "", embargoStart: "", embargoEnd:"",
    revenueAmount:"", revenueType:"", debtAmount:"", debtSource:"", interest:"", ffpAmount:"", ffpYear:"", ffpCompetition:"",
  });
  return { message, error, submit, finance, setFinance };
}
