export const metadata = { title: "Privacy & Security | Probashi AI" };

export default function PrivacyPage() {
  return (
    <div className="container section prose">
      <h1>গোপনীয়তা ও নিরাপত্তা · Privacy &amp; Security</h1>
      <p className="muted">
        People share passports, visas and money details with us. Protecting that information is the product. This page explains exactly
        what we do.
      </p>

      <h2>What we store</h2>
      <ul>
        <li><strong>Without an account: nothing.</strong> Uploaded documents and messages are used once for your check and are never written to disk or a database.</li>
        <li><strong>With an account:</strong> your name, mobile number, a salted scrypt hash of your password (never the password itself), and, only if Memory is on, short notes about your checks and questions.</li>
        <li>We never store document images, never sell data, and agencies never see your information.</li>
        <li>To improve the safety journey we count anonymous events (for example “a step was completed”). These are totals only, with no user ID or IP address stored.</li>
        <li>Memory can be turned off (which erases it), single memories can be deleted, and the whole account can be deleted from the Account page.</li>
      </ul>

      <h2>How it is protected</h2>
      <ul>
        <li>HTTPS everywhere (HSTS), and a strict Content-Security-Policy with per-request nonces that blocks injected scripts.</li>
        <li>Sessions use random 256-bit tokens in HttpOnly, Secure, SameSite cookies. Only a hash of the token is stored.</li>
        <li>Login is rate-limited per network and per account, and errors don&apos;t reveal whether a number is registered.</li>
        <li>Uploads are checked by their real file signature (not the file name), size-limited, and PDFs with active content are rejected.</li>
        <li>Every API checks the request origin, body size and schema. Database queries are parameterised.</li>
        <li>The paid report is encrypted (AES-256-GCM) until payment is verified.</li>
        <li>AI is instructed to treat documents as untrusted data, and the rule engine&apos;s red flags can never be removed by AI output.</li>
      </ul>

      <h2>AI providers</h2>
      <p>
        To read documents, answer questions and generate voice, the text or file you submit is sent to our AI providers (Anthropic and/or
        OpenAI) over an encrypted connection, under their API terms, which do not use API data to train models by default.
      </p>

      <h2>Contact</h2>
      <p>Found a security problem? Please report it responsibly to the project maintainer via the GitHub repository.</p>
    </div>
  );
}
