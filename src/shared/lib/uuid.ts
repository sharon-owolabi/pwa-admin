const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The API takes UUIDs for merchant ids; anything else would 400, so it is not sent. */
export const isUuid = (value: string | undefined): value is string => !!value && UUID.test(value);
export const uuidOrUndefined = (value: string | undefined): string | undefined =>
  isUuid(value) ? value : undefined;
