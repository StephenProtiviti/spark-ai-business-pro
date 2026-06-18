import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import sparkLogo from "@/assets/spark-logo.png";

const Navbar = () => {
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#000D1F] border-b border-[#000D1F]">
      <div className="container mx-auto flex items-center justify-between h-14 px-6">
        <Link to="/" className="relative flex items-center gap-2">
          <span aria-hidden className="absolute inset-0 -m-3 rounded-full bg-[hsl(var(--spark-teal))]/25 blur-xl" />
          <img src={sparkLogo} alt="Spark" className="relative h-8 w-auto" />
        </Link>

        {!isDashboard && (
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium text-[hsl(var(--sidebar-foreground))]/80 hover:text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            View All Ideas
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
