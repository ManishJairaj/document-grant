import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Brain, LayoutDashboard, BookOpen, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/learn", label: "Learn", icon: BookOpen },
  { path: "/profile", label: "Profile", icon: User },
];

const DashboardLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">Solasta</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {active && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-accent rounded-lg -z-10"
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur-md z-50">
        <div className="flex justify-around py-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-medium ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="container py-8 pb-24 md:pb-8">{children}</main>
    </div>
  );
};

export default DashboardLayout;
