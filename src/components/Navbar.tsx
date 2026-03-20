import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { GraduationCap, LogOut, User, LayoutDashboard, BookOpen } from 'lucide-react';

export default function Navbar() {
  const { user, isAdmin, signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <nav className="sticky top-0 z-50 glass-card border-b border-border/50 px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/courses" className="flex items-center gap-2">
          <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold">LearnHub</span>
        </Link>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/courses">
                <Button variant="ghost" size="sm" className="gap-2">
                  <BookOpen className="w-4 h-4" /> Courses
                </Button>
              </Link>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LayoutDashboard className="w-4 h-4" /> Admin
                  </Button>
                </Link>
              )}
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="w-4 h-4" /> {profile?.full_name || 'Profile'}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-destructive">
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="gradient-primary text-primary-foreground">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
