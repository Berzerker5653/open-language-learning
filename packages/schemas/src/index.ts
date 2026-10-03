/**
 * Generated TypeScript bindings for the public language-pack schemas
 * (schemas/*.schema.json). PACK-001 will generate these from the schema
 * sources; until then this module only re-exports the provisional contract
 * metadata so consumers have a stable import path.
 *
 * Do not hand-edit generated outputs once generation lands (docs/19).
 */

/** Version of the provisional scaffold schemas. */
export const SCHEMA_VERSION = "0.1";

/** Names of the provisional Draft 2020-12 schema files in /schemas. */
export const PROVISIONAL_SCHEMAS = [
  "language-pack-manifest",
  "source-entry",
  "concept",
  "goal",
  "unit",
  "speech-profile",
  "lexical-entry",
] as const;

export type ProvisionalSchema = (typeof PROVISIONAL_SCHEMAS)[number];
