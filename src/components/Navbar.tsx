import { Link } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import sparkLogo from "@/assets/spark-logo.png";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[hsl(var(--sidebar-background))] border-b border-[hsl(var(--sidebar-border))]">
      <div className="container mx-auto flex items-center justify-between h-14 px-6">
        <Link to="/" className="flex items-center gap-2">
          <img src={sparkLogo} alt="Spark" className="h-12 rounded" />
        </Link>

        <Link
          to="/dashboard"
          className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium text-[hsl(var(--sidebar-foreground))]/80 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
