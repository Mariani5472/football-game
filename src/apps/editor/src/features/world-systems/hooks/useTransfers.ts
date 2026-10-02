import { useState } from "react";
import { useDomainSubmit } from "./useDomainSubmit";

export function useTransfers() {
  const { message, error, submit } = useDomainSubmit();
  const [windowConfig, setWindowConfig] = useState({ competition:"", nation:"", name:"", start:"", end:"" });
  const [transfer, setTransfer] = useState({
    player: "", origin: "", destination: "", type: "", status: "", window: "", date: "", fee: "", currency: "",
    permanent: true, loan: false, installment: false, installmentAmount: "", installmentPeriods: "", interval: "", installmentDirection:"",
    wageContribution: "", wageDirection: "", resale: "", sale: "",
  });
  const [contract, setContract] = useState({
    person: "", club: "", employment: "", start: "", end: "", type: "", salary: "", squad: "", clauseType: "", clauseValue: "", clausePercentage: "",
  });
  return { message, error, submit, windowConfig, setWindowConfig, transfer, setTransfer, contract, setContract };
}
