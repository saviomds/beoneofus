import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — beoneofus",
  description: "How beoneofus collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "June 19, 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <Link href="/" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">← beoneofus</Link>
          <h1 className="text-4xl font-black tracking-tight mt-4 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-gray-700 dark:text-gray-300">

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">1. Who we are</h2>
            <p>
              beoneofus (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) operates the professional network at{" "}
              <strong>beoneofus.work</strong>. We are committed to protecting the personal information
              you share with us. This Privacy Policy explains what data we collect, how we use it,
              and your rights over it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">2. Data we collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account data:</strong> name, email address, password (hashed), profile photo, bio, skills, and career information you provide on sign-up or in your profile.</li>
              <li><strong>Usage data:</strong> pages visited, features used, session timestamps, and device/browser metadata collected automatically to improve the platform.</li>
              <li><strong>Content:</strong> posts, messages, comments, uploaded files, and any other content you create on the platform.</li>
              <li><strong>Payment data:</strong> if you purchase a premium plan, payment is handled by Paystack. We do not store full card details.</li>
              <li><strong>Communications:</strong> emails you send to our support team.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">3. How we use your data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, maintain, and improve the platform and its features.</li>
              <li>To send you transactional emails (account verification, password reset, notifications).</li>
              <li>To personalise your experience and surface relevant content, jobs, and connections.</li>
              <li>To detect and prevent fraud, abuse, and security incidents.</li>
              <li>To comply with legal obligations.</li>
            </ul>
            <p className="mt-3">We do not sell your personal data to third parties. We do not use your data for advertising profiling.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">4. Data sharing</h2>
            <p>We share data only with:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li><strong>Supabase</strong> — our database and authentication provider (EU/US infrastructure).</li>
              <li><strong>Paystack</strong> — payment processing for premium subscriptions.</li>
              <li><strong>Resend / email providers</strong> — transactional email delivery.</li>
              <li><strong>Vercel</strong> — application hosting and edge delivery.</li>
              <li>Law enforcement or regulators when required by applicable law.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">5. Data retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you delete your account,
              we will delete or anonymise your personal data within 30 days, except where we are required by
              law to retain certain records.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">6. Your rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Access a copy of the personal data we hold about you.</li>
              <li>Correct inaccurate or incomplete data.</li>
              <li>Request deletion of your data (&quot;right to be forgotten&quot;).</li>
              <li>Object to or restrict certain processing.</li>
              <li>Data portability — receive your data in a machine-readable format.</li>
              <li>Withdraw consent at any time where processing is based on consent.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:privacy@beoneofus.work" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@beoneofus.work</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">7. Cookies</h2>
            <p>
              We use strictly necessary cookies for session management and authentication. We do not use
              third-party advertising cookies. You can clear cookies via your browser settings at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">8. Security</h2>
            <p>
              We implement industry-standard security measures including HTTPS encryption, hashed passwords,
              row-level security on our database, and access controls. However, no system is completely secure —
              please protect your account with a strong password.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">9. Children</h2>
            <p>
              beoneofus is not intended for users under 16 years of age. We do not knowingly collect data
              from children. If you believe a child has provided us personal data, please contact us
              immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">10. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we make significant changes, we will
              notify you via email or an in-app notice. Continued use of the platform after changes constitutes
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-gray-900 dark:text-white mb-3">11. Contact</h2>
            <p>
              Questions about this policy? Reach us at{" "}
              <a href="mailto:privacy@beoneofus.work" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@beoneofus.work</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400">Terms of Service</Link>
          <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">Home</Link>
          <Link href="/auth" className="hover:text-blue-600 dark:hover:text-blue-400">Sign In</Link>
        </div>
      </div>
    </main>
  );
}
