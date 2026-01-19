'use client';

export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Privacy Policy</h1>

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p className="text-muted-foreground mb-8 text-lg">
          Last updated:{' '}
          {new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            1. Information We Collect
          </h2>
          <p className="mb-4">
            When you use Nowly, we collect information that you provide directly
            to us, including:
          </p>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Account information (email address, password)</li>
            <li>
              Task data (task titles, descriptions, dates, and other
              task-related information)
            </li>
            <li>Usage data (features you use, preferences, and settings)</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            2. How We Use Your Information
          </h2>
          <p className="mb-4">We use the information we collect to:</p>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Provide, maintain, and improve our services</li>
            <li>Process your tasks and sync your data across devices</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Protect against fraudulent or unauthorized use</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            3. Data Storage and Security
          </h2>
          <p className="mb-4">
            Your data is stored securely using industry-standard encryption. We
            use Supabase, a trusted cloud database provider, to store your
            information. We implement appropriate technical and organizational
            measures to protect your personal data against unauthorized access,
            alteration, disclosure, or destruction.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">4. Data Sharing</h2>
          <p className="mb-4">
            We do not sell, trade, or rent your personal information to third
            parties. We may share your information only in the following
            circumstances:
          </p>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>With your consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and safety</li>
            <li>
              With service providers who assist in operating our service (under
              strict confidentiality agreements)
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">5. Your Rights</h2>
          <p className="mb-4">You have the right to:</p>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Access and export your personal data</li>
            <li>Correct inaccurate or incomplete data</li>
            <li>Delete your account and associated data</li>
            <li>Opt out of marketing communications</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            6. Cookies and Tracking
          </h2>
          <p className="mb-4">
            We use cookies and similar tracking technologies to maintain your
            session and remember your preferences. You can control cookie
            settings through your browser preferences.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            7. Children&apos;s Privacy
          </h2>
          <p className="mb-4">
            Our service is not intended for users under the age of 13. We do not
            knowingly collect personal information from children under 13.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            8. Changes to This Policy
          </h2>
          <p className="mb-4">
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the &quot;Last updated&quot; date.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">9. Contact Us</h2>
          <p className="mb-4">
            If you have any questions about this Privacy Policy, please contact
            us at:
          </p>
          <p className="font-medium">Email: privacy@nowly.app</p>
        </section>
      </div>
    </div>
  );
}
