import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

type PromoToolbarProps = {
    search?: string;
    onSearchChange?: (value: string) => void;
    onAddPromo?: () => void;
};

const PromoToolbar = ({ search = "", onSearchChange, onAddPromo }: PromoToolbarProps) => {
    return (
        <div className="wrap-class">
            <div className="search-wrap-class">
                <Search className="search-icon-class" />
                <Input
                    value={search}
                    onChange={(e) => onSearchChange?.(e.target.value)}
                    placeholder="Search Promos"
                    className="search-input-class pl-10"
                />
            </div>
            <Button onClick={onAddPromo} className="add-button-class">
                <Plus className="add-button-icon-class" />
                Add Promo
            </Button>
        </div>
    );
};

export default PromoToolbar;
