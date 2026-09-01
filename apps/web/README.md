This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## 🚀 Platform & Tech Stack

**BeOneOfUs** is a modern, high-performance web application built with scalability and responsiveness in mind.

### Core Framework
*   **Framework:** [Next.js](https://nextjs.org/) (Version 16.2.2)
*   **Routing:** App Router (with mixed Static & Dynamic rendering)
*   **Package Manager:** npm

### Deployment & Infrastructure
*   **Hosting Platform:** [Vercel](https://vercel.com/)
*   **Deployment Region:** Washington, D.C., USA (East) – `iad1`
*   **Build Environment:** 2 Cores, 8 GB RAM

### Rendering Strategy & Runtimes
This project utilizes a hybrid rendering approach to ensure optimal performance and SEO:
*   **Static Generation (SSG):** Pages like the dashboard, exploring projects, and community hubs are pre-rendered as static content for lightning-fast delivery.
*   **Dynamic Rendering:** Content requiring real-time data uses on-demand server rendering.
*   **Edge Runtime:** High-speed API routes (such as `/api/chats` and `/api/invite`) and mail notifications are powered by the Vercel Edge Runtime for lowest-latency execution worldwide.

### Project Structure (Key Routes)
*   `/` - Landing Page
*   `/auth` - User Authentication
*   `/dash` & `/founder-dashboard` - Management and Analytics
*   `/Explore_Projects` & `/projects` - Project Discoveryss
*   `/community` & `/member-dashboard` - User Portals
*   `/IDEPage` - Integrated Development Environment
