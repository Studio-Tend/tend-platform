import { Fraunces, Inter } from 'next/font/google';

/**
 * Both families are self-hosted by `next/font` — downloaded at build time and
 * served from our own domain, so there is no render-blocking request to
 * fonts.googleapis.com the way the static landing page had.
 *
 * `opsz` is Fraunces' optical-size axis; without it `font-optical-sizing: auto`
 * has nothing to act on and the display sizes lose their tighter shapes.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-fraunces',
});

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
