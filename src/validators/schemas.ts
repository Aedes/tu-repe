import { z } from "zod";

export const uuidParam = z.string().uuid();
export const hexColor = z
	.string()
	.regex(
		/^#([0-9a-fA-F]{6})$/,
		"El color tiene que ser un código como #0077b6",
	);
export const timeHm = z
	.string()
	.regex(
		/^\d{2}:\d{2}(:\d{2})?$/,
		"El horario tiene que estar en formato HH:mm",
	);
export const slug = z.string().regex(/^[a-z0-9-]{3,32}$/);

export const themeSchema = z
	.object({
		primary: hexColor,
		secondary: hexColor,
		background: hexColor,
	})
	.strict();

export const loginSchema = z
	.object({
		email: z.string().email("El email no es válido").max(255),
		password: z.string().min(1, "La contraseña es obligatoria").max(200),
		totp: z
			.string()
			.regex(/^\d{6}$/, "El código MFA tiene que tener 6 dígitos")
			.optional(),
	})
	.strict();

export const createUserSchema = z
	.object({
		name: z.string().trim().min(1, "El nombre es obligatorio").max(100),
		email: z.string().trim().email("El email no es válido").max(255),
		password: z
			.string()
			.min(12, "La contraseña debe tener al menos 12 caracteres")
			.max(200)
			.regex(/[A-Z]/, "La contraseña debe incluir una mayúscula")
			.regex(/[a-z]/, "La contraseña debe incluir una minúscula")
			.regex(/[0-9]/, "La contraseña debe incluir un número"),
	})
	.strict();

export const updateUserSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "El nombre es obligatorio")
			.max(100)
			.optional(),
		email: z.string().email("El email no es válido").max(255).optional(),
	})
	.strict();

export const clubCreateSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "El nombre del club es obligatorio")
			.max(100),
		openTime: timeHm,
		closeTime: timeHm,
		appointmentDuration: z
			.number({ error: "La duración del turno tiene que ser un número" })
			.int()
			.min(
				3,
				"La duración del turno tiene que ser de al menos 15 minutos",
			)
			.max(240, "La duración del turno no puede superar los 240 minutos"),
		country: z.string().trim().min(1, "El país es obligatorio").max(100),
		province: z
			.string()
			.trim()
			.min(1, "La provincia es obligatoria")
			.max(100),
		city: z.string().trim().min(1, "La ciudad es obligatoria").max(100),
		address: z
			.string()
			.trim()
			.min(1, "La dirección es obligatoria")
			.max(255),
		phone: z.string().trim().max(40).nullish(),
		instagramHandle: z.string().trim().max(64).nullish(),
		description: z.string().trim().max(2000).nullish(),
	})
	.strict();

export const clubUpdateSchema = clubCreateSchema.partial().strict();
export const ownerClubUpdateSchema = clubUpdateSchema
	.omit({})
	.strict()
	.superRefine((value, ctx) => {
		if ("urlId" in value) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "urlId no es editable",
			});
		}
	});

export const clubThemeSchema = z
	.object({
		theme: themeSchema,
	})
	.strict();

export const courtCreateSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "El nombre de la cancha es obligatorio")
			.max(50),
		clubId: uuidParam,
		cameraHost: z
			.string()
			.trim()
			.min(1, "Indicá la dirección de la cámara")
			.max(255),
	})
	.strict();

export const courtAdminUpdateSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "El nombre de la cancha es obligatorio")
			.max(50)
			.optional(),
		cameraHost: z
			.string()
			.trim()
			.min(1, "Indicá la dirección de la cámara")
			.max(255)
			.optional(),
	})
	.strict();

export const courtOwnerUpdateSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(1, "El nombre de la cancha es obligatorio")
			.max(50),
	})
	.strict();

export const videoCreateSchema = z
	.object({
		courtId: uuidParam,
		fileName: z.string().min(1).max(255),
		b2FilePath: z.string().min(1).max(500),
		startTime: z.string().datetime(),
		endTime: z.string().datetime(),
	})
	.strict()
	.refine((value) => new Date(value.startTime) < new Date(value.endTime), {
		message: "startTime must be before endTime",
	});

export const videoUpdateSchema = z
	.object({
		fileName: z.string().min(1).max(255).optional(),
		b2FilePath: z.string().min(1).max(500).optional(),
		startTime: z.string().datetime().optional(),
		endTime: z.string().datetime().optional(),
	})
	.strict();

export const videoRenderBodySchema = z
	.object({
		clubUrlId: z.string().min(8).max(32),
		courtId: uuidParam,
		startTime: z.string().datetime(),
		turnstileToken: z.string().min(1).optional(),
		continuationToken: z.string().min(20).max(2000).optional(),
		mode: z.enum(["parts", "unified", "assess"]).default("assess"),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.mode === "unified" && value.continuationToken) return;
		if (!value.turnstileToken) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Completá el CAPTCHA para buscar el partido",
				path: ["turnstileToken"],
			});
		}
	});

export const videoUrlsQuerySchema = z
	.object({
		clubUrlId: z.string().min(8).max(32),
		courtId: uuidParam,
		startTime: z.string().datetime(),
		turnstileToken: z.string().min(1),
	})
	.strict();

export const videoRangeQuerySchema = z
	.object({
		startTime: z.string().datetime(),
		endTime: z.string().datetime(),
		courtId: uuidParam,
	})
	.strict();

export const ownerAssignSchema = z
	.object({
		userId: uuidParam,
		clubId: uuidParam,
	})
	.strict();

export const rtmpWebhookSchema = z
	.object({
		action: z.string().min(1),
		path: z.string().min(1).optional(),
	})
	.strict();

export const imageContextSchema = z.enum(["logo", "cover"]);

const CLIP_OFFSET_MIN_MS = -6 * 60 * 60 * 1000;
const CLIP_OFFSET_MAX_MS = 24 * 60 * 60 * 1000;

export const clipExtractSchema = z
	.object({
		clubUrlId: z.string().min(8).max(32),
		courtId: uuidParam,
		appointmentStartTime: z.string().datetime(),
		offsetMs: z.number().int().min(CLIP_OFFSET_MIN_MS).max(CLIP_OFFSET_MAX_MS),
		durationMs: z.number().int().min(1000).max(30000),
		turnstileToken: z.string().min(1),
	})
	.strict();
