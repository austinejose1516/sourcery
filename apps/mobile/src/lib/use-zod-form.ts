import { useCallback, useState } from 'react';
import { type z } from 'zod';

type FieldErrors<Values> = Partial<Record<keyof Values, string>>;

export interface ZodForm<Values> {
  values: Values;
  errors: FieldErrors<Values>;
  setField: <K extends keyof Values>(key: K, value: Values[K]) => void;
  /** Validates current values; returns parsed data or null (and sets field errors). */
  validate: () => Values | null;
}

/**
 * Minimal, fully-typed form state backed by a Zod schema. Validates on submit
 * and clears a field's error as the user edits it. Avoids pulling in a heavier
 * form library for these small auth forms.
 */
export function useZodForm<S extends z.ZodType<Record<string, unknown>>>(
  schema: S,
  initialValues: z.infer<S>,
): ZodForm<z.infer<S>> {
  type Values = z.infer<S>;

  const [values, setValues] = useState<Values>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<Values>>({});

  const setField = useCallback<ZodForm<Values>['setField']>((key, value) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  const validate = useCallback<ZodForm<Values>['validate']>(() => {
    const result = schema.safeParse(values);
    if (result.success) {
      setErrors({});
      return result.data;
    }

    const fieldErrors: FieldErrors<Values> = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof Values | undefined;
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    setErrors(fieldErrors);
    return null;
  }, [schema, values]);

  return { values, errors, setField, validate };
}
