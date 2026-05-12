import { z } from 'zod';
import { BadRequestError } from '../../utils/AppError';

const googleClientIdSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => value.endsWith('.apps.googleusercontent.com'), {
    message: 'must be a Google OAuth client ID'
  });

const jwtSecretSchema = z.string().min(32, 'must be at least 32 characters');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url(),
  MONGO_URI: z.string().min(1),
  JWT_ACCESS_SECRET: jwtSecretSchema,
  JWT_REFRESH_SECRET: jwtSecretSchema,
  GOOGLE_CLIENT_ID: googleClientIdSchema,
  CUSTOM_IDP_URL: z.string().url(),
  CUSTOM_IDP_CLIENT_ID: z.string().min(1),
  CUSTOM_IDP_CLIENT_SECRET: z.string().min(1),
  CUSTOM_IDP_REDIRECT_URI: z.string().url()
});

export type Env = z.infer<typeof envSchema>;

export const googleLoginBodySchema = z.object({
  idToken: z.string().trim().min(1, 'idToken is required')
});

export const customIdpLoginBodySchema = z.object({
  code: z.string().trim().min(1, 'code is required'),
  code_verifier: z.string().trim().min(1, 'code_verifier is required')
});

export const parseBody = <T>(schema: z.ZodType<T>, body: unknown): T => {
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new BadRequestError('Invalid request body');
  }

  return result.data;
};
