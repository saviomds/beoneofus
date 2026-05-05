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
*   `/Explore_Projects` & `/projects` - Project Discovery
*   `/community` & `/member-dashboard` - User Portals
*   `/IDEPage` - Integrated Development Environment
