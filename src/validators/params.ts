import { z } from "zod"
import { imageContextSchema, slug, uuidParam } from "./schemas"

export const idParamSchema = z.object({ id: uuidParam }).strict()
export const courtIdParamSchema = z.object({ courtId: uuidParam }).strict()
export const urlIdParamSchema = z.object({ urlId: slug.or(z.string().min(8).max(32)) }).strict()
export const imageContextParamSchema = z.object({
    id: uuidParam,
    context: imageContextSchema,
}).strict()
