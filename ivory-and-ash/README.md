# Ivory & Ash Painting

The website for Ivory & Ash, a high-end painting firm in Calgary, Alberta. Built with [Astro](https://astro.build) as a static site, with one small server function for the voice concierge.

This folder is a separate site from the one in the repository root.

## Run it

```bash
cd ivory-and-ash
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # production build into dist/
```

The voice concierge and the forms only work once the site is deployed (see below).

## Where things are

| To change | Edit |
|---|---|
| Phone, email, Instagram, neighbourhoods, reply time, concierge voice | `src/site.config.ts` |
| Home page wording, services, portfolio captions, questions, form fields | `src/pages/index.astro` |
| Photos | `src/assets/images/` (keep the same file names, or update the names in `index.astro`) |
| Colours, fonts, layout | `src/styles/global.css` |
| What the concierge says and asks | `instructions()` in `src/scripts/concierge.ts` |
| Privacy page | `src/pages/privacy.astro` |

## Deploy on Netlify

1. Create a new Netlify site from this repository and set **Base directory** to `ivory-and-ash`. The build settings come from `netlify.toml`.
2. Add an environment variable `XAI_API_KEY` with an xAI API key. The key stays on the server; visitors only ever receive a token that expires after two minutes.
3. Turn on **Forms**. Two forms will appear after the first deploy: `consultation` (the written form) and `concierge-enquiry` (requests taken by the voice concierge, with a transcript). Add an email notification for each so new enquiries reach you.
4. Point the domain at the site and update the address in `astro.config.mjs`, `src/site.config.ts` and `public/robots.txt` if it is not `ivoryandash.ca`.

## The voice concierge

- Uses xAI's Grok Voice 3.0 (`grok-voice-3.0`) over a WebSocket from the visitor's browser.
- `netlify/functions/voice-token.mjs` issues the short-lived token. It only answers requests from the site's own pages and allows five conversations per visitor every ten minutes.
- Each conversation ends automatically after `concierge.maxMinutes` (six by default). xAI bills voice by the minute, so set a spending limit in the xAI console as well.
- The concierge never quotes prices or dates. It collects the caller's details and files them as a `concierge-enquiry` form submission.
- If the key is missing or the microphone is refused, visitors are directed to the written form.
- To switch it off, set `concierge.enabled` to `false` in `src/site.config.ts`.

## Before launch

- [ ] Replace the photographs with real Ivory & Ash projects as they are completed. The current images are AI-generated and illustrative; the footer says so. Remove that footer line once every photo is your own work.
- [ ] Confirm every claim on the page is true for the business: liability insurance, WCB coverage, written warranty, fixed-price proposals, dedicated crews, colour consultations, limewash and sprayed cabinetry.
- [ ] Add the phone number and email address in `src/site.config.ts`.
- [ ] Register the domain and the business name (NUANS search for Alberta). Note that an unrelated "Ivory & Ash Hair Co." operates in Aldergrove, BC.
- [ ] Have the privacy page reviewed.
- [ ] Test the concierge on the live site with a real xAI key, on a phone and a computer.
- [ ] Adjust the investment ranges in the form to match your minimum project size.
