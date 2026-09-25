/**
 * HomeQuote workflow automation — the ONE canonical contract.
 *
 * Future workflow phases must use these contracts. Do not create competing
 * workflow schemas, event names, action names, or shared types. If a required
 * capability is missing, extend this contract deliberately rather than
 * creating a parallel implementation.
 *
 * Source of truth: docs/workflow-automation-architecture.md
 * Database:        supabase/migrations/0020_workflow_automation_foundation.sql
 *
 * Pure and isomorphic (no server-only imports), so UI, server actions, route
 * handlers and tests can all import it.
 */
export * from './domain';
export * from './conditions';
export * from './wait';
export * from './events';
export * from './actions';
export * from './idempotency';
export * from './runs';
export * from './logging';
export * from './definition';
export * from './templates';
export * from './evaluator';
export * from './planner';
export * from './merge';
export * from './ui';
