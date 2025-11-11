import { ENUMS } from './enums.js';

// Type-safe model and field names
type ModelName = keyof typeof ENUMS;
type FieldName<T extends ModelName> = keyof typeof ENUMS[T];

export function validateEnum<T extends ModelName>(
  model: T,
  field: FieldName<T>,
  value: string | null | undefined,
): void {

  if (value == null) return;

  const allowedValues = ENUMS[model]?.[field] as readonly string[] | undefined;

  if (!allowedValues) {
    throw new Error(`No enum definition found for ${model}.${String(field)}`);
  }

  if (!allowedValues.includes(value)) {
    throw new Error(
      `Invalid value "${value}" for ${model}.${String(field)}. Allowed values: ${allowedValues.join(', ')}`,
    );
  }
}
