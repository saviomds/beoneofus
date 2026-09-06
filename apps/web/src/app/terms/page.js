import Link from "next/link";
import { Landmark, Scale } from "lucide-react";
import RwandaFlag from "../components/RwandaFlag";
import LegalDoc from "../components/LegalDoc";

export const metadata = {
  title: "Terms of Service — beoneofus",
  description: "The terms and conditions governing your use of beoneofus, under the laws of the Republic of Rwanda.",
};

const LAST_UPDATED = "September 4, 2026";
const EFFECTIVE_DATE = "September 4, 2026";

const SECTIONS = [
  { id: "acceptance", label: "1. Acceptance of terms" },
  { id: "eligibility", label: "2. Eligibility" },
  { id: "your-account", label: "3. Your account" },
  { id: "acceptable-use", label: "4. Acceptable use" },
  { id: "content-you-post", label: "5. Content you post" },
  { id: "subscriptions", label: "6. Premium subscriptions" },
  { id: "ip", label: "7. Intellectual property" },
  { id: "disclaimers", label: "8. Disclaimers" },
  { id: "liability", label: "9. Limitation of liability" },
  { id: "termination", label: "10. Termination" },
  { id: "governing-law", label: "11. Governing law & jurisdiction" },
  { id: "disputes", label: "12. Dispute resolution" },
  { id: "contact", label: "13. Contact" },
];

function H2({ id, children }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-lg font-black text-gray-900 dark:text-white mb-3">
      {children}
    </h2>
  );
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 max-w-3xl">
          <Link href="/" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">← beoneofus</Link>
          <h1 className="text-4xl font-black tracking-tight mt-4 mb-3">Terms of Service</h1>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1">
              <RwandaFlag className="scale-[0.55] -my-1.5 -ml-0.5" />
              Governed by the laws of the Republic of Rwanda
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1">
              <Scale className="w-3.5 h-3.5" /> Seat of jurisdiction: Kigali
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Effective {EFFECTIVE_DATE} · Last updated {LAST_UPDATED}
          </p>
        </div>

        <LegalDoc sections={SECTIONS}>
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300 pb-16">

            <section>
              <H2 id="acceptance">1. Acceptance of terms</H2>
              <p>
                By creating an account or using beoneofus (&quot;the platform&quot;, &quot;we&quot;, &quot;us&quot;), you agree to these Terms of
                Service. If you do not agree, do not use the platform. We may update these terms at any time;
                continued use constitutes acceptance of the current version.
              </p>
              <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-xs text-gray-500 dark:text-gray-400">
                Registered legal entity: <strong>[Legal entity name]</strong> · Incorporated under Rwanda&apos;s{" "}
                Law N° 007/2021 of 05/02/2021 governing companies · RDB registration no.: <strong>[TIN / registration number]</strong>
              </div>
            </section>

            <section>
              <H2 id="eligibility">2. Eligibility</H2>
              <p>
                You must be at least 16 years old to create an account directly. Younger students may use the
                platform through an account created by their school or a parent/guardian. By using beoneofus you
                represent that you meet this requirement. Accounts created on behalf of a school, company, or
                organization must be authorised to bind that entity to these terms.
              </p>
            </section>

            <section>
              <H2 id="your-account">3. Your account</H2>
              <ul className="list-disc pl-5 space-y-2">
                <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You must provide accurate information when creating your profile.</li>
                <li>You may not create more than one personal account.</li>
                <li>You must notify us immediately of any unauthorised access to your account.</li>
              </ul>
            </section>

            <section>
              <H2 id="acceptable-use">4. Acceptable use</H2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>Post content that is illegal under Rwandan law, harmful, abusive, defamatory, or discriminatory.</li>
                <li>Spam, harass, or impersonate other users.</li>
                <li>Scrape or harvest data from the platform without written permission.</li>
                <li>Attempt to gain unauthorised access to any part of the platform or its infrastructure.</li>
                <li>Use the platform to distribute malware or conduct phishing attacks.</li>
                <li>Post false or misleading academic credentials, professional qualifications, or endorsements.</li>
              </ul>
              <p className="mt-3">
                Use of the platform&apos;s electronic communications and any credentials it issues is also governed by{" "}
                Rwanda&apos;s Law N° 24/2016 of 18/06/2016 governing information and communication technologies,
                to the extent it applies.
              </p>
            </section>

            <section>
              <H2 id="content-you-post">5. Content you post</H2>
              <p>
                You retain ownership of the content you post. By posting, you grant beoneofus a worldwide,
                non-exclusive, royalty-free licence to display, distribute, and promote your content within
                the platform. We do not claim ownership of your content.
              </p>
              <p className="mt-3">
                You are solely responsible for content you post. We reserve the right to remove content that
                violates these terms without notice.
              </p>
            </section>

            <section>
              <H2 id="subscriptions">6. Premium subscriptions</H2>
              <p>
                Certain features require a paid premium subscription. Subscriptions are billed as described
                at the time of purchase. You may cancel at any time; cancellation takes effect at the end of
                the current billing period. We do not offer refunds for partial periods except where required
                by applicable Rwandan consumer protection law.
              </p>
            </section>

            <section>
              <H2 id="ip">7. Intellectual property</H2>
              <p>
                All platform branding, design, code, and content produced by beoneofus is our intellectual
                property, protected under Rwandan and applicable international intellectual property law, and
                may not be copied, modified, or distributed without written permission.
              </p>
            </section>

            <section>
              <H2 id="disclaimers">8. Disclaimers</H2>
              <p>
                The platform is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the
                accuracy of user-generated content, mentorship or job-related listings, or AI-generated advice.
                AI features are assistive tools — always exercise your own professional judgement.
              </p>
            </section>

            <section>
              <H2 id="liability">9. Limitation of liability</H2>
              <p>
                To the fullest extent permitted by Rwandan law, beoneofus shall not be liable for indirect,
                incidental, special, or consequential damages arising from your use of the platform. Our total
                liability to you shall not exceed the amount you paid us in the 12 months preceding the claim.
                Nothing in these terms limits any liability that cannot lawfully be limited or excluded under
                Rwandan law.
              </p>
            </section>

            <section>
              <H2 id="termination">10. Termination</H2>
              <p>
                We may suspend or terminate your account at any time for violation of these terms. You may
                delete your account at any time via Settings. Upon termination, your right to use the platform
                ceases immediately.
              </p>
            </section>

            <section>
              <H2 id="governing-law">11. Governing law & jurisdiction</H2>
              <p>
                These terms, and any dispute arising from or relating to them or the platform, are governed by
                the laws of the <strong>Republic of Rwanda</strong>, without regard to conflict-of-law principles.
                Subject to the dispute resolution process below, the competent courts sitting in{" "}
                <strong>Kigali, Rwanda</strong> shall have exclusive jurisdiction.
              </p>
            </section>

            <section>
              <H2 id="disputes">12. Dispute resolution</H2>
              <p>
                If a dispute arises, we ask that you first contact us so we can try to resolve it informally
                and in good faith. If it cannot be resolved this way within a reasonable time, either party may
                pursue mediation before a mutually agreed mediator seated in Rwanda, and thereafter the matter
                may be brought before the competent courts of the Republic of Rwanda as described above.
              </p>
            </section>

            <section>
              <H2 id="contact">13. Contact</H2>
              <p>
                Questions about these terms? Contact us at{" "}
                <a href="mailto:legal@beoneofus.work" className="text-blue-600 dark:text-blue-400 hover:underline">legal@beoneofus.work</a>.
              </p>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Landmark className="w-3.5 h-3.5" /> Registered and operating under the laws of the Republic of Rwanda.
              </p>
            </section>
          </div>
        </LegalDoc>

        <div className="mt-4 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 print:hidden">
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400">Privacy Policy</Link>
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
          <Link href="/auth" className="hover:text-blue-600 dark:hover:text-blue-400">Sign In</Link>
        </div>
      </div>
    </main>
  );
}
