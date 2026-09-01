import Link from "next/link";

export const metadata = {
  title: "Terms of Service — beoneofus",
  description: "The terms and conditions governing your use of beoneofus.",
};

const LAST_UPDATED = "June 19, 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <Link href="/" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">← beoneofus</Link>
          <h1 className="text-4xl font-black tracking-tight mt-4 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">1. Acceptance of terms</h2>
            <p>
              By creating an account or using beoneofus (&quot;the platform&quot;, &quot;we&quot;, &quot;us&quot;), you agree to these Terms of Service.
              If you do not agree, do not use the platform. We may update these terms at any time; continued
              use constitutes acceptance of the current version.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">2. Eligibility</h2>
            <p>
              You must be at least 16 years old to create an account. By using beoneofus you represent that
              you meet this requirement. Accounts created on behalf of a company or organisation must be
              authorised to bind that entity to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">3. Your account</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You must provide accurate information when creating your profile.</li>
              <li>You may not create more than one personal account.</li>
              <li>You must notify us immediately of any unauthorised access to your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">4. Acceptable use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Post content that is illegal, harmful, abusive, defamatory, or discriminatory.</li>
              <li>Spam, harass, or impersonate other users.</li>
              <li>Scrape or harvest data from the platform without written permission.</li>
              <li>Attempt to gain unauthorised access to any part of the platform or its infrastructure.</li>
              <li>Use the platform to distribute malware or conduct phishing attacks.</li>
              <li>Post false or misleading professional credentials or endorsements.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">5. Content you post</h2>
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
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">6. Premium subscriptions</h2>
            <p>
              Certain features require a paid premium subscription. Subscriptions are billed as described
              at the time of purchase. You may cancel at any time; cancellation takes effect at the end of
              the current billing period. We do not offer refunds for partial periods except where required
              by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">7. Intellectual property</h2>
            <p>
              All platform branding, design, code, and content produced by beoneofus is our intellectual
              property and may not be copied, modified, or distributed without written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">8. Disclaimers</h2>
            <p>
              The platform is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the
              accuracy of user-generated content, job listings, or AI-generated advice. AI features
              are assistive tools — always exercise your own professional judgement.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">9. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, beoneofus shall not be liable for indirect, incidental,
              special, or consequential damages arising from your use of the platform. Our total liability
              to you shall not exceed the amount you paid us in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">10. Termination</h2>
            <p>
              We may suspend or terminate your account at any time for violation of these terms. You may
              delete your account at any time via Settings. Upon termination, your right to use the platform
              ceases immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">11. Governing law</h2>
            <p>
              These terms are governed by the laws of the jurisdiction in which beoneofus is registered.
              Any disputes shall be resolved through good-faith negotiation first, and thereafter in
              the competent courts of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">12. Contact</h2>
            <p>
              Questions about these terms? Contact us at{" "}
              <a href="mailto:legal@beoneofus.work" className="text-blue-600 dark:text-blue-400 hover:underline">legal@beoneofus.work</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400">Privacy Policy</Link>
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
          <Link href="/auth" className="hover:text-blue-600 dark:hover:text-blue-400">Sign In</Link>
        </div>
      </div>
    </main>
  );
}
