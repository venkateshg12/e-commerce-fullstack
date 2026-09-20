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
    return (
        <div className="flex flex-row items-center justify-between gap-3 w-full">
            <div className="relative flex-1  max-w-md flex items-center">
                <Search className="absolute left-3 z-10 h-4 w-4 pointer-events-none text-muted-foreground" />
                <Input
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder="Search Products"
                    className="pl-9 h-10 w-full"
                />
            </div>
            <div className="flex flex-row flex-wrap items-center justify-end gap-2 shrink-0">
                <Button onClick={onManageBrands} variant="outline" className="cursor-pointer h-10 px-4 whitespace-nowrap">
                    Manage Brands
                </Button>
                <Button onClick={onManageCategories} variant="outline" className="cursor-pointer h-10 px-4 whitespace-nowrap">
                    Manage Categories
                </Button>
                <Button onClick={onAddProduct} className="cursor-pointer h-10 px-4 whitespace-nowrap">
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Product
                </Button>
            </div>
        </div>
    )
}

export default ProductToolbar

