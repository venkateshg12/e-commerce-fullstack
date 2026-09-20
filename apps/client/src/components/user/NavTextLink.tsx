import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

const NavTextLink = ({ href, label, icon: Icon }: { href: string, label: string, icon: LucideIcon }) => {
    return <Link to={href} className="inline-flex items-center gap-2 textLink">
        <Icon className="h-4.5 w-4.5" />
        <span>{label}</span>
    </Link>
}

export default NavTextLink;
