import type { FunnelReviewsData } from '@/lib/estimator/reviews';

/*
 * A few real 5-star Google reviews right under the landing's button: a
 * swipeable row of small white cards on a phone (scroll-snap), three across
 * on a desktop. Server-rendered, so there is no layout shift; the landing
 * renders this only when there is at least one review. Never an average
 * rating or a review count, and the heading never claims these are all the
 * reviews. Per Google's attribution rules every card says "Google review" with
 * the G mark, the reviewer's name (linked to their profile when Google gives
 * one) and links back to Google.
 */

function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function FunnelReviews({ data }: { data: FunnelReviewsData }) {
  const { reviews } = data;
  if (!reviews.length) return null;
  const single = reviews.length === 1;
  return (
    <section aria-labelledby="fn-reviews" className="relative z-10 mx-auto mt-[18px] w-full max-w-[1120px] lg:mt-10">
      <h2 id="fn-reviews" className="px-5 text-center text-[13.5px] font-medium leading-[17px] tracking-[-0.005em] text-[#2b2a27] lg:text-[15px]">
        {data.heading}
      </h2>
      <ul
        className={`mt-2 flex snap-x snap-mandatory scroll-px-5 gap-2.5 overflow-x-auto px-5 pb-2 pt-0.5 [scrollbar-width:none] lg:mt-3.5 lg:grid lg:snap-none lg:gap-4 lg:overflow-visible lg:px-8 [&::-webkit-scrollbar]:hidden ${
          single ? 'justify-center lg:mx-auto lg:max-w-[420px] lg:grid-cols-1' : reviews.length === 2 ? 'lg:mx-auto lg:max-w-[760px] lg:grid-cols-2' : 'lg:grid-cols-3'
        }`}
      >
        {reviews.map((r) => (
          <li key={r.id} className={`${single ? 'w-full max-w-[353px] lg:max-w-none' : 'w-[84%] max-w-[330px] lg:max-w-none'} shrink-0 snap-start lg:w-auto`}>
            <figure className="flex h-full flex-col rounded-[12px] border border-black/[0.06] bg-white px-3.5 pb-2.5 pt-2.5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04),0_6px_16px_rgb(0_0_0/0.06)] lg:px-5 lg:pb-4 lg:pt-4">
              <div className="flex items-center justify-between gap-2">
                <span role="img" aria-label="5 out of 5 stars" className="text-[14px] leading-none tracking-[1.5px] text-[#f5a524]">
                  ★★★★★
                </span>
                <span className="flex items-center gap-1.5 text-[12px] leading-none text-[var(--fn-muted)]">
                  <GoogleG className="size-[13px]" />
                  Google review
                </span>
              </div>
              <blockquote className="mt-1.5 line-clamp-3 text-pretty text-[14px] leading-[19px] tracking-[-0.005em] text-[#1f1e1c] lg:line-clamp-none lg:text-[15px] lg:leading-[22px]">
                “{r.text}”
              </blockquote>
              <figcaption className="mt-auto flex items-center justify-between gap-3 pt-2 text-[13px] leading-[18px]">
                <span className="min-w-0 truncate text-[var(--fn-muted)]">
                  {r.authorUri ? (
                    <a href={r.authorUri} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-[#0a0a0a] underline-offset-2 hover:underline">
                      {r.author}
                    </a>
                  ) : (
                    <span className="font-medium text-[#0a0a0a]">{r.author}</span>
                  )}
                  {r.relativeTime ? <> · {r.relativeTime}</> : null}
                </span>
                {r.url ? (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="shrink-0 whitespace-nowrap text-[var(--fn-blue-ink)] underline-offset-2 hover:underline"
                  >
                    Read on Google<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
