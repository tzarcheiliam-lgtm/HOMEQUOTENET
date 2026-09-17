/**
 * Re-exports the shared marketing OG image so this route emits its own
 * og:image tag.
 *
 * Needed because this page declares its own `openGraph` metadata block, which
 * replaces the parent layout's object wholesale — including the inherited
 * image. A file-based image in the route's own segment is applied regardless.
 * Edit the artwork in app/(marketing)/opengraph-image.tsx; this file is only a
 * pointer.
 */
export { default, alt, size, contentType } from '../opengraph-image';

// `runtime` cannot be re-exported from another module, so it is declared here.
export const runtime = 'nodejs';
