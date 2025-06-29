import { z } from 'zod';

export const repositorySchema = z.object({
  owner: z.string().min(1, 'Owner is required'),
  repo: z.string().min(1, 'Repository name is required'),
  branch: z.string().min(1, 'Branch is required')
});

export const chatMessageSchema = z.object({
  user_prompt: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long')
});

export const embeddingSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  url: z.string().url('Valid URL is required')
});

export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error.errors.map(e => e.message).join(', ')}`);
  }
  return result.data;
}