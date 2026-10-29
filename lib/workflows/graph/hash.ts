import { createHash } from 'node:crypto';
import { semanticGraph } from './edit';
import type { WorkflowGraph } from './model';

/**
 * The content hash stored on workflow_graph_drafts.content_hash (and copied to the published version):
 * sha256 of the graph's semantic form (node positions ignored, nodes/edges sorted). Server-only (node:crypto),
 * so it is deliberately not re-exported from the graph index used by the client builder.
 */
export const hashGraph = (g: WorkflowGraph) => createHash('sha256').update(semanticGraph(g)).digest('hex');
