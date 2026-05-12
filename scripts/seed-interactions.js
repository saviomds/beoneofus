/**
 * Seed interactions: likes, comments (about beoneofus features), image posts,
 * and cross-follows between fake users so the platform looks alive.
 *
 * Run with:  node scripts/seed-interactions.js
 * Safe to re-run — all inserts are idempotent.
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
// Comments pool — fake users talking about beoneofus features
// ---------------------------------------------------------------------------
const BEONEOFUS_COMMENTS = [
  "The code snippet feature here is 🔥 — way better than pasting screenshots in Discord",
  "BeOneOfUs is genuinely the dev community platform I've been looking for",
  "The AI code analysis tool on this platform is wild 🤯 just caught a bug in my code",
  "Real-time feed updates are so smooth — this is how social for devs should work",
  "Love that the feed shows different content each time — keeps it fresh",
  "Finally a platform where my feed is actually relevant to me, not just viral nonsense",
  "The verified badge system here builds real trust — not pay-to-play",
  "Been on BeOneOfUs two weeks and learned more than 6 months of scrolling LinkedIn",
  "The code rendering here is insane — syntax highlighting, copy button, everything",
  "Told 5 developer friends about BeOneOfUs this week, platform is that good",
  "The connections feature feels natural here, not transactional like other networks",
  "BeOneOfUs > LinkedIn for tech people, and I will die on this hill 😄",
  "Just dropped my first code snippet post and the UX is *chef's kiss* 🤌",
  "Following devs by specialty here has completely transformed my learning feed",
  "The rising tab shows me content I'd never find on my own — great algorithm",
  "Didn't expect to actually enjoy a social platform but here we are 😂 BeOneOfUs is different",
  "The profile system is clean — shows what actually matters, not just a headshot",
  "BeOneOfUs has the best signal-to-noise ratio of any dev platform I've used",
  "Legitimately impressed by how fast this platform is. Zero lag, real-time everything",
  "This is what happens when developers build a platform for developers 💙",
  "The bookmarks feature here is saving my workflow — no more \"liked for later\" posts",
  "Just found 3 potential collaborators through BeOneOfUs connections in one afternoon",
  "The community here is actually helpful and encouraging, refreshing change",
  "Featured tab always has gold — exactly the kind of deep-dive posts I want to read",
  "Platform loads fast, looks great, works great. Rare combination in 2026 🙏",
  "Shared a debugging problem here and had 4 quality responses within an hour",
  "BeOneOfUs made me realise how much noise was in my other dev feeds",
  "The dark mode is perfect. Small detail but it matters when you're here for hours",
  "Actually learning things from this feed daily — that's the benchmark for a good platform",
  "Shoutout to whoever designed the post cards here, the UX is genuinely beautiful",
];

// ---------------------------------------------------------------------------
// Extra image posts for visual creators — index in FAKE_USERS corresponds to
// the user email pattern used in seed-fake-users.js
// ---------------------------------------------------------------------------
const IMAGE_POSTS = [
  {
    email: 'tyler.brooks.yt@beoneofus-seed.com',
    posts: [
      {
        title: 'My 2026 desk setup — productivity-first build',
        content: 'Finally finished the setup I\'ve been building toward for two years. Everything has a purpose here — no RGB-for-the-sake-of-it nonsense.\n\nMain monitor: LG 27" 4K OLED • Secondary: 24" for docs/chat\nKeyboard: Keychron Q3 Max (POM switches)\nMouse: Logitech MX Master 3S\n\nThe cable management took an entire Sunday but worth every minute.',
        image_url: 'https://picsum.photos/seed/desk-setup-tyler/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'nina.petrov.photo@beoneofus-seed.com',
    posts: [
      {
        title: 'Golden hour in Prague — shot for a commercial client last week',
        content: 'Sometimes the city hands you perfect light and you just have to show up.\n\nShot on Sony FX6 + Sigma 24-70mm f/2.8. No grading applied in this frame — this is straight out of camera with only LUT applied.\n\nClient: Bohemia Tourism. Usage: print and digital campaign.',
        image_url: 'https://picsum.photos/seed/prague-nina/800/450',
        code_snippet: null,
        code_language: null,
      },
      {
        title: 'Drone footage from our documentary shoot — Iceland',
        content: 'Week two of a documentary project in Iceland. The light here is something else entirely — 20 hours a day in summer means you have to plan your shots around mood, not clock.\n\nDJI Mavic 3 Cine + DJI RC Pro. Log footage graded in DaVinci Resolve.',
        image_url: 'https://picsum.photos/seed/iceland-nina/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'carlos.mendez.gaming@beoneofus-seed.com',
    posts: [
      {
        title: 'Stream metrics from my best month ever 📈',
        content: 'March was wild. Hit a personal record on concurrent viewers (847 peak) and the subs just kept coming.\n\nBreaking down what changed: posted 3x more short clips to socials, started doing the "learning to code live" segments, and switched to a proper streaming PC from the console setup.\n\nThe coding streams convert REALLY well — devs are incredible audiences.',
        image_url: 'https://picsum.photos/seed/stream-carlos/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'zoe.williams.tuts@beoneofus-seed.com',
    posts: [
      {
        title: 'New tutorial series: Building a full-stack app from scratch',
        content: '10-part series launching this week on my channel! Episode 1 drops Monday.\n\nStack: Next.js 16 + Supabase + Tailwind 4 + Vercel. No shortcuts, no boilerplates — building everything from the schema up so you actually understand what each piece does.\n\nFree. No paywalls. Linked in bio.',
        image_url: 'https://picsum.photos/seed/tutorial-zoe/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'luna.zhang.travel@beoneofus-seed.com',
    posts: [
      {
        title: 'Working from Bali this week — "paradise" has fast internet, turns out',
        content: 'People warned me Bali WiFi was terrible. They were wrong — this co-working space in Canggu gets 400 Mbps down. Better than my apartment in Beijing.\n\nCost for the month including accommodation: $1,100 USD. Try finding that in a major western city.\n\nDay trip to the rice terraces tomorrow, back to the laptop by 3pm.',
        image_url: 'https://picsum.photos/seed/bali-luna/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'isabella.cruz.lifestyle@beoneofus-seed.com',
    posts: [
      {
        title: 'Behind the shoot: how I create a month of content in one weekend',
        content: 'Sunday was a shoot day. 11am to 6pm, 6 outfit changes, 3 different locations in São Paulo.\n\nThe result: 22 pieces of content. 6 feed posts, 8 Reels, 4 Stories sequences, and 4 pieces for brand partners.\n\nBatch filming is the only way I stay consistent. If you\'re creating alone, this approach will change your life.',
        image_url: 'https://picsum.photos/seed/shoot-isabella/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'ryan.murphy.sports@beoneofus-seed.com',
    posts: [
      {
        title: 'Marathon day — 3:41:22 personal best 🏃',
        content: 'Dublin City Marathon. Rain from km 8 all the way to the finish. Wouldn\'t have it any other way.\n\n3:41:22 — 9 minutes off my previous best. The data said I was ready: VO2max trending up, weekly mileage peaked at 90km in training block, long runs all within target pace.\n\nTrust the process. The data doesn\'t lie.',
        image_url: 'https://picsum.photos/seed/marathon-ryan/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'lucas.oliveira.eng@beoneofus-seed.com',
    posts: [
      {
        title: 'Air quality sensor network — first month of data is in',
        content: 'One month since we deployed 5 stations around my neighbourhood in Rio. The data is telling a clear story.\n\nPM2.5 spikes every weekday at 7-9am and 5-7pm. Traffic correlation is obvious. Station 3 (near the industrial district) shows consistently elevated readings regardless of time.\n\nAll data is public. Dashboard linked in bio.',
        image_url: 'https://picsum.photos/seed/sensor-lucas/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'emma.andersson.ux@beoneofus-seed.com',
    posts: [
      {
        title: 'Wireframes vs final design — my process for a recent project',
        content: 'People always ask how much changes between wireframes and final. On this project: a lot.\n\nThe wireframes nail the structure and flow. The final design adds hierarchy, breathing room, and the emotional quality that makes people want to use it.\n\nDesign is 20% structure and 80% how it feels. The wireframe only captures the 20%.',
        image_url: 'https://picsum.photos/seed/design-emma/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
  {
    email: 'kofi.asante.swe@beoneofus-seed.com',
    posts: [
      {
        title: 'My air quality monitoring dashboard — built for Accra',
        content: 'Inspired by Lucas Oliveira\'s project here — built a similar thing for my neighbourhood in Accra.\n\nAccra\'s air quality data is almost non-existent in public databases. This project started as a thesis and is now being picked up by the city council for a pilot programme.\n\nOpen source. Raspberry Pi + Python + Grafana. All code on my GitHub.',
        image_url: 'https://picsum.photos/seed/dashboard-kofi/800/450',
        code_snippet: null,
        code_language: null,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getFakeUserProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, email')
    .like('email', '%@beoneofus-seed.com%');
  if (error) throw new Error('Could not fetch fake users: ' + error.message);
  return data || [];
}

async function getAllPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('id, user_id, title');
  if (error) throw new Error('Could not fetch posts: ' + error.message);
  return data || [];
}

async function addLike(postId, userId) {
  // Check existing
  const { data: ex } = await supabase.from('likes').select('id')
    .eq('post_id', postId).eq('user_id', userId).maybeSingle();
  if (ex) return;
  const { error } = await supabase.from('likes').insert({ post_id: postId, user_id: userId });
  if (error && !error.message.includes('duplicate')) {
    console.warn(`    ⚠  Like failed (${postId}): ${error.message}`);
  }
}

async function addComment(postId, userId, content) {
  // Avoid duplicate comments (same user + same post + same content)
  const { data: ex } = await supabase.from('comments').select('id')
    .eq('post_id', postId).eq('user_id', userId).eq('content', content).maybeSingle();
  if (ex) return;
  const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userId, content });
  if (error) console.warn(`    ⚠  Comment failed: ${error.message}`);
}

async function addConnection(fromId, toId) {
  const { data: ex } = await supabase.from('connections').select('id')
    .or(`and(sender_id.eq.${fromId},receiver_id.eq.${toId}),and(sender_id.eq.${toId},receiver_id.eq.${fromId})`)
    .maybeSingle();
  if (ex) return;
  const { error } = await supabase.from('connections').insert({
    sender_id: fromId, receiver_id: toId, status: 'accepted',
  });
  if (error) console.warn(`    ⚠  Connection failed: ${error.message}`);
}

async function addImagePost(userId, post) {
  const { data: ex } = await supabase.from('posts').select('id')
    .eq('user_id', userId).eq('title', post.title).maybeSingle();
  if (ex) return;
  const { error } = await supabase.from('posts').insert({
    user_id: userId,
    title: post.title,
    content: post.content,
    image_url: post.image_url,
    code_snippet: post.code_snippet || null,
    code_language: post.code_language || null,
  });
  if (error) console.warn(`    ⚠  Image post failed: ${error.message}`);
}

// Deterministic pseudo-random based on two strings — used for stable sampling
function stableRandom(a, b) {
  const s = a + b;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('\n🌱  BeOneOfUs — Seed Interactions\n');

  // 1. Get fake users
  console.log('📋  Loading fake user profiles…');
  const fakeUsers = await getFakeUserProfiles();
  if (fakeUsers.length === 0) {
    console.error('No fake users found. Run seed-fake-users.js first.');
    process.exit(1);
  }
  console.log(`   Found ${fakeUsers.length} fake users\n`);

  // 2. Get all posts
  console.log('📋  Loading all posts…');
  const allPosts = await getAllPosts();
  console.log(`   Found ${allPosts.length} posts\n`);

  // 3. Add image posts for visual creators
  console.log('🖼   Adding image posts for visual creators…');
  for (const def of IMAGE_POSTS) {
    const user = fakeUsers.find(u => u.email === def.email);
    if (!user) { console.log(`   ⏭  ${def.email} not found, skipping`); continue; }
    for (const post of def.posts) {
      await addImagePost(user.id, post);
    }
    console.log(`   ✅  @${user.username}`);
    await sleep(200);
  }
  console.log();

  // Reload posts so image posts are included in interaction targets
  const updatedPosts = await getAllPosts();

  // 4. Likes — each fake user likes ~65% of all posts (stable sampling)
  console.log('❤️   Adding likes from fake users…');
  let likeCount = 0;
  for (const user of fakeUsers) {
    for (const post of updatedPosts) {
      if (post.user_id === user.id) continue; // skip own posts
      if (stableRandom(user.id, post.id) < 0.65) {
        await addLike(post.id, user.id);
        likeCount++;
      }
    }
    process.stdout.write('.');
    await sleep(100);
  }
  console.log(`\n   ✅  Added ~${likeCount} likes\n`);

  // 5. Comments — each fake user comments on ~20% of posts with a beoneofus feature comment
  console.log('💬  Adding beoneofus feature comments…');
  let commentCount = 0;
  for (const user of fakeUsers) {
    // Pick posts to comment on (stable sample ~20%)
    const targetPosts = updatedPosts.filter(p =>
      p.user_id !== user.id && stableRandom(user.id + 'comment', p.id) < 0.20
    );
    for (const post of targetPosts) {
      // Pick a comment from the pool (deterministic based on user+post)
      const idx = Math.floor(stableRandom(user.id, post.id + 'comment') * BEONEOFUS_COMMENTS.length);
      const comment = BEONEOFUS_COMMENTS[idx];
      await addComment(post.id, user.id, comment);
      commentCount++;
      await sleep(50);
    }
    process.stdout.write('.');
    await sleep(100);
  }
  console.log(`\n   ✅  Added ~${commentCount} comments\n`);

  // 6. Cross-follows — fake users follow each other (~40% of pairs)
  //    This makes the connections page look alive and lets real users follow fake users back
  console.log('🔗  Adding cross-follows between fake users…');
  let followCount = 0;
  for (let i = 0; i < fakeUsers.length; i++) {
    for (let j = i + 1; j < fakeUsers.length; j++) {
      const a = fakeUsers[i];
      const b = fakeUsers[j];
      if (stableRandom(a.id, b.id) < 0.40) {
        await addConnection(a.id, b.id);
        followCount++;
      }
    }
    await sleep(50);
  }
  console.log(`   ✅  Added ~${followCount} cross-follows\n`);

  // 7. Update profiles with richer work_status details and make sure website is set
  console.log('👤  Refreshing profile visibility settings…');
  for (const user of fakeUsers) {
    await supabase.from('profiles').update({
      is_verified: true,
      profile_visibility: {
        bio: true, location: true, github: true,
        website: true, work_status: true, certificates: true, posts: true,
      },
    }).eq('id', user.id);
    await sleep(60);
  }
  console.log('   ✅  All profiles set to fully visible\n');

  console.log('🎉  Done!');
  console.log(`   🖼  Image posts added for visual creators`);
  console.log(`   ❤️  ~${likeCount} likes distributed across the platform`);
  console.log(`   💬  ~${commentCount} comments about beoneofus features`);
  console.log(`   🔗  ~${followCount} cross-follows between fake users\n`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
