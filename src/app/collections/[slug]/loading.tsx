import { Skeleton } from "@/app/components/ui/skeleton";

export default function CollectionDetailLoading() {
  return (
    <div className="min-h-screen bg-[#f9f7f4]">
      <main className="pt-[180px] pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Back link + header */}
          <div className="mb-16">
            <Skeleton className="h-4 w-32 mb-8" />
            <Skeleton className="h-3 w-24 mb-4" />
            <Skeleton className="h-12 w-2/3 max-w-lg mb-4" />
            <Skeleton className="h-6 w-full max-w-xl" />
          </div>

          {/* Product grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-[#e8e9e5] overflow-hidden">
                <Skeleton className="w-full aspect-square rounded-none" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex items-center justify-between pt-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-9 w-9 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
