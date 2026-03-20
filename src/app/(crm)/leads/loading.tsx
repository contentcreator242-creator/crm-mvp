export default function LeadsLoading() {
  return (
    <main className="crm-page">
      <div className="crm-container">
        <div className="mb-8">
          <div className="h-7 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-200" />
        </div>

        <div className="crm-table-wrap">
          <div className="space-y-3 p-4">
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </main>
  );
}

