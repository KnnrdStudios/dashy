# Vintage 2 Digital — Business Website

A static, self-contained marketing site for **Vintage 2 Digital**, a media
digitization service that transfers VHS tapes, film reels, photos, slides, and
audio cassettes to modern digital formats.

## Stack

Pure HTML / CSS / JavaScript — no build step, no dependencies.

## Run locally

Just open `index.html` in a browser, or serve the folder:

```bash
# from repo root
cd vintage2digital
python3 -m http.server 8080
# then visit http://localhost:8080
```

## File layout

```
vintage2digital/
├── index.html          Single-page site markup
├── assets/
│   ├── styles.css      Full design system + responsive layout
│   └── main.js         Nav, reveal-on-scroll, FAQ accordion, form
└── README.md
```

## Sections

Nav · Hero · Supported formats · Services · Process · Pricing · About ·
Testimonials · FAQ · Contact form · Footer.

## Customizing

- **Copy**: edit `index.html` directly.
- **Colors / fonts**: CSS variables at the top of `assets/styles.css`.
- **Form endpoint**: the contact form in `assets/main.js` currently simulates a
  submit. Replace the `setTimeout` with a real `fetch()` to your backend or a
  service like Formspree / Netlify Forms.
