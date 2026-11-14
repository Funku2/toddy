# The Biological Edge

The website for [thebiologicaledge.com](https://thebiologicaledge.com): a content site, email capture and shop for men 40 to 60. Built with [Astro](https://astro.build) as a static site.

The marketing plan is in [`docs/marketing-plan.md`](docs/marketing-plan.md).

## Run it

```bash
npm install
npm run dev      # local preview at http://localhost:4321
npm run build    # production build into dist/
```

## Where things are

| To change | Edit |
|---|---|
| Site name, tagline, email, social links, email-form provider | `src/site.config.ts` |
| Shop products, affiliate links, prices, checkout links | `src/data/products.ts` |
| Articles (one Markdown file each) | `src/content/articles/` |
| The free guide | `src/pages/guide/edge-reset.astro` |
| Photos | `src/assets/images/` |
| Colours, fonts, layout | `src/styles/global.css` |
| Logo | `public/logo.svg`, `public/favicon.svg`, `src/components/Logo.astro` |

## How the shop works

- **Partner products** link out to a retailer. Until an affiliate link is added, the button searches Amazon.ca for the item. Add `url` and `partner` to a product and the button and affiliate label update.
- **Digital products** are sold here. Create a Stripe Payment Link, paste it into `checkoutUrl`, set `price`, and the page switches from "Join the waitlist" to "Buy now".

## Before launch

- [ ] Todd reviews every first-person line (home page, story, articles, product notes) for accuracy
- [ ] Replace the AI-generated photos of a man with real photos of Todd
- [ ] Deploy (Netlify works with no extra setup: forms are collected by Netlify Forms) and point the domain at it
- [ ] Connect an email provider, or keep Netlify Forms and export sign-ups
- [ ] Create `hello@thebiologicaledge.com`
- [ ] Have the privacy and terms pages reviewed
- [ ] Have TRT-related content checked against Health Canada advertising rules
- [ ] Add social links in `src/site.config.ts`
