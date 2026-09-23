/**
 * Minimal typings for `pg`, which is a devDependency used only by scripts and
 * the RLS integration test. `@types/pg` is not installed, and tsconfig's
 * `**\/*.ts` include means `next build` typechecks those files too — without
 * this the production build fails on `import pg from 'pg'`.
 *
 * Only the surface those files use is declared. Replace with `@types/pg` if
 * the dependency list is ever reopened.
 */
declare module 'pg' {
  // Rows come back shaped by the SQL, so their columns are only known to the
  // caller; a loose record is the honest type here.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type QueryResultRow = Record<string, any>;

  export interface QueryResult<R extends QueryResultRow = QueryResultRow> {
    rows: R[];
    rowCount: number | null;
  }

  export interface ClientConfig {
    connectionString?: string;
    ssl?: boolean | { rejectUnauthorized?: boolean };
  }

  export class Client {
    constructor(config?: ClientConfig);
    connect(): Promise<void>;
    query<R extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: unknown[]
    ): Promise<QueryResult<R>>;
    end(): Promise<void>;
  }

  const pg: { Client: typeof Client };
  export default pg;
}
