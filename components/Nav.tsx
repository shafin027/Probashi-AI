import Link from "next/link";

const LINKS = [
  { href: "/check", label: "অফার চেক" },
  { href: "/cost", label: "খরচ হিসাব" },
  { href: "/agency", label: "এজেন্সি যাচাই" },
  { href: "/ask", label: "প্রশ্ন করুন" },
  { href: "/plan", label: "পরিবার ও টাকা" },
  { href: "/#pricing", label: "মূল্য" },
];

export function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <Link href="/" className="brand" aria-label="Probashi AI home">
          <span className="brand-mark" aria-hidden>প্র</span>
          Probashi AI
        </Link>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
