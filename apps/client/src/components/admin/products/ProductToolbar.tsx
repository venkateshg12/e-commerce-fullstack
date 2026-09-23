import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"

type ProductToolbarProps = {
    search: string,
    onSearchChange: (value: string) => void,
    onManageCategories: () => void,
    onManageBrands: () => void,
    onAddProduct: () => void,
}

const ProductToolbar = ({ search, onSearchChange, onManageCategories, onManageBrands, onAddProduct }: ProductToolbarProps) => {
    // Three labelled buttons and a search field can't share a phone row, so the search takes its
    // own line and the buttons wrap below it until there is room for one row.
    return (
        <div className="flex w-full flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex w-full items-center lg:max-w-md lg:flex-1">
                <Search className="absolute left-3 z-10 h-4 w-4 pointer-events-none text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search Products"
                    className="pl-9 h-10 w-full"
                />
            </div>
            <div className="flex flex-row flex-wrap items-center gap-2 shrink-0 lg:justify-end">
                <Button onClick={onManageBrands} variant="outline" className="cursor-pointer h-10 flex-1 px-3 whitespace-nowrap sm:flex-none sm:px-4">
                    Manage Brands
                </Button>
                <Button onClick={onManageCategories} variant="outline" className="cursor-pointer h-10 flex-1 px-3 whitespace-nowrap sm:flex-none sm:px-4">
                    Manage Categories
                </Button>
                <Button onClick={onAddProduct} className="cursor-pointer h-10 w-full px-4 whitespace-nowrap sm:w-auto">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Product
                </Button>
            </div>
        </div>
    )
}

export default ProductToolbar

