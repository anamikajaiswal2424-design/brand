# NORTHLINE — Next.js commerce starter

A modern responsive catalog, collection, product details, cart, order summary, COD checkout, confirmation page, and a password-protected admin panel. All products, categories, banners and settings live in **`data/store.js`**; orders live in **`data/orders.json`**. No database required. Product photos are demo external URLs: replace them with your own licensed product images.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000 and http://localhost:3000/admin. Add the environment variables below to `.env.local`. Deploy this repository to Vercel and add the exact same environment variables in Vercel Project Settings.

## The important Vercel storage detail

Vercel function files are **read-only / ephemeral** at runtime: `fs.writeFile('data/store.js', ...)` does not permanently save content. Admin saves through a **GitHub fine-grained token** with only **Contents: Read and write** access to this specific repository, using the GitHub Contents API. Each save commits the new JS file to the connected GitHub repository. Vercel automatically deploys the commit; runtime reads the latest source via the GitHub API. Orders are similarly committed as JSON.

Environment variables (server-only, **never** prefix with NEXT_PUBLIC_):
- `ADMIN_PASSWORD`: unique password of 12+ characters
- `SESSION_SECRET`: random secret of 32+ characters
- `GITHUB_TOKEN`: fine-grained GitHub PAT scoped to this repository with Contents read/write
- `GITHUB_OWNER`: username/organisation
- `GITHUB_REPO`: repository name
- `GITHUB_BRANCH`: deployment branch, normally `main`

**Do not commit `.env.local` or real secrets to GitHub.** Keep the GitHub repo private: orders contain personal information. Use custom production media URLs from your own image CDN; the admin currently stores image URLs, not binary image uploads. The store's public pages will show demo content without GitHub configuration, but saving products or orders requires configured GitHub access.

## Limitations and production checks

- Checkout currently supports **Cash on Delivery only**. No real UPI/Paytm/Cashfree payment gateway is integrated; payment tracking is intentionally not implemented.
- This is a deployable starter, **not a hardened high-volume commerce backend**. GitHub-as-order-storage is low-volume only; concurrent writes may conflict, and it does not reserve inventory. For substantial orders, use a real transactional backend/hosted checkout or database.
- Admin login uses a signed HttpOnly SameSite Strict cookie. Add production rate limiting/WAF, admin 2FA or managed authentication, audit logs and stronger schema validation before accepting significant traffic.
- Do not use real customer data until you have established privacy, retention and access policies. The admin orders list contains personal information and the GitHub repo must be restricted.
- Add order notification handling, transaction and stock reconciliation, policy pages (reflecting your actual business practices), and a real image upload/storage service before public launch.
- Category tiles, images and editorial copy are original demo templates, not Nobero materials.

## Imported winter catalog

34 products were imported from Winteraura's public Shopify catalog, including prices in INR, descriptions, 168 image URLs and all 990 size/colour combinations. This is a one-time catalog snapshot, not a live Shopify inventory integration. The public feed exposes availability, not inventory quantities; imported products use a local order cap of 10. Review actual stock in the admin before accepting orders. Existing demo products are retained.

