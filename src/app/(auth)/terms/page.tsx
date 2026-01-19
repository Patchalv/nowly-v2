'use client';

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-8 text-4xl font-bold">Terms of Service</h1>

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
            1. Acceptance of Terms
          </h2>
          <p className="mb-4">
            By accessing and using Nowly (&quot;the Service&quot;), you accept
            and agree to be bound by the terms and provision of this agreement.
            If you do not agree to these Terms of Service, please do not use the
            Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            2. Description of Service
          </h2>
          <p className="mb-4">
            Nowly is a task management application that helps you organize your
            tasks, set schedules, and manage your productivity. We reserve the
            right to modify, suspend, or discontinue the Service at any time
            without notice.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">3. User Accounts</h2>
          <p className="mb-4">
            To use certain features of the Service, you must register for an
            account. You agree to:
          </p>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>
              Provide accurate, current, and complete information during
              registration
            </li>
            <li>
              Maintain and update your information to keep it accurate and
              current
            </li>
            <li>Maintain the security of your password and account</li>
            <li>
              Accept responsibility for all activities that occur under your
              account
            </li>
            <li>
              Notify us immediately of any unauthorized use of your account
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">4. Acceptable Use</h2>
          <p className="mb-4">You agree not to:</p>
          <ul className="mb-4 list-disc space-y-2 pl-6">
            <li>Use the Service for any illegal or unauthorized purpose</li>
            <li>
              Attempt to gain unauthorized access to the Service or related
              systems
            </li>
            <li>Interfere with or disrupt the Service or servers</li>
            <li>Transmit any viruses, malware, or harmful code</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Impersonate any person or entity</li>
            <li>Collect or harvest any information from other users</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">5. User Content</h2>
          <p className="mb-4">
            You retain all rights to the content you create and store in Nowly
            (tasks, notes, etc.). By using the Service, you grant us a limited
            license to store, process, and display your content solely for the
            purpose of providing the Service to you.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            6. Intellectual Property
          </h2>
          <p className="mb-4">
            The Service and its original content, features, and functionality
            are owned by Nowly and are protected by international copyright,
            trademark, and other intellectual property laws. You may not copy,
            modify, distribute, sell, or lease any part of our Service without
            our express written permission.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">7. Termination</h2>
          <p className="mb-4">
            We may terminate or suspend your account and access to the Service
            immediately, without prior notice or liability, for any reason,
            including but not limited to breach of these Terms. Upon
            termination, your right to use the Service will immediately cease.
          </p>
          <p className="mb-4">
            You may terminate your account at any time through the account
            settings page. Upon termination, your data will be deleted in
            accordance with our Privacy Policy.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            8. Disclaimer of Warranties
          </h2>
          <p className="mb-4">
            The Service is provided &quot;as is&quot; and &quot;as
            available&quot; without warranties of any kind, either express or
            implied, including but not limited to warranties of merchantability,
            fitness for a particular purpose, or non-infringement.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            9. Limitation of Liability
          </h2>
          <p className="mb-4">
            In no event shall Nowly, its directors, employees, or agents be
            liable for any indirect, incidental, special, consequential, or
            punitive damages, including without limitation loss of data or
            profits, arising out of or in connection with your use of the
            Service.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">10. Changes to Terms</h2>
          <p className="mb-4">
            We reserve the right to modify these Terms at any time. We will
            notify users of any material changes by posting the new Terms on
            this page and updating the &quot;Last updated&quot; date. Your
            continued use of the Service after such changes constitutes
            acceptance of the new Terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">11. Governing Law</h2>
          <p className="mb-4">
            These Terms shall be governed by and construed in accordance with
            the laws of the jurisdiction in which Nowly operates, without regard
            to its conflict of law provisions.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">
            12. Contact Information
          </h2>
          <p className="mb-4">
            If you have any questions about these Terms, please contact us at:
          </p>
          <p className="font-medium">Email: legal@nowly.app</p>
        </section>
      </div>
    </div>
  );
}
