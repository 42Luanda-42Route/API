export const errorPayloadProperties = {
  error: { type: "string" },
  message: { type: "string" },
  code: { type: "string" },
  hint: { type: "string" },
}

export const errorPayloadSchema = {
  type: "object",
  properties: errorPayloadProperties,
}
