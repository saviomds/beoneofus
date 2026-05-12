/**
 * Update fake users:
 *  1. Remove github + website links from profiles (no icons in feed/connections)
 *  2. Delete old generic "BeOneOfUs is great" comments
 *  3. Re-insert realistic, post-content-aware comments nobody can tell are fake
 *
 * Run with:  node scripts/update-fake-users.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jwjrogchwfzofpaczaah.supabase.co';
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3anJvZ2Nod2Z6b2ZwYWN6YWFoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTgzMzY5MywiZXhwIjoyMDkxNDA5NjkzfQ.RN1A69GeLncJPnIK_whubHdjGxWBGEPXysd5sBo5GqY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// Deterministic hash (same inputs → same number 0-1, differs across inputs)
// ---------------------------------------------------------------------------
function stableRandom(a, b = '') {
  const s = a + b;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0) / 4294967296;
}

// Seeded Fisher-Yates — same seed always produces the same order
function shuffleWithSeed(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(stableRandom(seed + String(i)) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Topic classification — keyword match on title + content
// ---------------------------------------------------------------------------
function classify(title, content) {
  const t = ((title || '') + ' ' + (content || '')).toLowerCase();
  if (/usecallback|usememo|react\b|jsx|hook|declarative|component/.test(t)) return 'react';
  if (/\bnext\.?js\b|saas|vercel|tailwind/.test(t)) return 'nextjs';
  if (/python|django|fastapi|flask|async def/.test(t)) return 'python';
  if (/\bgo\b|golang|microservice|grpc/.test(t)) return 'golang';
  if (/kubernetes|terraform|devops|k8s|docker|aws|gcp|cloud|serverless/.test(t)) return 'infra';
  if (/security|pentest|ctf|vulnerab|xss|injection|owasp|s3 bucket|bucket/.test(t)) return 'security';
  if (/solidity|blockchain|defi|web3|smart contract|reentrancy/.test(t)) return 'web3';
  if (/\bml\b|machine learning|pytorch|llm|fine.tun|transformer|attention|gpt|neural/.test(t)) return 'ml';
  if (/kafka|distributed|event.driven|queue|stream/.test(t)) return 'backend';
  if (/\bnode\.?js\b|event loop|npm|express/.test(t)) return 'nodejs';
  if (/youtube|twitch|subscriber|stream|content creator|channel/.test(t)) return 'streaming';
  if (/tutorial|course|learning|css|layout|grid|flexbox/.test(t)) return 'tutorial';
  if (/camera|photo|video|film|mirrorless|drone|color grad|davinci/.test(t)) return 'creative';
  if (/brand deal|sponsorship|negotiat/.test(t)) return 'creator_biz';
  if (/podcast|interview|listen/.test(t)) return 'podcast';
  if (/travel|remote|nomad|bali|city|cowork/.test(t)) return 'travel';
  if (/packing|gear|setup|desk|equipment/.test(t)) return 'gear';
  if (/bootcamp|student|university|internship|job search|application|career/.test(t)) return 'career';
  if (/compiler|algorithm|data struct|leetcode|oop/.test(t)) return 'cs_theory';
  if (/mobile|react native|flutter|ios|android|swift/.test(t)) return 'mobile';
  if (/accessibility|a11y|keyboard|aria/.test(t)) return 'a11y';
  if (/build in public|side project|indie|solo|launched/.test(t)) return 'indie';
  if (/design|ux|ui|figma|wireframe|prototype/.test(t)) return 'design';
  if (/marathon|run|fitness|sport|training/.test(t)) return 'fitness';
  if (/africa|ghana|nigeria|lagos|accra|cairo|nairobi/.test(t)) return 'africa_tech';
  if (/air quality|sensor|iot|raspberry pi|embedded/.test(t)) return 'embedded';
  if (/low.bandwidth|offline|rural|developing/.test(t)) return 'low_bandwidth';
  return 'general';
}

// ---------------------------------------------------------------------------
// Comment pools — 8-10 entries each, sound like real devs/creators talking
// ---------------------------------------------------------------------------
const COMMENTS = {
  react: [
    "The mental model shift from imperative to declarative is genuinely hard and nobody talks about it enough. Your framing finally made it click.",
    "Forwarded this to three people on my team who are still fighting jQuery habits. Thank you.",
    "The useCallback misuse pattern is basically industry-wide at this point. Code reviews are like whack-a-mole with it.",
    "Spent last Friday afternoon removing unnecessary useCallbacks from a codebase. You're 100% right — it was everywhere.",
    "The declarative model took me months to actually internalise. Read this post and immediately understood why I was struggling.",
    "The 'can never go back' feeling is real. I genuinely can't read imperative UI code anymore without feeling uncomfortable.",
    "Real question — how are you handling shared state across deeply nested components? Context or external store?",
    "This is the post I needed 18 months ago when I started my React journey.",
  ],
  nextjs: [
    "Built my last three projects on basically this exact stack and the DX is unmatched once everything is set up.",
    "The edge function latency drop from 800ms to 60ms is the exact number I used to convince my team to switch.",
    "The 48-hour timeline is actually believable with this stack — the tooling does the heavy lifting.",
    "Payments in under an hour with Stripe is never exaggerated. The documentation is incredible.",
    "Curious what you used for emails — Resend? It's the missing piece I always forget to mention in stack posts.",
    "The landing page copy as the bottleneck is painfully real. I've shipped features faster than I've written headlines.",
    "This is basically the canonical 2026 indie stack and I'm here for it.",
  ],
  python: [
    "The Django vs FastAPI debate in our team ended when we benchmarked both. FastAPI was 3x faster for our specific workload.",
    "Been on Django for 4 years and the automatic OpenAPI docs alone in FastAPI are worth the switch for API-only projects.",
    "The batteries-included argument for Django is real though — admin panel alone saves weeks on internal tools.",
    "Finally someone explains async properly. The 'cooperative multitasking not parallelism' framing is what I needed.",
    "The Pydantic validation is the thing nobody mentions enough — it replaces so much manual validation code.",
    "Sent this to our backend team. We've been having exactly this debate for two sprints.",
    "IO-bound vs CPU-bound as the decision point is the clearest heuristic I've seen for when async actually helps.",
  ],
  golang: [
    "Switched from Python microservices to Go last year. The ~5MB binary and instant startup are genuinely life-changing for container images.",
    "The goroutines mental model is the Go thing that took me longest to internalise after years of threading.",
    "Strong agree on Go for new microservices. The compile-time safety alone has caught so many bugs before they hit prod.",
    "The deployment simplicity is criminally underrated. Single binary, no runtime dependencies. It's beautiful.",
    "3 years of Go here — still reach for Python when I need quick scripts though. You nailed the tradeoffs.",
  ],
  infra: [
    "The resource limits story is painfully familiar. We now have a CI check that blocks any manifest without them set.",
    "OOM kill cascade at 2am is a rite of passage. You only make that mistake once.",
    "The Terraform state file in git horror story happened at my last company. Three months to clean up the mess.",
    "Multi-cloud is a trap I've tried to call out internally for two years. The theoretical benefits never materialise.",
    "Provisioned concurrency is chronically underused. People pay for on-demand on predictable workloads and wonder why their bill is high.",
    "The 40% serverless cost reduction with right-sizing is real — we ran the same exercise and got 35%. Highly recommend.",
    "State locking with DynamoDB being non-default is one of my biggest Terraform complaints. Should be opt-out not opt-in.",
  ],
  security: [
    "The 'are you logged in vs are you allowed to access THIS' distinction is the bug I find in 80% of the codebases I review.",
    "One line — `userId: req.user.id` — is the difference between secure and completely broken. Sharing this everywhere.",
    "S3 naming pattern recon is underestimated. Found a company's entire backup infrastructure with `{company}-backup` in under 10 minutes.",
    "The OWASP thing that surprises people is always broken access control at the top. XSS gets all the attention.",
    "Pentested a fintech startup last year. Broken access control in 20 minutes. They had excellent XSS protections though.",
    "The IAM role misconfiguration problem is genuinely harder to audit than public buckets. Great point.",
    "Junior devs I mentor always focus on SQL injection and XSS. I now point them here first.",
  ],
  web3: [
    "The checks-effects-interactions pattern should be on a poster in every Solidity dev's workspace.",
    "The Africa needs Web3 more framing is something I think about a lot. Remittance fees are genuinely predatory.",
    "The reentrancy vulnerability example is the clearest I've seen. Using this for our internal training.",
    "TWAPs vs spot prices for oracle manipulation — got burned by this exact thing on a testnet project.",
    "Agree completely on formal audits before mainnet. The cost vs potential exploit ratio makes it obvious.",
    "The unbanked percentage statistic always reframes the whole Web3 speculative narrative for me.",
  ],
  ml: [
    "The 90% of ML projects never reaching production stat is low in my experience honestly.",
    "MLOps from day one is the advice I give every data scientist starting a new project. Nobody listens until it fails.",
    "The LoRA on a single A100 setup is basically what we're running. The Unsloth speedup is real.",
    "The 'well-prompted base model beats badly-tuned model' point needs to be said louder. So many teams skip straight to fine-tuning.",
    "Model drift with nobody noticing is the most expensive part of ML in production. Monitoring is not optional.",
    "QLoRA changed the economics of fine-tuning completely. 70% memory reduction is not an exaggeration.",
    "The feedback loop point is what separates ML teams that ship from teams that demo.",
  ],
  backend: [
    "Running Kafka at 100M+ messages/day and the partition count lesson is something we learned the painful way.",
    "Replication factor under 3 in prod is how you get a Saturday incident. Non-negotiable.",
    "Consumer lag alerting is underrated as an early warning system — added it to our runbook after reading a similar post.",
    "Schema Registry adoption saved us from a backwards-incompatibility incident that would have been a P0.",
    "The 'alert on consumer lag early' advice is what I needed. We're currently reactive on this. Fixing it this sprint.",
  ],
  nodejs: [
    "The 'single-threaded but I/O is not' explanation is the one I use when onboarding backend devs to Node.",
    "Never blocking the event loop is the rule that nobody teaches explicitly in beginner content.",
    "The streams explanation as the natural extension of this mental model is something I haven't seen done this cleanly.",
    "Six months of Node without actually understanding this — relates too hard. This post would have saved me weeks.",
    "The readFileSync example is the perfect minimal illustration. Bookmarked for code review comments.",
  ],
  streaming: [
    "The stream overlay tutorial is exactly what I was looking for — paying $15/month for something I can host myself is embarrassing.",
    "847 concurrent viewers is massive — what was the VOD view count like? Curious if the dev coding content converts to VOD well.",
    "The coding stream crossover audience discovery is real. Dev streamers have incredibly engaged viewers.",
    "Browser Source for custom overlays is criminally underused. The flexibility vs paid tools is insane.",
    "The metrics breakdown is genuinely useful data — the 3x short clip posting frequency making such a difference is notable.",
  ],
  tutorial: [
    "The CSS Grid subgrid finally arriving in all browsers was the thing I was waiting for to go all-in on it.",
    "The 'think of layout as 2D first then place items' framing is the mental model shift I needed three years ago.",
    "Your consistency story is the unsexy truth nobody in the creator space wants to talk about. No hack, just showing up.",
    "The 10 different title variations before picking one is the thing I keep skipping and my analytics keep punishing me for.",
    "Just watched the intro to this series — the build-from-scratch approach is exactly what I've been looking for.",
    "The Grid vs Flexbox debate settled in my head after reading this. Two tools, different jobs.",
  ],
  creative: [
    "The IBIS game changer point is not overstated — handheld footage quality went up immediately when I switched.",
    "The scene-linear workflow is something I resisted for a year and then lost a month of grading time without it.",
    "Shared nodes saving 3 hours per project is real. The amount of time people waste on redundant per-clip grades is staggering.",
    "Eye-tracking AF on the Sony is the thing that freed me up to actually think about framing again.",
    "The Sony menu system comment 😂 six firmware updates in and still finding things in the wrong place.",
    "The Iceland light situation is something I think about constantly. 20-hour days and still 'golden hour' all day.",
    "The DaVinci Remote Grades feature is one of the most powerful and least-used tools in the software.",
  ],
  creator_biz: [
    "Never giving your rate first is the single most important negotiation lesson and it took me 30 deals to learn it.",
    "The usage rights charge is something I completely ignored in my first year and left so much money on the table.",
    "50% upfront should be industry standard. Any pushback on that is a red flag about the client.",
    "The $3K for content that generated $400K is such a painful and universal experience in this industry.",
    "Exclusivity clauses at 90 days were something I signed early on without thinking. Never again.",
    "The 'your audience's trust is the product' line is the most important reframe in creator monetisation.",
  ],
  podcast: [
    "The silence as an interview tool is something I had to consciously practice. The instinct to fill it is overwhelming.",
    "Listening for the contradiction is the technique that separates genuinely good interviewers. Applies everywhere.",
    "Descript word-based editing changed my post-production time completely. From 4 hours to 45 minutes per episode.",
    "Riverside for remote recording is the standard now — the local recording quality fallback is the thing.",
    "The 'ask for the failure version' technique consistently gets the most interesting answers.",
  ],
  travel: [
    "The Bali WiFi myth needed debunking. Canggu co-working spaces are legitimately some of the best work environments I've found anywhere.",
    "The loneliness point is the most honest thing I've read about remote work. The co-working space solution is genuinely necessary.",
    "Tax complexity for long-term nomads is a real conversation that most 'digital nomad lifestyle' content completely skips.",
    "Everything in that packing list — the 30L constraint forces the right decisions on gear.",
    "Local SIM card on day one is the advice that I now give as the first instruction to anyone going nomadic.",
    "The async discipline as requiring more not less structure is the thing that surprises people the most.",
  ],
  gear: [
    "The cable management as the real flex is accurate — the gear is almost irrelevant at this point.",
    "Shure SM7dB upgrade is on my list. The SM7B preamp noise floor situation was getting old.",
    "DJI Mic 2 in a pocket is the thing that made me stop carrying a full audio bag on shoots.",
    "The 6-in-1 hub recommendation is identical to mine — one cable setup is the only sustainable approach when travelling.",
    "M4 battery life is the thing I was most sceptical about and most impressed by. All-day is real.",
  ],
  career: [
    "The 200+ applications number is the honest data that people need to hear. The 15 phone screens conversion rate is about right.",
    "Cold outreach to engineers not HR is the single change that made the most difference for me too.",
    "Eight useful projects beats twenty tutorial clones — the portfolio quality threshold is the thing nobody tells bootcampers.",
    "The open source contribution to referral pipeline is real. That's how I got my second job.",
    "The essay thing — I didn't take it seriously for FAANG applications and regretted it. You're right that it matters.",
    "The postmortem format for a Kaggle competition is exactly how learning should be documented. Honest about the failures.",
  ],
  cs_theory: [
    "The 'implement before you fully understand it' approach to learning is the one that consistently works for complex topics.",
    "Re-deriving instead of memorising is the advice that changed my competitive programming results completely.",
    "The tiny compiler experience is the one I always recommend to students asking about systems knowledge. Nothing like it.",
    "The QK V as 'just linear projections' demystification is the thing that unlocked the architecture for me.",
    "MIT OCW for algorithms is genuinely underrated as a resource. The lecture quality is doctoral-level teaching.",
  ],
  mobile: [
    "New Architecture performance improvements are exactly as described. The bridge removal was the thing killing performance.",
    "The App Store listing copy quality as a success factor is something first-time app developers consistently underestimate.",
    "50 friends for honest reviews before launch is the advice I wish I'd followed for my first app.",
    "Flipper setup time upfront saves so much debugging time later. Worth every minute of the configuration hell.",
    "WatermelonDB for complex offline React Native apps is the correct recommendation — nothing else comes close.",
  ],
  a11y: [
    "Accessibility making you understand the DOM better is the reframe that makes the whole topic click for new devs.",
    "The 30% JS reduction from semantic HTML point should be in every performance talk. It's always framed as a moral obligation rather than a technical win.",
    "Focus management and React's rendering lifecycle — that connection took me a long time to make consciously.",
    "The ARIA tree teaching DOM understanding is one of those counterintuitive learning paths that genuinely works.",
  ],
  indie: [
    "The audience as feedback loop point is what separates building in public from just broadcasting into the void.",
    "10K users from a personal tool is the best possible validation signal. Congratulations — that conversion rate is rare.",
    "Building in public as networking for introverts is exactly the framing I needed to start my own.",
    "The numbers are sobering but the outcome is what matters. From 0 to 100K in 18 months with the unsexy strategy.",
    "Real users from a Sunday side project is the dream. The fact that it started personal is why it worked.",
  ],
  design: [
    "The 'silhouette first, details second' → 'architecture before features' mapping is going in my product principles doc.",
    "Case study depth is the most common portfolio failure I see. Final screens with no process is almost worse than nothing.",
    "The font hierarchy critique is the thing I say most often in design crits. Everything at the same weight reads as noise.",
    "The process, iterations, AND failures comment is important — it's the only way to show actual design thinking.",
    "The school vs tutorials framing is honest and fair. Both work, you just optimise for different things.",
  ],
  fitness: [
    "The 'running easy runs too fast' data-driven insight is the one that's made the most difference for most recreational runners I know.",
    "3:41:22 in the rain is an incredible result — the conditions make that more impressive not less.",
    "Runalyze for amateur runners is a criminally underrated recommendation. The lactate threshold modelling is serious.",
    "The training block numbers — peaking at 90km/week — are serious preparation. The result shows it.",
    "Trust the process and trust the data. You can't argue with a 9-minute PB.",
  ],
  africa_tech: [
    "The low-bandwidth optimisation discipline produces genuinely better software. Constraints are a feature.",
    "The USSD fallback recommendation is something I wish more product teams in the West thought about when designing for global markets.",
    "Building for constrained environments is a competitive advantage globally, not just locally. The skills transfer everywhere.",
    "The Ashesi/Africa tech community output is consistently underrepresented in global tech discourse. Posts like this help.",
    "The geography is less limiting than it was point is the thing I say to every student who asks if location matters.",
  ],
  embedded: [
    "The 2KB of RAM constraint producing clarity of thought is the most honest description of embedded development I've read.",
    "Real data catching events that official monitors miss — this is exactly the kind of public interest infrastructure that matters.",
    "The physics meets code description is the reason I got into embedded systems. Nothing else gives you that feedback.",
    "The IoT automotive medical hiring market point is real and underreported. Web dev Twitter makes it look like the only path.",
    "Open sourcing the sensor network design is the right call. This is infrastructure knowledge that should be shared.",
  ],
  low_bandwidth: [
    "The bundle size as a feature framing should be in every performance review at every company that ships globally.",
    "Progressive enhancement with JS as an enhancement not a requirement — this is the web's original architecture working correctly.",
    "The USSD fallback for truly critical features is something SaaS products shipping in emerging markets consistently skip.",
    "Building for offline-first is the constraint that forces you to design good sync architecture. The discipline transfers.",
    "Every KB is real money to users on metered data. This should be displayed in every bundle analyser.",
  ],
  general: [
    "Bookmarked. Sending this to two people immediately.",
    "This is exactly the kind of post I scroll for. Thank you for writing it up properly.",
    "The honesty here is refreshing — most people only share the highlight reel version.",
    "Following for more of this. Exactly what I needed to read today.",
    "This answered a question I've been sitting with for months. Genuinely useful.",
    "The real-world numbers make this so much more credible than the theoretical version I've read elsewhere.",
    "Took me three reads to fully absorb but worth every minute.",
    "Shared this with my team. We've been circling this problem for a while.",
    "The experience-first framing here is the thing that makes this land differently than similar posts.",
    "I've read a lot of posts on this topic and yours is the clearest by a significant margin.",
  ],
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🔧  BeOneOfUs — Update Fake Users\n');

  // 1. Load fake user profiles
  console.log('📋  Loading fake users…');
  const { data: fakeUsers, error: fuErr } = await supabase
    .from('profiles')
    .select('id, username, email')
    .like('email', '%@beoneofus-seed.com%');
  if (fuErr) throw fuErr;
  const fakeIds = fakeUsers.map(u => u.id);
  console.log(`   Found ${fakeUsers.length} fake users\n`);

  // 2. Clear github + website links from all fake profiles
  console.log('🔗  Removing github/website links from profiles…');
  for (const user of fakeUsers) {
    await supabase.from('profiles')
      .update({ github: null, website: null })
      .eq('id', user.id);
    await sleep(60);
  }
  console.log('   ✅  Done\n');

  // 3. Delete all existing comments by fake users
  console.log('🗑   Deleting old generic comments…');
  const { error: delErr } = await supabase
    .from('comments')
    .delete()
    .in('user_id', fakeIds);
  if (delErr) console.warn('   ⚠ ', delErr.message);
  else console.log('   ✅  Done\n');

  // 4. Load all posts with title + content
  console.log('📋  Loading all posts…');
  const { data: allPosts, error: pErr } = await supabase
    .from('posts')
    .select('id, user_id, title, content');
  if (pErr) throw pErr;
  console.log(`   Found ${allPosts.length} posts\n`);

  // 5. Re-insert realistic topic-matched comments
  //    Outer loop = posts so we can guarantee unique comments per post.
  //    Pool is shuffled with the post ID as seed → different order per post.
  //    Each commenter on the same post gets the next slot → no two users
  //    ever leave the same comment on the same post.
  console.log('💬  Adding topic-matched comments…');
  let total = 0;

  for (const post of allPosts) {
    // Determine commenters: ~25% of fake users, excluding the post author
    const commenters = fakeUsers
      .filter(u => u.id !== post.user_id && stableRandom(u.id, post.id) <= 0.25)
      // Sort by stable value so commenter order is consistent across re-runs
      .sort((a, b) => stableRandom(a.id + post.id) - stableRandom(b.id + post.id));

    if (commenters.length === 0) continue;

    const topic = classify(post.title, post.content);
    // Merge topic pool + general so there are always enough unique comments even when cycling
    const merged = [...new Set([...(COMMENTS[topic] || []), ...COMMENTS.general])];
    // Shuffle the merged pool with the post ID — different order per post
    const pool = shuffleWithSeed(merged, post.id);

    for (let i = 0; i < commenters.length; i++) {
      // Position i in the shuffled pool — unique slot per commenter on this post
      const comment = pool[i % pool.length];
      const { error } = await supabase.from('comments').insert({
        post_id: post.id,
        user_id: commenters[i].id,
        content: comment,
      });
      if (error && !error.message.includes('duplicate')) {
        console.warn(`   ⚠  ${error.message}`);
      } else {
        total++;
      }
      await sleep(25);
    }
    process.stdout.write('.');
    await sleep(40);
  }
  console.log(`\n   ✅  Added ${total} comments\n`);

  // 6. Verify profiles look clean
  console.log('✅  Verification — sample profile check:');
  const { data: sample } = await supabase
    .from('profiles')
    .select('username, github, website, work_status, is_verified')
    .like('email', '%@beoneofus-seed.com%')
    .limit(4);
  sample.forEach(p => {
    console.log(`   @${p.username.padEnd(22)} github=${String(p.github).padEnd(6)} website=${String(p.website).padEnd(6)} work_status="${p.work_status}" verified=${p.is_verified}`);
  });

  console.log('\n🎉  Done! Fake users now have:');
  console.log('   — No github/website link icons in feed or connections');
  console.log(`   — ${total} post-specific comments that read like real responses`);
  console.log('   — Full profiles visible in the connections page\n');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
