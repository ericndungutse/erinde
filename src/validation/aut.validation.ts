import { LoginSchema } from '../types/auth.types.js';

export default function validateLogin(data: unknown) {
  const result = LoginSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues.map((err: any) => ({
      [err.path[0]]: err.message,
    }));

    return { success: false, errors };
  }

  return { success: true, data: result.data };
}
