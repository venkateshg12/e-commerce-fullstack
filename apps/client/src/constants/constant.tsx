export const LoadingDots = () => {

    return (
        <>
            <div className="flex space-x-1 justify-center items-center">
                <div className='dotAnimation1 text-white rounded-full animate-pulse text-2xl'>•</div>
                <div className='dotAnimation2 text-white rounded-full animate-pulse text-2xl'>•</div>
                <div className='dotAnimation3 text-white rounded-full animate-pulse text-2xl'>•</div>
                <div className='dotAnimation4 text-white rounded-full animate-pulse text-2xl'>•</div>
            </div>
        </>
    )

}



export const BRAND_OPTIONS = [
    "Nike",
    "Adidas",
    "Puma",
    "Zara",
    "H&M",
    "Levi's",
    "Uniqlo",
    "Mango",
    "Calvin Klein",
    "Tommy Hilfiger",
];

export const SIZE_OPTIONS = ["S", "M", "L", "XL"] as const;

// Flip to false to hide the color facet (and skip the fetch that builds its swatch list).
export const COLOR_FILTER_ENABLED = true;

export const COLOR_MAP: Record<string, string> = {
    black: "#111111",
    white: "#f5f5f5",
    grey: "#b7280c",
    gray: "#b7280c",
    blue: "#2563eb",
    navy: "#1e3a8a",
    red: "#dc2626",
    green: "#16a34a",
    olive: "#4d5b2b",
    yellow: "#eab308",
    beige: "#d6c2a1",
    cream: "#ede8d8",
    brown: "#7c4c2d",
    tan: "#b9936c",
    pink: "#ec4899",
    purple: "#9333ea",
    orange: "#f97316",
    maroon: "#7f1d1d",
};

