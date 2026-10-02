import { useCallback, useState } from "react";
import { editorApi } from "../../../shared/api/editorApi";

export function useDomainSubmit() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (action: () => Promise<unknown>) => {
    setMessage(null);
    setError(null);

    try {
      await action();
      const validation = await editorApi.runValidation();
      const errors = validation.issues.filter(issue => issue.severity === "ERROR").length;
      const warnings = validation.issues.filter(issue => issue.severity === "WARNING").length;

      setMessage(
        errors
          ? `Regra salva, mas a base agora possui ${errors} erro(s) e ${warnings} warning(s). Revise a validação antes de exportar.`
          : `Regra salva e validação concluída: ${warnings} warning(s).`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }, []);

  return { message, error, submit };
}
