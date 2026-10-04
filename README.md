# Okulya Café

Website for Okulya Café, Rua do Mat, Talatona, Luanda. Static HTML, CSS and JS with no build step. It deploys as-is to Vercel or any static host.

## Run locally

```sh
python -m http.server 8137
# open http://127.0.0.1:8137
```

## Pages

| File | Content |
| --- | --- |
| `index.html` | Hero, "um dia no okulya" scroll story, menu teaser, experiences, Instagram, contact |
| `menu.html` | Full menu (entradas, pratos principais, sobremesas, bebidas) with prices in Kz |
| `sobre.html` | The story, the name (Umbundu for "to eat"), lunch values |
| `experiencias.html` | Prato do dia, promotions, corporate events, birthdays, weekly event |

The header, mobile menu, contact section ("encontra-nos") and footer are repeated in all four files. When you change one of them, change it in every page.

## Structure

```
assets/css/style.css   design tokens at the top (:root), then sections in page order
assets/js/main.js      all interactions; each block checks the element exists first
assets/vendor/         GSAP 3.13 + ScrollTrigger, Lenis (self-hosted, no CDN)
assets/img/            optimised WebP; instagram/ holds thumbnails from @0kulya.cafe
```

## Design notes

- **Colours:** whitewash `#FFFEFB`, espresso `#2A1810`, amber `#EE9B22` (from the logo swoosh), honey `#FFD48A`, sky `#A9D8EA` (the café's window frames).
- **Type:** Caprasimo for display headings, Hanken Grotesk for body text, both from Google Fonts. Headings are lowercase, like the logo.
- **Hero:** the "o" of "okulya" is a window onto the café wall (`parede-okulya.webp`, a real photo from the okulyacafe2 project). Scrolling pins the hero and opens the "o" until the photo fills the screen and "um dia no okulya" appears on it. This only runs where the hero fits one screen (desktop at least 640px tall, phones at least 740px tall). Elsewhere the "o" is a static photo.
- **Signature moment:** the pinned porthole on the homepage. As you scroll, photos rise through one circle, the sun arcs across, and the page goes from morning to night.
- **Motion respects `prefers-reduced-motion`.** With reduced motion, or without JS, every section renders as a normal static page.

## Before launch

- [ ] Replace the stock-style photos (`day-*.webp`, `plate-*.webp`, carried over from the previous site) with real photos of Okulya's food and space. Keep the file names, or update the `src` paths.
- [ ] The Instagram thumbnails are only 240×427. Ask the client for the originals.
- [ ] Confirm with the client:
  - that coffee is served from 10h, as the old site said, even though the café opens at 7h
  - the menu prices
  - what happens at the weekly event
- [ ] Set `og:image` to an absolute URL once the domain is known.
- [ ] The "aberto agora" status uses Luanda time but cannot know about public holidays. The full hours are always shown next to it.
