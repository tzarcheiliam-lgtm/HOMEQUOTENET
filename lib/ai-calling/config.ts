/** Global kill switch: nothing may place an AI call unless this is exactly "true". */
export function aiCallingEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.AI_CALLING_GLOBAL_ENABLED?.trim().toLowerCase() === 'true';
}

export const E164 = /^\+[1-9]\d{7,14}$/;
