import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, BookOpen, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const { data: enrolledCourses = [] } = useQuery({
    queryKey: ['enrolled-courses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: enrollments } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id);
      if (!enrollments?.length) return [];
      const ids = enrollments.map(e => e.course_id);
      const { data: courses } = await supabase.from('courses').select('*').in('id', ids);
      return courses || [];
    },
    enabled: !!user,
  });

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ full_name: name }).eq('user_id', user.id);
    if (error) toast.error('Failed to update');
    else {
      toast.success('Profile updated!');
      await refreshProfile();
    }
    setSaving(false);
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <h1 className="font-display text-3xl font-bold">My Profile</h1>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display"><User className="w-5 h-5" /> Personal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email || ''} disabled className="opacity-60" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display"><BookOpen className="w-5 h-5" /> Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledCourses.length === 0 ? (
              <p className="text-muted-foreground text-sm">You haven't enrolled in any courses yet.</p>
            ) : (
              <div className="space-y-3">
                {enrolledCourses.map((c: any) => (
                  <button key={c.id} onClick={() => navigate(`/learn/${c.id}`)} className="w-full text-left p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <p className="font-semibold">{c.title}</p>
                    <p className="text-sm text-muted-foreground line-clamp-1">{c.description}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
