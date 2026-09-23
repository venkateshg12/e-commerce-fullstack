import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

type NavSearchFormProps = {
  initialTerm: string;
};

const NavSearchForm = ({ initialTerm }: NavSearchFormProps) => {
  const navigate = useNavigate();
  const [term, setTerm] = useState(initialTerm);

  // Searching is just a filtered collections list, so it lands on /collections with the term in
  // the URL — the same place the filters live, and a link that reproduces the results.
  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    const query = term.trim();
    navigate(query ? `/collections?search=${encodeURIComponent(query)}` : "/collections");
  };

  return (
    <form onSubmit={submit} className="nav-search-form" role="search">
      <Input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Search products"
        aria-label="Search products"
        className="nav-search-input"
      />

      <button type="submit" className="nav-search-button" aria-label="Search">
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
};

const NavSearch = () => {
  const [searchParams] = useSearchParams();
  const term = searchParams.get("search") ?? "";

  // Keyed on the term, so clearing the search chip on /collections empties the box too, without
  // an effect syncing the draft back from the URL.
  return <NavSearchForm key={term} initialTerm={term} />;
};

export default NavSearch;
