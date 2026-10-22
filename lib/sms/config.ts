import 'server-only';

/** The bridge token is the on/off switch for the whole feature at the env level. Without it nothing is queued. */
export const smsBridgeToken = () => process.env.SMS_BRIDGE_TOKEN?.trim() || '';
export const smsConfigured = () => smsBridgeToken().length >= 24;
export const smsModel = () => process.env.SMS_MODEL?.trim() || 'claude-haiku-5-5';
/** AI replies per conversation before a human takes over. */
export const MAX_AI_TURNS = 14;
export const DEFAULT_ZONES = ['America/New_York', 'America/Los_Angeles'];
