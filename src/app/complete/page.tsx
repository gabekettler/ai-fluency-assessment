export default function CompletePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-lg px-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3">
          Thank You for Completing the Assessment
        </h1>
        <p className="text-muted-foreground mb-2">
          Your responses have been submitted to the hiring team at Frontier Door
          &amp; Cabinet.
        </p>
        <p className="text-sm text-muted-foreground">
          You will hear from us regarding next steps in the interview process.
        </p>
      </div>
    </div>
  );
}
