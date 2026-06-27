export function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 animate-pulse">
            <div className="h-44 bg-stone-200" />
            <div className="p-4">
                <div className="flex justify-between items-start mb-3">
                    <div className="h-4 bg-stone-200 rounded-full w-24" />
                    <div className="h-5 bg-stone-200 rounded-full w-20" />
                </div>
                <div className="h-3 bg-stone-200 rounded-full w-32 mb-2" />
                <div className="h-3 bg-stone-200 rounded-full w-20" />
            </div>
        </div>
    )
}

export function SkeletonList() {
    return (
        <div className="flex flex-col gap-3">
            {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-2xl border-2 border-stone-200 p-4 animate-pulse">
                    <div className="flex gap-3">
                        <div className="w-12 h-12 rounded-xl bg-stone-200 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="h-4 bg-stone-200 rounded-full w-32 mb-2" />
                            <div className="h-3 bg-stone-200 rounded-full w-24 mb-2" />
                            <div className="h-5 bg-stone-200 rounded-full w-20" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

export function SkeletonTimeline() {
    return (
        <div className="flex flex-col gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-stone-200 flex-shrink-0" />
                    <div className="flex-1 pt-1">
                        <div className="h-4 bg-stone-200 rounded-full w-40 mb-2" />
                        <div className="h-3 bg-stone-200 rounded-full w-56 mb-1" />
                        <div className="h-3 bg-stone-200 rounded-full w-32" />
                    </div>
                </div>
            ))}
        </div>
    )
}