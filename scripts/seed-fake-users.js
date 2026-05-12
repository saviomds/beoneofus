/**
 * Seed script: creates 30 realistic fake users (developers, creators, students),
 * each with a profile, 2 posts, and a follow connection to the target account.
 *
 * Run with:  node scripts/seed-fake-users.js
 *
 * Safe to re-run — skips users whose email already exists.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jwjrogchwfzofpaczaah.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3anJvZ2Nod2Z6b2ZwYWN6YWFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgzMzY5MywiZXhwIjoyMDkxNDA5NjkzfQ.RN1A69GeLncJPnIK_whubHdjGxWBGEPXysd5sBo5GqY';
const TARGET_EMAIL = 'dominiquesavio2003@gmail.com';
const FAKE_PASSWORD = 'FakeUser@Seed2026!';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ---------------------------------------------------------------------------
// User definitions
// ---------------------------------------------------------------------------
const FAKE_USERS = [
  // ── Developers (1-10) ────────────────────────────────────────────────────
  {
    email: 'alex.chen.dev@beoneofus-seed.com',
    username: 'alexchen_dev',
    full_name: 'Alex Chen',
    status: 'Full-stack engineer • React + Node.js • Building cool things 🚀',
    location: 'San Francisco, CA',
    github: 'alexchen-dev',
    website: 'https://alexchen.dev',
    work_status: 'Open to work',
    avatar: 'https://randomuser.me/api/portraits/men/1.jpg',
    banner: 'https://picsum.photos/seed/alexchen/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'My journey from jQuery to React in 2026',
        content:
          "Three years ago I was writing spaghetti jQuery and calling it a day. Today I'm shipping complex React apps with TypeScript and I honestly couldn't be happier.\n\nThe shift in mental model is the hardest part — from imperative DOM manipulation to declarative UI. Once it clicks, you can never go back.\n\nWhat's your origin story with modern frontend?",
        code_snippet: `// Old jQuery way
$('#btn').on('click', function() {
  $('#result').text('Hello!');
});

// Modern React
function App() {
  const [msg, setMsg] = useState('');
  return (
    <button onClick={() => setMsg('Hello!')}>
      {msg || 'Click me'}
    </button>
  );
}`,
        code_language: 'javascript',
      },
      {
        title: 'Why I moved my entire infra to Edge Functions',
        content:
          "Cold starts were killing my side project's UX. Switched from AWS Lambda to Vercel Edge Functions last month — p99 latency dropped from 800ms to 60ms.\n\nThe trade-off: no Node built-ins, Web APIs only. For 90% of use-cases that's totally fine.\n\nAnyone else made this switch? Worth it?",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'priya.sharma.eng@beoneofus-seed.com',
    username: 'priya_builds',
    full_name: 'Priya Sharma',
    status: 'Backend engineer • Python & Go • Distributed systems nerd',
    location: 'London, UK',
    github: 'priya-builds',
    website: '',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/2.jpg',
    banner: 'https://picsum.photos/seed/priyasharma/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'Lessons learned running Kafka at scale',
        content:
          "After two years running Kafka in production (100M+ messages/day), here are the things I wish someone had told me:\n\n1. **Partition count is hard to change** — plan ahead\n2. **Consumer lag is your canary** — alert on it early\n3. **Schema Registry saves relationships** — use it from day one\n4. **Replication factor ≥ 3** in prod, always\n\nWould love to hear from others who've been through this.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Go vs Python for microservices — my honest take',
        content:
          'I write Python at my day job and Go for side projects. Here is the brutal truth after 3 years of both:\n\n**Go wins:** latency, memory footprint, deployment simplicity, concurrency primitives\n**Python wins:** iteration speed, ML ecosystem, readability for non-engineers\n\nFor a new microservice with no ML? Go every time.',
        code_snippet: `// Go — simple HTTP server, ~5MB binary
package main

import (
  "fmt"
  "net/http"
)

func main() {
  http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintln(w, "Hello from Go!")
  })
  http.ListenAndServe(":8080", nil)
}`,
        code_language: 'javascript',
      },
    ],
  },
  {
    email: 'marcus.thompson.react@beoneofus-seed.com',
    username: 'marcusthompson',
    full_name: 'Marcus Thompson',
    status: 'React developer • OSS contributor • Coffee-driven ☕',
    location: 'Austin, TX',
    github: 'marcus-thompson',
    website: 'https://marcus.codes',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    banner: 'https://picsum.photos/seed/marcust/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'useCallback — when it helps and when it hurts',
        content:
          "Everyone wraps every function in useCallback \"just to be safe\". That's actually wrong and can slow your app down.\n\nuseCallback only helps when:\n- The function is a dependency of useMemo / useEffect\n- You pass it to a memoized child component\n\nOtherwise you're paying the closure allocation cost for zero benefit.",
        code_snippet: `// Only useful here — passed to memoized child
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Pointless — used inline, no optimization gain
const handleChange = useCallback((e) => {
  setValue(e.target.value);
}, []);`,
        code_language: 'javascript',
      },
      {
        title: "I built a full SaaS in 48 hours — here's what I used",
        content:
          "Hackathon weekend. 48 hours. Here's the stack that got me to a working product:\n\n- **Next.js 16** — routing + SSR\n- **Supabase** — auth + DB + storage\n- **Tailwind 4** — styling at the speed of thought\n- **Stripe** — payments in under an hour\n\nThe biggest time sink? Writing the landing page copy. The tech was the easy part.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'sofia.rodriguez.devops@beoneofus-seed.com',
    username: 'sofia_devops',
    full_name: 'Sofia Rodriguez',
    status: 'DevOps & Platform engineer • Kubernetes • Terraform • GitOps',
    location: 'Madrid, Spain',
    github: 'sofia-devops',
    website: '',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/4.jpg',
    banner: 'https://picsum.photos/seed/sofiar/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'The day our Kubernetes cluster fell over at 2am',
        content:
          "Lesson learned at 2am on a Friday: resource limits matter.\n\nWe had a rogue pod consuming 40GB of memory because nobody set a limit. It triggered an OOM kill cascade that took out 6 services.\n\nNow every single workload has `resources.limits` set. Non-negotiable. The 30-minute config review saved us from another 4-hour incident.",
        code_snippet: `resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"`,
        code_language: 'bash',
      },
      {
        title: 'Terraform state management — the missing guide',
        content:
          'State files are where Terraform secrets live and where most teams cut corners. Things that have burned me:\n\n- Storing state in git (never, ever do this)\n- Not enabling state locking (concurrent applies = corruption)\n- No state backup strategy\n\nProper setup: remote backend (S3/GCS), DynamoDB lock table, versioning enabled, least-privilege IAM.',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'liam.obrien.python@beoneofus-seed.com',
    username: 'liam_codes',
    full_name: "Liam O'Brien",
    status: 'Python developer • Django & FastAPI • Open source enthusiast',
    location: 'Dublin, Ireland',
    github: 'liam-obrien',
    website: 'https://liamobrien.ie',
    work_status: 'Open to work',
    avatar: 'https://randomuser.me/api/portraits/men/5.jpg',
    banner: 'https://picsum.photos/seed/liamob/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'FastAPI just made Django feel heavy',
        content:
          'I have been a Django dev for 5 years. Tried FastAPI on a side project and my relationship with Python web dev changed forever.\n\nFastAPI wins: automatic OpenAPI docs, native async, Pydantic validation, 3x faster request handling.\n\nDjango still wins: ORM, admin panel, batteries-included for complex apps.\n\nFor new APIs? FastAPI. For feature-rich web apps? Django still king.',
        code_snippet: `from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float

@app.post("/items/")
async def create_item(item: Item):
    return {"item": item, "status": "created"}`,
        code_language: 'python',
      },
      {
        title: 'Async Python — the concepts that finally made it click',
        content:
          "Async Python confused me for years. Here's what finally made it click:\n\n**Event loop** = a single thread taking turns running tasks\n**await** = \"pause me until this IO is done, let others run\"\n**async def** = \"I can be paused and resumed\"\n\nIt's NOT parallel. It's cooperative multitasking. For IO-bound work (network, DB) it's phenomenal. For CPU-bound work, use multiprocessing.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'aisha.patel.ml@beoneofus-seed.com',
    username: 'aisha_ml',
    full_name: 'Aisha Patel',
    status: 'ML Engineer • PyTorch • Building AI products people actually use',
    location: 'Toronto, Canada',
    github: 'aisha-ml',
    website: '',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/6.jpg',
    banner: 'https://picsum.photos/seed/aishap/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'Why 90% of ML projects never reach production',
        content:
          "After 4 years in ML engineering, I've seen this pattern over and over:\n\n1. Data scientist builds amazing model (95% accuracy on test set!)\n2. Engineers spend 6 months fighting to deploy it\n3. Model drifts in prod, nobody notices\n4. Business loses confidence in ML\n\nThe fix isn't better models. It's MLOps from day one: versioning, monitoring, feedback loops, rollback plans.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Fine-tuning LLMs on a budget — what actually works in 2026',
        content:
          "Nobody has GPT-4 money. Here's what I've found works for budget fine-tuning:\n\n- **LoRA / QLoRA** — fine-tune 7B models on a single A100\n- **Unsloth** — 2x faster training, 70% less memory\n- **Modal / RunPod** — on-demand GPU, pay per second\n\nFor most business use-cases, a well-prompted base model beats a badly-tuned model. Start with prompting, then fine-tune.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'noah.kim.mobile@beoneofus-seed.com',
    username: 'noahkim_dev',
    full_name: 'Noah Kim',
    status: 'Mobile developer • React Native & Swift • Seoul 🇰🇷',
    location: 'Seoul, South Korea',
    github: 'noah-kim-dev',
    website: 'https://noahkim.dev',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/men/7.jpg',
    banner: 'https://picsum.photos/seed/noahkim/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'React Native in 2026 — should you still use it?',
        content:
          'Hot take: React Native is better than it has ever been and most of the \"use Flutter instead\" crowd hasn\'t tried it in the last 2 years.\n\nThe New Architecture (JSI + Fabric) eliminated most of the perf issues. Expo\'s ecosystem is incredible. You can ship to iOS & Android with one codebase.\n\nWhen to use Flutter? If your team knows Dart and you need pixel-perfect custom UI. Otherwise RN is the pragmatic choice.',
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Offline-first mobile apps — patterns that work',
        content:
          'Users expect apps to work without internet. Here are the patterns I use:\n\n1. **Optimistic UI** — update local state immediately, sync later\n2. **Conflict resolution** — last-write-wins for most data, manual merge for documents\n3. **Sync queue** — store mutations locally, replay when online\n4. **WatermelonDB** — my go-to for complex offline RN apps',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'elena.volkov.sec@beoneofus-seed.com',
    username: 'elena_sec',
    full_name: 'Elena Volkov',
    status: 'Security engineer • AppSec & CloudSec • Breaking things responsibly',
    location: 'Berlin, Germany',
    github: 'elena-volkov-sec',
    website: '',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/8.jpg',
    banner: 'https://picsum.photos/seed/elenav/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'The OWASP Top 10 mistake I see in every startup codebase',
        content:
          "After reviewing 40+ startup codebases as a security consultant, one issue shows up nearly every time:\n\n**Broken access control.** Not SQL injection. Not XSS. Just... checking the wrong thing or nothing at all.\n\nTypical pattern:\n- API correctly checks authentication (\"are you logged in?\")\n- API completely skips authorization (\"are you allowed to access THIS resource?\")\n\nAlways verify ownership server-side. Never trust user-supplied IDs without a check.",
        code_snippet: `// Vulnerable — any authenticated user can access any order
app.get('/orders/:id', authenticate, async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  res.json(order);
});

// Fixed — verify ownership
app.get('/orders/:id', authenticate, async (req, res) => {
  const order = await db.orders.findOne({
    id: req.params.id,
    userId: req.user.id  // <-- this line is all it takes
  });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});`,
        code_language: 'javascript',
      },
      {
        title: 'How I find hidden S3 buckets during recon',
        content:
          "Cloud misconfiguration recon is one of my favorite parts of pentesting. For S3 specifically:\n\n1. Check common naming patterns: `{company}-{env}`, `{company}-backup`, `{company}-assets`\n2. Use tools like `s3scanner` or `bucket_finder`\n3. Check DNS CNAMEs pointing to S3\n4. Look in JS bundles — devs often hard-code bucket names\n\nIn 2026, public buckets are rarer but still exist. The bigger issue now is **overly-permissive IAM roles** inside the bucket policy.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'james.okonkwo.web3@beoneofus-seed.com',
    username: 'james_web3',
    full_name: 'James Okonkwo',
    status: 'Blockchain developer • Solidity • DeFi protocols • Lagos 🇳🇬',
    location: 'Lagos, Nigeria',
    github: 'james-okonkwo',
    website: 'https://jamesokonkwo.io',
    work_status: 'Open to work',
    avatar: 'https://randomuser.me/api/portraits/men/9.jpg',
    banner: 'https://picsum.photos/seed/jameso/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'Why Africa needs Web3 more than Silicon Valley does',
        content:
          "Coming from Lagos, I see daily the problems that decentralized finance can actually solve:\n\n- 60% of sub-Saharan Africa is unbanked\n- Cross-border remittances cost 8-12% in fees\n- Hyperinflation destroys savings overnight\n\nFor us, this isn't a speculative investment. It's infrastructure. Stablecoins + mobile wallets are genuinely changing lives here in ways that SWIFT and Visa never will.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Solidity security patterns every DeFi dev must know',
        content:
          'Lost count of audits where I\'ve seen the same critical bugs:\n\n1. **Reentrancy** — always follow checks-effects-interactions pattern\n2. **Integer overflow** — use SafeMath or Solidity 0.8+\n3. **Access control** — use OpenZeppelin\'s Ownable/AccessControl\n4. **Oracle manipulation** — use TWAPs not spot prices\n\nBefore any mainnet deployment: formal audit + bug bounty. The cost of auditing is nothing compared to a $50M exploit.',
        code_snippet: `// Vulnerable to reentrancy
function withdraw() public {
  uint bal = balances[msg.sender];
  (bool sent,) = msg.sender.call{value: bal}(""); // external call BEFORE state update
  balances[msg.sender] = 0; // too late
}

// Safe: update state BEFORE external call
function withdraw() public {
  uint bal = balances[msg.sender];
  balances[msg.sender] = 0;
  (bool sent,) = msg.sender.call{value: bal}("");
  require(sent, "Transfer failed");
}`,
        code_language: 'javascript',
      },
    ],
  },
  {
    email: 'maya.goldberg.cloud@beoneofus-seed.com',
    username: 'maya_cloud',
    full_name: 'Maya Goldberg',
    status: 'Cloud architect • AWS & GCP • Serverless evangelist • Tel Aviv 🇮🇱',
    location: 'Tel Aviv, Israel',
    github: 'maya-goldberg',
    website: '',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/10.jpg',
    banner: 'https://picsum.photos/seed/mayag/1200/400',
    role_type: 'developer',
    posts: [
      {
        title: 'Multi-cloud is a trap for most companies',
        content:
          'Controversial opinion: unless you\'re a Fortune 500 or have specific regulatory requirements, **multi-cloud is a waste of money**.\n\nYou pay for:\n- Duplicate engineering effort\n- Staff trained on both platforms\n- No provider discounts (you need volume on one cloud)\n- Complexity tax on every architectural decision\n\nPick one cloud. Learn it deeply. The theoretical "no vendor lock-in" benefit is almost never realized.',
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Serverless cost optimization — 5 tips from the trenches',
        content:
          "My serverless bills have dropped 40% this year without changing any functionality. Here's how:\n\n1. **Right-size memory** — profile first, don't guess. 512MB often runs at the same speed as 1GB but costs half\n2. **Cache aggressively** — API GW caching is underused\n3. **Avoid chatty DynamoDB** — batch reads/writes, use single-table design\n4. **Provisioned concurrency** — only for latency-sensitive critical paths\n5. **Reserved capacity on predictable workloads** — saves 30-40% vs on-demand",
        code_snippet: null,
        code_language: null,
      },
    ],
  },

  // ── Video / Content Creators (11-20) ─────────────────────────────────────
  {
    email: 'tyler.brooks.yt@beoneofus-seed.com',
    username: 'tylertech',
    full_name: 'Tyler Brooks',
    status: 'Tech YouTuber • 280K subscribers • Honest gear reviews & dev tutorials',
    location: 'Los Angeles, CA',
    github: '',
    website: 'https://youtube.com/@tylertech',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/men/11.jpg',
    banner: 'https://picsum.photos/seed/tylerb/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'I tested every AI coding assistant for 30 days — here are the results',
        content:
          "Just dropped a 45-minute deep dive on my channel after testing GitHub Copilot, Cursor, Windsurf and Claude Code for a full month each.\n\nTLDR:\n- **Cursor** — best for refactoring existing code\n- **Claude Code** — best for greenfield and complex reasoning\n- **Copilot** — best for autocomplete in familiar codebases\n- **Windsurf** — most impressive for multi-file edits\n\nLink in bio. No sponsorship, all honest takes.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'My YouTube setup for 4K dev tutorials in 2026',
        content:
          "Got a lot of questions about my recording setup after my last video. Here's everything:\n\n🎙️ **Mic:** Shure SM7dB (worth every penny)\n📷 **Camera:** Sony FX3 with Sigma 35mm f/1.4\n💡 **Lights:** Elgato Key Light x2\n💻 **Screen recording:** Screenflow 11\n✂️ **Editing:** Final Cut Pro + Motion for intros\n🎛️ **Audio processing:** Logic Pro with FabFilter\n\nTotal investment: ~$8K. Started with a $200 USB mic and phone camera though — gear isn't the bottleneck, consistency is.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'zoe.williams.tuts@beoneofus-seed.com',
    username: 'zoe_creates',
    full_name: 'Zoe Williams',
    status: 'Tutorial creator • Web dev & design • Sydney 🇦🇺 • Making learning fun',
    location: 'Sydney, Australia',
    github: '',
    website: 'https://zoecreates.com',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/12.jpg',
    banner: 'https://picsum.photos/seed/zoew/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'How I went from 0 to 100K subscribers in 18 months',
        content:
          "People always ask how I grew so fast. Here's the unsexy truth:\n\n- Posted **every single week** for 18 months without missing once\n- **Answered every comment** for the first year\n- Thumbnails took **30 minutes each** to A/B test properly\n- Titles were written 10 different ways before I picked one\n- Watched my analytics **obsessively** and cut things that dropped retention\n\nThere's no hack. It's consistency + feedback loops + relentless improvement.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'The CSS property that changed how I think about layout',
        content:
          "For years I was overcomplicating layouts with float hacks, negative margins, and calc(). Then I properly learned CSS Grid and it changed everything.\n\nThe mental model shift: think of your layout as a **2D grid first**, then place items. Don't think about how elements flow — define the grid and assign positions.\n\nSubgrid landing in all major browsers was the final piece. Now I can align content across card rows with one line.",
        code_snippet: `/* Before: fighting with flexbox */
.card-grid { display: flex; flex-wrap: wrap; }
.card { flex: 1 1 300px; }

/* After: intentional grid */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  grid-template-rows: subgrid;
}`,
        code_language: 'css',
      },
    ],
  },
  {
    email: 'carlos.mendez.gaming@beoneofus-seed.com',
    username: 'carlos_plays',
    full_name: 'Carlos Mendez',
    status: 'Gaming content creator • Twitch Partner • Dev who games 🎮',
    location: 'Miami, FL',
    github: '',
    website: 'https://twitch.tv/carlos_plays',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/men/13.jpg',
    banner: 'https://picsum.photos/seed/carlosm/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'What game development taught me about software engineering',
        content:
          "I spent 2 years building indie games before pivoting to content creation. The lessons I brought back to software engineering:\n\n1. **Playtesting = user testing** — if people can't figure it out, it's your fault, not theirs\n2. **Game loops = product engagement** — every great product has a core loop\n3. **60fps discipline** — the discipline to hit performance targets translates everywhere\n4. **Scope creep kills projects** — games taught me feature cuts are often the right call",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'How I built my stream overlay in 60 minutes with vanilla JS',
        content:
          "Paid tools like Streamlabs charge monthly for overlays you could build yourself in an afternoon. Here's what mine does:\n\n- Follows/sub alerts with custom animations\n- Recent donor ticker\n- Integrated Spotify now-playing widget\n- Chat overlay with emote rendering\n\nAll of it is a single HTML file served over local HTTP. OBS just loads it as a Browser Source. Zero subscriptions.",
        code_snippet: `<!DOCTYPE html>
<html>
<body style="background:transparent">
<div id="alert" class="hidden">
  <span id="alert-text"></span>
</div>
<script>
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (e) => {
  const { type, user } = JSON.parse(e.data);
  if (type === 'follow') showAlert(\`\${user} just followed!\`);
};
</script>
</body>
</html>`,
        code_language: 'html',
      },
    ],
  },
  {
    email: 'nina.petrov.photo@beoneofus-seed.com',
    username: 'nina_visual',
    full_name: 'Nina Petrov',
    status: 'Filmmaker & photographer • Commercial & documentary • Prague 🇨🇿',
    location: 'Prague, Czech Republic',
    github: '',
    website: 'https://ninapetrov.com',
    work_status: 'Open to work',
    avatar: 'https://randomuser.me/api/portraits/women/14.jpg',
    banner: 'https://picsum.photos/seed/ninap/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'Why I switched from DSLR to Sony mirrorless for commercial work',
        content:
          "After 8 years shooting Canon DSLRs for commercial clients, I made the switch to Sony FX6 + A7R V last year.\n\nWhat changed my mind:\n- IBIS on the A7R is genuinely game-changing for run-and-gun\n- Eye-tracking AF means I focus on composition, not nailing focus\n- The menu system is still terrible (Sony, please fix this)\n- Dual-ISO on FX6 eliminates most lighting compromises\n\nFilm still wins for certain projects. But for commercial work, mirrorless is now the pragmatic choice.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Color grading workflow that saves me 3 hours per project',
        content:
          "My DaVinci Resolve workflow for commercial work:\n\n1. **Scene-linear workflow** — apply IDT/ODT properly, not just a LUT\n2. **Node structure discipline** — CST → Primary grade → Secondary → Creative → Delivery\n3. **Shared nodes** — link nodes across clips, change once adjust everywhere\n4. **Remote grades** — for multicam with matched settings\n5. **Gallery stills** — save grades at every stage before creative changes\n\nThe 3 hours saved comes from step 3. Most editors don't use it.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'kai.nakamura.shorts@beoneofus-seed.com',
    username: 'kai_content',
    full_name: 'Kai Nakamura',
    status: 'Short-form content creator • Tech & culture • Tokyo 🇯🇵',
    location: 'Tokyo, Japan',
    github: '',
    website: 'https://kaivideo.jp',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/men/15.jpg',
    banner: 'https://picsum.photos/seed/kain/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'Why short-form video is actually harder than long-form',
        content:
          "Everyone thinks Shorts/Reels are easier because they're shorter. The opposite is true.\n\nWith a 60-second video:\n- **You have 3 seconds** to hook or they scroll\n- Every sentence has to earn its place\n- The edit must be perfect — no coasting\n- You get zero setup time, zero slow burn\n\nLong-form allows mistakes. Short-form is pure compression of value. It took me 200 long-form videos before I was good at shorts.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Tokyo\'s tech scene is underrated — a dev\'s perspective',
        content:
          "Most tech content is US/EU-centric. Here's what's happening in Tokyo that the West is sleeping on:\n\n- **Robotics startups** that would make Boston Dynamics nervous\n- **Human-computer interaction** research at a level I haven't seen elsewhere\n- **Precision manufacturing software** — the unsexy backbone of Japan's industry\n\nThe ecosystem is less startup-y and more methodical. Products here get polished beyond belief before shipping. Different philosophy, genuinely impressive output.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'isabella.cruz.lifestyle@beoneofus-seed.com',
    username: 'isa_creates',
    full_name: 'Isabella Cruz',
    status: 'Content creator • Tech & lifestyle • São Paulo 🇧🇷 • 420K followers',
    location: 'São Paulo, Brazil',
    github: '',
    website: 'https://isacreates.com.br',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/16.jpg',
    banner: 'https://picsum.photos/seed/isac/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'Brand deals — what no one tells you about negotiating rates',
        content:
          "I've done 80+ brand deals. Here's what creators get wrong in negotiation:\n\n1. **Never give your rate first** — ask for their budget\n2. **Usage rights cost extra** — always charge for paid amplification\n3. **Exclusivity must be short** — 30 days max, never 90+\n4. **Payment terms matter** — 50% upfront is standard, demand it\n5. **Your audience's trust is the product** — price accordingly\n\nThe worst deal I ever took was $3K for content that generated $400K for the brand. Know your worth.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'How I manage content creation as a solo operation',
        content:
          "Running a 420K account by yourself means being ruthlessly efficient:\n\n**Batch filming** — 4 videos in one shoot day per week\n**Content calendar** — 6 weeks planned ahead at all times\n**Repurposing pipeline** — 1 long-form video becomes 5 Shorts, 3 carousel posts, 2 threads\n**Tools:** Notion for planning, CapCut for quick edits, Canva for thumbnails\n\nI hire freelancers for specific heavy editing projects only. Everything else is in-house.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'ethan.davis.podcast@beoneofus-seed.com',
    username: 'ethan_pod',
    full_name: 'Ethan Davis',
    status: 'Podcast host & video creator • The Dev Life Show • Chicago 🎙️',
    location: 'Chicago, IL',
    github: '',
    website: 'https://devlifeshow.com',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/men/17.jpg',
    banner: 'https://picsum.photos/seed/ethand/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'What 200 podcast episodes taught me about listening',
        content:
          "I've interviewed 200+ engineers, founders, and designers. The pattern that separates great interviews from mediocre ones:\n\n**Great interviewers listen for the contradiction** — when someone says \"we always do X\" but earlier described doing Y, that's where the interesting story is.\n\n**Ask for the failure version** — everyone gives you their polished success narrative. Ask \"what went wrong during that period?\" and the real story comes out.\n\n**Silence is an interview tool** — most interviewers panic and fill silence. The best answers come after 3 seconds of quiet.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'My podcast tech stack — total cost: $47/month',
        content:
          "Running a professional podcast for under $50/month:\n\n- **Recording:** Riverside.fm ($19) — remote, studio quality\n- **Editing:** Descript ($24) — word-based editing is magical\n- **Hosting:** Buzzsprout (free tier) — distribution to all platforms\n- **Music:** own production — one-time investment\n- **Website:** Vercel free tier with Next.js\n\nThe $200/episode editing services are not necessary. Descript + 2 hours = clean episode.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'amara.diallo.fashion@beoneofus-seed.com',
    username: 'amara_style',
    full_name: 'Amara Diallo',
    status: 'Fashion & tech content creator • Paris 🇫🇷 • Where style meets code',
    location: 'Paris, France',
    github: '',
    website: 'https://amarastyle.fr',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/18.jpg',
    banner: 'https://picsum.photos/seed/amarad/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'What fashion can teach tech about design',
        content:
          "I bridge fashion and tech in my content and the crossover lessons go deeper than you'd think:\n\n**Fashion principle → tech equivalent:**\n- Silhouette first, details second → architecture before features\n- Season collections → product roadmap cycles\n- Know your customer's body → know your user's mental model\n- Capsule wardrobe → minimal viable product\n\nThe best designers in both fields have taste, constraints, and deep customer empathy. The medium changes, the discipline doesn't.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'I built my e-commerce store — here is what I learned',
        content:
          "Launched a small clothing store last year to understand e-commerce from the inside. Technical lessons for other creators:\n\n- **Shopify is worth the money** — I tried WooCommerce first and wasted 3 weeks\n- **Product photography is 80% of conversion** — invest here before ads\n- **Email list > every social platform** — your list is yours, the algorithm isn't\n- **Returns will surprise you** — size guides need to be obsessively accurate\n\nThe store broke even in month 4. The education was priceless.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'ryan.murphy.sports@beoneofus-seed.com',
    username: 'ryan_sport',
    full_name: 'Ryan Murphy',
    status: 'Sports & fitness content creator • Dublin 🇮🇪 • Dev by day, creator by night',
    location: 'Dublin, Ireland',
    github: 'ryan-murphy-dev',
    website: 'https://ryanmurphy.ie',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/men/19.jpg',
    banner: 'https://picsum.photos/seed/ryanm/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'I built a fitness tracking app for myself — then 10K people used it',
        content:
          "What started as a Sunday project to track my marathon training became an app with 10K active users.\n\nThe lesson: build for yourself, but with strangers in mind.\n\nI could have used Excel but I wanted something that would motivate *me* visually. Turned out that motivation was universal — people wanted the same charts, the same streak counter, the same weekly review.\n\nNow I'm facing real product decisions: free tier limits, premium features, support load. It's a great problem to have.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Sports analytics for amateur runners — tools that actually help',
        content:
          "Using data to improve running without spending thousands:\n\n- **Garmin Connect** — free, the best running analytics platform\n- **Strava segments** — surprisingly motivating competitive data\n- **TrainingPeaks** — for serious marathon prep with a coach\n- **Runalyze** (free/self-hosted) — most granular VO2max & lactate modelling\n\nActual insight that improved my marathon time by 8 minutes: I was running my easy runs 45 seconds/km too fast. Data made me slow down. Data made me faster.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'luna.zhang.travel@beoneofus-seed.com',
    username: 'luna_explores',
    full_name: 'Luna Zhang',
    status: 'Travel & tech content creator • Digital nomad • Currently: 🌍 wandering',
    location: 'Beijing, China',
    github: '',
    website: 'https://lunaexplores.com',
    work_status: 'Working',
    avatar: 'https://randomuser.me/api/portraits/women/20.jpg',
    banner: 'https://picsum.photos/seed/lunaz/1200/400',
    role_type: 'creator',
    posts: [
      {
        title: 'Working remotely from 25 countries — the honest guide',
        content:
          "I have worked from 25 countries in the past 3 years. Things nobody tells you:\n\n**Internet speed**: most \"fast WiFi\" claims are lies. Buy a local SIM with data on day one, always.\n\n**Time zones**: working async requires documenting everything. More discipline than an office job, not less.\n\n**Tax and legal**: terrifying complexity. I use a specialist accountant now. Worth every dollar.\n\n**Loneliness**: real and underreported. CoWorking spaces and creator communities (like this one) are not optional — they're necessary.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'My minimalist tech packing list for content creators',
        content:
          "Everything I carry fits in a 30L backpack. Tech-wise:\n\n💻 MacBook Pro 14\" M4 — workhorse, all-day battery\n📷 Sony ZV-E10 II — small, great video, fits everywhere\n🎙️ DJI Mic 2 — wireless, fits in a pocket\n⚡ Anker 45W USB-C charger — charges everything\n📱 iPhone — backup camera + phone\n🔌 6-in-1 USB-C hub — one cable to rule them all\n\nPacked weight under 10kg. Checking bags is for people who like waiting at carousels.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },

  // ── Students (21-30) ─────────────────────────────────────────────────────
  {
    email: 'jordan.taylor.cs@beoneofus-seed.com',
    username: 'jordan_learns',
    full_name: 'Jordan Taylor',
    status: 'CS student @ MIT • Interested in compilers & PL theory • Learning every day',
    location: 'Cambridge, MA',
    github: 'jordan-taylor-mit',
    website: '',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/men/21.jpg',
    banner: 'https://picsum.photos/seed/jordant/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'I implemented a tiny compiler in a weekend — here\'s what I learned',
        content:
          "MIT 6.031 assignment turned into a weekend obsession. I built a tiny language (arithmetic + variables + if/else) that compiles to x86-64.\n\nThe parts that broke my brain:\n1. **Lexing** was easy — just pattern matching\n2. **Parsing** — recursive descent makes sense once it clicks\n3. **AST generation** — feels like magic when trees appear from tokens\n4. **Code generation** — SSA form is intimidating until you build it yourself\n\nReading LLVM tutorials after this feels completely different. Highly recommend building a tiny compiler.",
        code_snippet: `// Simple recursive descent parser (Python)
def parse_expr(tokens, pos):
    left, pos = parse_term(tokens, pos)
    while pos < len(tokens) and tokens[pos] in ('+', '-'):
        op = tokens[pos]
        right, pos = parse_term(tokens, pos + 1)
        left = ('binop', op, left, right)
    return left, pos`,
        code_language: 'python',
      },
      {
        title: 'Resources that actually helped me understand algorithms',
        content:
          "I've tried every algorithm resource. Here's what actually worked for me:\n\n**Books:** CLRS (dense but rigorous), Algorithm Design by Kleinberg & Tardos (better explanations)\n**Practice:** Leetcode for grinding, but USACO for real problem-solving muscle\n**Videos:** MIT OCW 6.006 lectures — Demaine and Devadas are incredible teachers\n**The unlock:** stop memorizing solutions. Re-derive them. Ask \"why\" at every step.\n\nThe difference between \"I've done 300 Leetcode problems\" and \"I understand algorithms\" is asking why.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'fatima.hassan.ds@beoneofus-seed.com',
    username: 'fatima_data',
    full_name: 'Fatima Hassan',
    status: 'Data science student • Cairo University • Women in STEM advocate 📊',
    location: 'Cairo, Egypt',
    github: 'fatima-hassan-data',
    website: '',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/women/22.jpg',
    banner: 'https://picsum.photos/seed/fatimah/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'My first Kaggle competition — what I got wrong and right',
        content:
          "Just finished my first Kaggle competition (tabular data, house prices). Placed in the top 23%. Here's my honest postmortem:\n\n**What I got wrong:**\n- Spent 3 days on feature engineering I never ended up using\n- Didn't do proper cross-validation until week 3\n- Underestimated target leakage in one feature\n\n**What I got right:**\n- Ensemble of XGBoost + LightGBM + CatBoost outperformed any single model\n- Simple imputation strategies worked fine — I overcomplicated it first\n\nAlready signed up for the next one.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Breaking into data science from Egypt — my honest experience',
        content:
          "Being a data science student in a developing country comes with real challenges that Western tutorials ignore:\n\n- AWS/GCP credits help but Colab is still the practical choice\n- Internet speed makes large downloads a 3-hour project\n- Most job listings want 3+ years experience for \"entry level\"\n- The community here is smaller, so you have to build it\n\nWhat's working: building in public (like this), contributing to open source, and connecting with the global community online. Geography is less limiting than it was 5 years ago.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'lucas.oliveira.eng@beoneofus-seed.com',
    username: 'lucas_study',
    full_name: 'Lucas Oliveira',
    status: 'Computer engineering student • UFRJ Rio 🇧🇷 • Embedded systems & IoT',
    location: 'Rio de Janeiro, Brazil',
    github: 'lucas-oliveira-ufrj',
    website: '',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/men/23.jpg',
    banner: 'https://picsum.photos/seed/lucaso/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'Building an air quality monitor with Raspberry Pi for my neighborhood',
        content:
          "Rio's air quality data is woefully underreported. Built a network of 5 monitoring stations for my neighborhood as a thesis project.\n\nHardware: Raspberry Pi Zero 2W + SDS011 PM sensor + MQ-135 for gases\nSoftware: Python sensor readings → MQTT → InfluxDB → Grafana dashboard\n\nCost per station: ~$45. The city's official monitors cost $50,000 each.\n\nData is public and already caught two pollution events the city didn't report. Open data matters.",
        code_snippet: `import paho.mqtt.client as mqtt
import json, time
from sds011 import SDS011

sensor = SDS011("/dev/ttyUSB0", use_query_mode=True)
client = mqtt.Client()
client.connect("broker.local", 1883)

while True:
    pm25, pm10 = sensor.query()
    payload = json.dumps({"pm25": pm25, "pm10": pm10, "ts": time.time()})
    client.publish("air/station1", payload)
    time.sleep(60)`,
        code_language: 'python',
      },
      {
        title: 'Why I chose embedded systems over web dev',
        content:
          "Everyone in my CS cohort went web. I went embedded. Here's why:\n\n- **The constraints are real** — 2KB of RAM forces clarity of thought\n- **Physics meets code** — sensors, actuators, timing. The world responds to your program\n- **Less competition** — not many people enjoy the difficulty\n- **Job market** — IoT, automotive, medical devices are massively hiring\n\nThe salary gap with web dev is closing. The intellectual satisfaction? No comparison.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'emma.andersson.ux@beoneofus-seed.com',
    username: 'emma_designs',
    full_name: 'Emma Andersson',
    status: 'UX/UI design student • Hyper Island Stockholm 🇸🇪 • Making interfaces feel human',
    location: 'Stockholm, Sweden',
    github: '',
    website: 'https://emmaandersson.design',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/women/24.jpg',
    banner: 'https://picsum.photos/seed/emmaa/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'Design critique — 5 things wrong with most developer portfolio sites',
        content:
          "Reviewing portfolio sites is one of my Hyper Island assignments. Same issues appear constantly:\n\n1. **Projects listed, not explained** — what problem did you solve? Why? For whom?\n2. **Dark theme with 3:1 contrast** — please check your text contrast ratios\n3. **No hierarchy** — every element has the same visual weight\n4. **\"Creative\" navigation** — if users spend 10 seconds finding your work, you've failed\n5. **No case study depth** — show process, iterations, and failures, not just the final screen\n\nThe best portfolios read like good writing: clear, purposeful, respectful of the reader's time.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'What design school teaches that YouTube tutorials can\'t',
        content:
          "I've been asked if Hyper Island is worth it when you can learn design online for free. Here's my honest answer:\n\nYou CAN learn tools online. Figma, Framer, prototyping — all learnable from tutorials.\n\nYou CAN'T easily get online:\n- **Critique culture** — being told your work isn't working and learning to hear it\n- **Collaboration under constraints** — designing with 5 people who disagree with you\n- **Presentation skills** — defending design decisions to skeptical stakeholders\n- **Network** — designers who will hire you, collaborate with you, challenge you\n\nBoth paths work. Know what you're optimising for.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'kofi.asante.swe@beoneofus-seed.com',
    username: 'kofi_builds',
    full_name: 'Kofi Asante',
    status: 'Software engineering student • Ashesi University 🇬🇭 • Building for Africa',
    location: 'Accra, Ghana',
    github: 'kofi-asante-dev',
    website: '',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/men/25.jpg',
    banner: 'https://picsum.photos/seed/kofia/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'Building apps for low-bandwidth users — lessons from Ghana',
        content:
          "Most web apps are built assuming fast, cheap internet. For Ghana and much of Africa, that's not reality.\n\nWhat I've learned building for low-bandwidth:\n- **Bundle size is a feature** — every KB is real money to users on mobile data\n- **Offline-first is not a luxury** — connections drop constantly\n- **Progressive enhancement** — ensure core functionality without JS\n- **USSD fallback** — for truly critical features, USSD works on any phone\n\nBuilding for constraints produces better software, full stop.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'My journey getting into Google\'s STEP internship program',
        content:
          "Just accepted an offer for Google STEP 2026! For other students applying:\n\n**What helped:**\n- Strong data structures/algorithms foundation\n- 2 substantial personal projects with real users\n- Contributing to one well-known open source project\n- Mock interviews with peers for 3 months\n\n**What didn't help:**\n- Memorising interview answers — interviewers see through it immediately\n\nApplication tip: the essays matter more than people think. Show who you are, not who you think they want.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'anna.kowalski.webdev@beoneofus-seed.com',
    username: 'anna_frontend',
    full_name: 'Anna Kowalski',
    status: 'Web dev student • Warsaw Tech • JavaScript enthusiast • Building in public 🇵🇱',
    location: 'Warsaw, Poland',
    github: 'anna-kowalski-dev',
    website: 'https://annakowalski.dev',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/women/26.jpg',
    banner: 'https://picsum.photos/seed/annak/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'Six months of building in public — what happened to my career',
        content:
          "I started tweeting and posting about my learning journey 6 months ago. I was terrified of being judged.\n\nWhat actually happened:\n- Got offered 3 internships (accepted one)\n- Met 2 people who became genuine mentors\n- Fixed my code 10x faster because explaining it publicly forced clarity\n- Built an audience that gives real feedback on my projects\n\nBuilding in public is networking for introverts who are scared of networking. It's just being honest about your work.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Accessibility made my JavaScript better — here\'s how',
        content:
          "I took an accessibility course expecting to learn about screen readers. I came out a better JavaScript developer.\n\n- **ARIA attributes** taught me how the browser's accessibility tree works — which taught me DOM better\n- **Keyboard navigation** made me think about event delegation properly\n- **Focus management** forced me to understand React's rendering lifecycle\n- **Semantic HTML** reduced my JS by 30% on one project\n\nA11y isn't an afterthought. It's good engineering discipline.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'diego.herrera.security@beoneofus-seed.com',
    username: 'diego_sec_student',
    full_name: 'Diego Herrera',
    status: 'Cybersecurity student • UNAM Mexico City 🇲🇽 • CTF player • Future red teamer',
    location: 'Mexico City, Mexico',
    github: 'diego-herrera-sec',
    website: '',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/men/27.jpg',
    banner: 'https://picsum.photos/seed/diegoh/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'CTF competitions changed how I learn security — here\'s why',
        content:
          "I've learned more security from CTF competitions than from any textbook. Why:\n\n1. **Real puzzles, real techniques** — not sanitized textbook scenarios\n2. **Immediate feedback** — flag or nothing, no partial credit for hand-wavy answers\n3. **Community write-ups** — after solving (or failing), seeing others' approaches is gold\n4. **Breadth forces** — web, binary, crypto, forensics. You can't specialize yourself into a corner\n\nBest beginner CTF: picoCTF. When you're ready for pain: HackTheBox. When you're ready for humility: DEF CON CTF.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'How I set up my home security lab for under $200',
        content:
          "A full security testing lab for under $200:\n\n- **Host:** old laptop with 16GB RAM + Ubuntu\n- **Hypervisor:** VirtualBox (free)\n- **VMs:** Kali Linux + vulnerable targets (Metasploitable, DVWA, VulnHub machines)\n- **Network:** host-only network, completely isolated\n- **Tools:** Burp Suite Community, Nmap, Metasploit, Wireshark — all free\n\nThe lab cost $0. The laptop was $180 off eBay. Never practice on live systems — this setup gives you a safe playground.",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'yuki.tanaka.ai@beoneofus-seed.com',
    username: 'yuki_ai_student',
    full_name: 'Yuki Tanaka',
    status: 'AI/ML student • Osaka University 🇯🇵 • Researching transformer interpretability',
    location: 'Osaka, Japan',
    github: 'yuki-tanaka-ml',
    website: '',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
    banner: 'https://picsum.photos/seed/yukit/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'Transformer interpretability — what I\'ve learned from 6 months of research',
        content:
          "Working on a research project trying to understand *why* transformers work. Six months in, here's what's clear and what isn't:\n\n**Somewhat understood:**\n- Attention heads have interpretable specializations (syntactic, positional, semantic)\n- Residual stream is a communication bus between layers\n- MLP layers seem to store \"factual\" knowledge\n\n**Still mysterious:**\n- How individual facts are distributed across weights\n- Why large models show emergent behaviors\n- Whether superposition is fundamental or an artifact\n\nInterpretability research feels like neuroscience — hard, humbling, crucial.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Implementing attention from scratch — what clicking feels like',
        content:
          "Read the Attention paper 5 times. Watched Karpathy's videos 3 times. It didn't click until I implemented it from scratch.\n\nThe implementation forced me to understand:\n- Q/K/V are just linear projections — there's nothing magic about the names\n- The softmax creates a probability distribution over positions\n- Scaled dot-product is just avoiding gradient vanishing in high dimensions\n\nIf you're learning transformers: implement it before understanding it fully. The code will teach you what the paper couldn't.",
        code_snippet: `import torch
import torch.nn.functional as F

def attention(Q, K, V):
    d_k = Q.size(-1)
    # Scale dot products to prevent vanishing gradients
    scores = torch.matmul(Q, K.transpose(-2, -1)) / (d_k ** 0.5)
    weights = F.softmax(scores, dim=-1)
    return torch.matmul(weights, V)`,
        code_language: 'python',
      },
    ],
  },
  {
    email: 'sarah.oconnor.mobile@beoneofus-seed.com',
    username: 'sarah_mobile_dev',
    full_name: "Sarah O'Connor",
    status: 'Mobile dev student • TU Dublin 🇮🇪 • React Native & Swift learner',
    location: 'Dublin, Ireland',
    github: 'sarah-oconnor-dev',
    website: '',
    work_status: 'Student',
    avatar: 'https://randomuser.me/api/portraits/women/29.jpg',
    banner: 'https://picsum.photos/seed/saraho/1200/400',
    role_type: 'student',
    posts: [
      {
        title: 'My first React Native app hit #4 in the App Store — here\'s the story',
        content:
          "Built an app for my final year project. It hit #4 in Ireland's Lifestyle category on week one. Here's what I think happened:\n\n- Solved a real problem (found my own pain point, not a hypothetical one)\n- Kept it to one core feature — zero feature creep\n- Spent 2 weeks on the App Store listing before launch (copy, screenshots, keywords)\n- Soft-launched to 50 friends who gave honest reviews first\n\nI'm not going viral globally. But #4 in my country as a final year student? I'll take it.",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Debugging React Native — tips I wish I had on day one',
        content:
          "React Native debugging was the hardest adjustment from web development:\n\n- **Flipper** is worth setting up — network inspector alone saves hours\n- **React DevTools** works with RN — component tree inspection is essential\n- **Metro bundler errors** are often not what they appear — check if it's a native module issue\n- **iOS Simulator vs Android Emulator**: always test both — behaviour differences will surprise you\n- `console.log` is your friend but `debugger` statements work too in the right setup",
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'mehmet.yilmaz.fullstack@beoneofus-seed.com',
    username: 'mehmet_codes',
    full_name: 'Mehmet Yilmaz',
    status: 'Fullstack bootcamp grad 🇹🇷 • Node.js + React • Actively seeking first dev role',
    location: 'Istanbul, Turkey',
    github: 'mehmet-yilmaz-dev',
    website: 'https://mehmetyilmaz.dev',
    work_status: 'Open to work',
    avatar: 'https://randomuser.me/api/portraits/men/30.jpg',
    banner: 'https://picsum.photos/seed/mehmetY/1200/400',
    role_type: 'student',
    posts: [
      {
        title: '6 months post-bootcamp — what the job search is actually like',
        content:
          "Nobody tells you the truth about bootcamp job searches. After 6 months:\n\n**The numbers:**\n- 200+ applications sent\n- 15 technical phone screens\n- 6 take-home projects\n- 4 final-round interviews\n- 2 offers (one accepted)\n\n**What moved the needle:**\n- Cold outreach to engineers (not HR) on LinkedIn\n- Having 3 genuinely useful projects, not 8 tutorial clones\n- Contributing to an open source project (got my first referral this way)\n- Being in communities like this one — someone here referred me to my second offer",
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'The Node.js concept that made everything click',
        content:
          "For months I wrote Node.js without really understanding it. The concept that changed everything:\n\n**The event loop is single-threaded, but I/O is not.**\n\nWhen you do `fs.readFile()`, Node hands the I/O off to the OS and continues running other code. The callback fires when the OS is done. That's it. That's Node.\n\nOnce I understood this:\n- Callback hell made sense (and I could refactor it)\n- Why you never block the event loop with CPU work\n- How streams work\n- Why async/await is just syntactic sugar over this mechanism",
        code_snippet: `// This blocks the event loop — never do this in Node
const data = fs.readFileSync('huge-file.txt'); // 😢

// This doesn't — Node continues serving other requests
fs.readFile('huge-file.txt', (err, data) => {
  // OS woke us up when ready
  console.log(data.toString());
});

// Modern async/await — same non-blocking behaviour
const data = await fs.promises.readFile('huge-file.txt');`,
        code_language: 'javascript',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function findTargetUser(email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Failed to list users: ${error.message}`);
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`Target user "${email}" not found. Make sure they have signed up first.`);
  return user;
}

async function createOrGetUser(userData) {
  // Check if user already exists
  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = existing?.users?.find((u) => u.email === userData.email);
  if (found) {
    console.log(`  ⏭  ${userData.username} already exists — skipping auth creation`);
    return found;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: FAKE_PASSWORD,
    email_confirm: true,
    user_metadata: {
      username: userData.username,
      full_name: userData.full_name,
    },
  });

  if (error) throw new Error(`Auth create failed for ${userData.email}: ${error.message}`);
  return data.user;
}

async function upsertProfile(userId, userData) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      username: userData.username,
      email: userData.email,
      status: userData.status,
      location: userData.location,
      github: userData.github || null,
      website: userData.website || null,
      work_status: userData.work_status,
      avatar_url: userData.avatar,
      banner_url: userData.banner,
      is_verified: true,
      profile_visibility: {
        bio: true,
        location: true,
        github: true,
        website: true,
        work_status: true,
        certificates: true,
        posts: true,
      },
    },
    { onConflict: 'id' }
  );

  if (error) throw new Error(`Profile upsert failed for ${userData.username}: ${error.message}`);
}

async function createPosts(userId, userData) {
  for (const post of userData.posts) {
    // Check if this post already exists
    const { data: existing } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .eq('title', post.title)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from('posts').insert({
      user_id: userId,
      title: post.title,
      content: post.content,
      code_snippet: post.code_snippet || null,
      code_language: post.code_language || null,
    });

    if (error) console.warn(`  ⚠  Post insert failed for "${post.title}": ${error.message}`);
  }
}

async function createConnection(fromUserId, toUserId) {
  // Check if connection already exists
  const { data: existing } = await supabase
    .from('connections')
    .select('id')
    .or(
      `and(sender_id.eq.${fromUserId},receiver_id.eq.${toUserId}),and(sender_id.eq.${toUserId},receiver_id.eq.${fromUserId})`
    )
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from('connections').insert({
    sender_id: fromUserId,
    receiver_id: toUserId,
    status: 'accepted',
  });

  if (error) console.warn(`  ⚠  Connection failed: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🌱  BeOneOfUs — Seed Fake Users\n');

  // 1. Find target user
  console.log(`🔍  Looking up target user: ${TARGET_EMAIL}`);
  const targetUser = await findTargetUser(TARGET_EMAIL);
  console.log(`✅  Found target user — ID: ${targetUser.id}\n`);

  let created = 0;
  let skipped = 0;

  for (let i = 0; i < FAKE_USERS.length; i++) {
    const userData = FAKE_USERS[i];
    const label = `[${i + 1}/${FAKE_USERS.length}] ${userData.full_name} (@${userData.username})`;

    try {
      process.stdout.write(`${label} ... `);

      // a) Create auth user (or get existing)
      const authUser = await createOrGetUser(userData);
      const wasNew = !authUser.created_at || Date.now() - new Date(authUser.created_at).getTime() < 60000;

      // b) Upsert profile
      await sleep(300); // give trigger time to run
      await upsertProfile(authUser.id, userData);

      // c) Create posts
      await createPosts(authUser.id, userData);

      // d) Follow target user
      await createConnection(authUser.id, targetUser.id);

      console.log('✅');
      created++;
    } catch (err) {
      console.log(`❌  ${err.message}`);
      skipped++;
    }

    // Rate limit: ~2 users/second
    await sleep(500);
  }

  console.log(`\n🎉  Done!`);
  console.log(`   ✅  Processed: ${created}`);
  console.log(`   ⏭   Skipped:   ${skipped}`);
  console.log(`\n   All ${created} users now follow ${TARGET_EMAIL}`);
  console.log(`   Each has a profile and 2 posts.\n`);
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
