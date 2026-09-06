import Link from "next/link";
import { Landmark, ShieldCheck } from "lucide-react";
import RwandaFlag from "../components/RwandaFlag";
import LegalDoc from "../components/LegalDoc";

export const metadata = {
  title: "Privacy Policy — beoneofus",
  description: "How beoneofus collects, uses, and protects your personal data, in line with Rwanda's Law N° 058/2021 on data protection and privacy.",
};

const LAST_UPDATED = "September 4, 2026";
const EFFECTIVE_DATE = "September 4, 2026";

const SECTIONS = [
  { id: "who-we-are", label: "1. Who we are" },
  { id: "legal-framework", label: "2. Legal framework" },
  { id: "data-we-collect", label: "3. Data we collect" },
  { id: "legal-basis", label: "4. Legal basis for processing" },
  { id: "how-we-use", label: "5. How we use your data" },
  { id: "data-sharing", label: "6. Data sharing & processors" },
  { id: "international-transfers", label: "7. International transfers" },
  { id: "data-retention", label: "8. Data retention" },
  { id: "your-rights", label: "9. Your rights" },
  { id: "dpo", label: "10. Data Protection Officer" },
  { id: "cookies", label: "11. Cookies" },
  { id: "security", label: "12. Security & breach notice" },
  { id: "children", label: "13. Children" },
  { id: "changes", label: "14. Changes to this policy" },
  { id: "contact", label: "15. Contact & complaints" },
];

function H2({ id, children }) {
  return (
    <h2 id={id} className="scroll-mt-24 text-lg font-black text-gray-900 dark:text-white mb-3">
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10 max-w-3xl">
          <Link href="/" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">← beoneofus</Link>
          <h1 className="text-4xl font-black tracking-tight mt-4 mb-3">Privacy Policy</h1>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-semibold px-3 py-1">
              <RwandaFlag className="scale-[0.55] -my-1.5 -ml-0.5" />
              Governed by the laws of the Republic of Rwanda
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Law N° 058/2021 compliant framework
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Effective {EFFECTIVE_DATE} · Last updated {LAST_UPDATED}
          </p>
        </div>

        <LegalDoc sections={SECTIONS}>
          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300 pb-16">

            <section>
              <H2 id="who-we-are">1. Who we are</H2>
              <p>
                beoneofus (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the education-and-career ecosystem at{" "}
                <strong>beoneofus.work</strong>, connecting students, mentors, schools, and institutions.
                For the purposes of Rwanda&apos;s data protection law, beoneofus acts as the{" "}
                <strong>data controller</strong> for personal data processed on the platform.
              </p>
              <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-xs text-gray-500 dark:text-gray-400">
                Registered legal entity: <strong>[Legal entity name]</strong> · RDB registration no.: <strong>[TIN / registration number]</strong>{" "}
                · Registered address: <strong>[Registered office address, Rwanda]</strong>
              </div>
            </section>

            <section>
              <H2 id="legal-framework">2. Legal framework</H2>
              <p>
                This Privacy Policy is issued in accordance with{" "}
                <strong>Law N° 058/2021 of 13/10/2021 relating to the protection of personal data and privacy</strong>{" "}
                of the Republic of Rwanda (&quot;the Data Protection Law&quot;), and its implementing regulations. Where our
                processors or infrastructure sit outside Rwanda, we also align our practices with recognised
                international standards (such as the EU GDPR) so that your data is never protected to a lower
                standard than Rwandan law requires.
              </p>
              <p className="mt-3">
                The supervisory authority for data protection in Rwanda is the{" "}
                <strong>National Cyber Security Authority (NCSA)</strong>, through its Data Protection and Privacy
                Office.
              </p>
            </section>

            <section>
              <H2 id="data-we-collect">3. Data we collect</H2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Account data:</strong> name, email address, password (hashed), profile photo, bio, skills, and career information you provide on sign-up or in your profile.</li>
                <li><strong>Institutional data:</strong> for students, mentors, and staff onboarded through a school or organization, the enrolment, role, and academic/mentorship records that institution provides or that you generate on the platform.</li>
                <li><strong>Usage data:</strong> pages visited, features used, session timestamps, and device/browser metadata collected automatically to improve the platform.</li>
                <li><strong>Content:</strong> posts, messages, comments, uploaded files, credentials, and any other content you create on the platform.</li>
                <li><strong>Payment data:</strong> if you purchase a premium plan, payment is handled by Paystack. We do not store full card details.</li>
                <li><strong>Communications:</strong> emails or messages you send to our support team.</li>
              </ul>
            </section>

            <section>
              <H2 id="legal-basis">4. Legal basis for processing</H2>
              <p>Under the Data Protection Law, we only process your personal data where we have a valid legal basis, namely:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Consent</strong> — for example, when you opt in to optional communications.</li>
                <li><strong>Performance of a contract</strong> — to create and operate your account and deliver the platform&apos;s core features.</li>
                <li><strong>Legitimate interest</strong> — to secure the platform, prevent fraud, and improve our services, balanced against your rights.</li>
                <li><strong>Legal obligation</strong> — to comply with Rwandan law, regulatory requests, or a valid court order.</li>
              </ul>
            </section>

            <section>
              <H2 id="how-we-use">5. How we use your data</H2>
              <ul className="list-disc pl-5 space-y-2">
                <li>To provide, maintain, and improve the platform and its features.</li>
                <li>To send you transactional emails (account verification, password reset, notifications).</li>
                <li>To personalise your experience and surface relevant content, mentorship matches, and opportunities.</li>
                <li>To detect and prevent fraud, abuse, and security incidents.</li>
                <li>To comply with legal obligations under Rwandan and, where applicable, other law.</li>
              </ul>
              <p className="mt-3">We do not sell your personal data to third parties. We do not use your data for advertising profiling.</p>
            </section>

            <section>
              <H2 id="data-sharing">6. Data sharing & processors</H2>
              <p>We share data only with:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Supabase</strong> — our database and authentication provider.</li>
                <li><strong>Paystack</strong> — payment processing for premium subscriptions.</li>
                <li><strong>Resend / email providers</strong> — transactional email delivery.</li>
                <li><strong>Vercel</strong> — application hosting and edge delivery.</li>
                <li>Your school or institution admin — limited to the records relevant to your enrolment or role there.</li>
                <li>Rwandan law enforcement, NCSA, or another competent regulator when required by applicable law.</li>
              </ul>
              <p className="mt-3">Every processor we use is bound by a data processing agreement requiring them to protect your data to at least the standard this policy describes.</p>
            </section>

            <section>
              <H2 id="international-transfers">7. International transfers</H2>
              <p>
                Some of our processors host data outside Rwanda. The Data Protection Law restricts transferring
                personal data outside Rwanda unless the destination provides an adequate level of protection, or
                another safeguard applies (such as your explicit consent, standard contractual clauses, or the
                transfer being necessary to perform our contract with you). Where we transfer data internationally,
                we rely on one of these safeguards and limit the transfer to what is necessary to operate the
                platform.
              </p>
            </section>

            <section>
              <H2 id="data-retention">8. Data retention</H2>
              <p>
                We retain your account data for as long as your account is active. If you delete your account,
                we will delete or anonymise your personal data within 30 days, except where we are required by
                Rwandan law (or another applicable law) to retain certain records for longer — for example,
                academic or credentialing records an institution is required to keep.
              </p>
            </section>

            <section>
              <H2 id="your-rights">9. Your rights</H2>
              <p>Under the Data Protection Law, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li><strong>Be informed</strong> about how your data is processed (this policy).</li>
                <li><strong>Access</strong> a copy of the personal data we hold about you.</li>
                <li><strong>Rectify</strong> inaccurate or incomplete data.</li>
                <li><strong>Erasure</strong> — request deletion of your data, subject to our retention obligations above.</li>
                <li><strong>Object to or restrict</strong> certain processing.</li>
                <li><strong>Data portability</strong> — receive your data in a machine-readable format.</li>
                <li><strong>Withdraw consent</strong> at any time where processing is based on consent.</li>
                <li><strong>Not be subject</strong> to a decision based solely on automated processing that produces legal or similarly significant effects on you.</li>
                <li><strong>Lodge a complaint</strong> with the National Cyber Security Authority (NCSA) if you believe we have not handled your data lawfully.</li>
              </ul>
              <p className="mt-3">
                To exercise any of these rights, contact us at{" "}
                <a href="mailto:privacy@beoneofus.work" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@beoneofus.work</a>.
                We will respond within the timeframe required by Rwandan law.
              </p>
            </section>

            <section>
              <H2 id="dpo">10. Data Protection Officer</H2>
              <p>
                In line with the Data Protection Law&apos;s requirements for data controllers of our kind, we have
                designated a contact point for data protection matters:
              </p>
              <div className="mt-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-xs text-gray-500 dark:text-gray-400">
                Data Protection Officer: <strong>[Name / role]</strong> · Contact:{" "}
                <a href="mailto:privacy@beoneofus.work" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@beoneofus.work</a>
              </div>
            </section>

            <section>
              <H2 id="cookies">11. Cookies</H2>
              <p>
                We use strictly necessary cookies for session management and authentication. We do not use
                third-party advertising cookies. You can clear cookies via your browser settings at any time.
              </p>
            </section>

            <section>
              <H2 id="security">12. Security & breach notice</H2>
              <p>
                We implement industry-standard security measures including HTTPS encryption, hashed passwords,
                row-level security on our database, and access controls. However, no system is completely secure —
                please protect your account with a strong password.
              </p>
              <p className="mt-3">
                If a personal data breach occurs that is likely to result in a risk to your rights, we will notify
                the National Cyber Security Authority and affected users without undue delay, as required by the
                Data Protection Law.
              </p>
            </section>

            <section>
              <H2 id="children">13. Children</H2>
              <p>
                Where beoneofus is used by school-age students, their accounts are created and managed through
                their school or a parent/guardian, consistent with the Data Protection Law&apos;s protections for
                children&apos;s data. We do not knowingly allow a child to self-register outside that institutional
                or guardian context. If you believe a child has provided us personal data outside these
                safeguards, please contact us immediately.
              </p>
            </section>

            <section>
              <H2 id="changes">14. Changes to this policy</H2>
              <p>
                We may update this Privacy Policy from time to time. When we make significant changes, we will
                notify you via email or an in-app notice. Continued use of the platform after changes constitutes
                acceptance of the updated policy.
              </p>
            </section>

            <section>
              <H2 id="contact">15. Contact & complaints</H2>
              <p>
                Questions about this policy, or a request to exercise your rights? Reach us at{" "}
                <a href="mailto:privacy@beoneofus.work" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@beoneofus.work</a>.
              </p>
              <p className="mt-3">
                If you are not satisfied with our response, you may lodge a complaint with Rwanda&apos;s{" "}
                <span className="inline-flex items-center gap-1"><Landmark className="w-3.5 h-3.5" /> National Cyber Security Authority (NCSA)</span>,
                the supervisory authority for data protection in Rwanda.
              </p>
            </section>
          </div>
        </LegalDoc>

        <div className="mt-4 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 print:hidden">
          <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400">Terms of Service</Link>
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
          <Link href="/auth" className="hover:text-blue-600 dark:hover:text-blue-400">Sign In</Link>
        </div>
      </div>
    </main>
  );
}
