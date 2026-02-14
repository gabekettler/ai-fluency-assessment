import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <h1 className="text-2xl font-bold mb-2">AI Fluency Assessment</h1>
        <p className="text-muted-foreground mb-8">
          Frontier Door &amp; Cabinet
        </p>
        <p className="text-sm text-muted-foreground mb-6">
          If you received an assessment link, please use the URL from your
          invitation email. If you&apos;re an HR administrator, log in below.
        </p>
        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Admin Login
        </Link>
      </div>
    </div>
  );
}
