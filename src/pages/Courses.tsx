import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, BookOpen, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PaymentModal from '@/components/PaymentModal';
import Navbar from '@/components/Navbar';
import Chatbot from '@/components/Chatbot';

export default function Courses() {
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('enrollments').select('course_id').eq('user_id', user.id);
      return data?.map(e => e.course_id) || [];
    },
    enabled: !!user,
  });

  const { data: progressMap = {} } = useQuery({
    queryKey: ['course-progress', user?.id],
    queryFn: async () => {
      if (!user) return {};
      const { data: lessons } = await supabase.from('lessons').select('id, section_id, sections!inner(course_id)');
      const { data: progress } = await supabase.from('lesson_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true);
      if (!lessons || !progress) return {};
      const completedSet = new Set(progress.map(p => p.lesson_id));
      const map: Record<string, { total: number; completed: number }> = {};
      for (const l of lessons) {
        const cid = (l as any).sections?.course_id;
        if (!cid) continue;
        if (!map[cid]) map[cid] = { total: 0, completed: 0 };
        map[cid].total++;
        if (completedSet.has(l.id)) map[cid].completed++;
      }
      return map;
    },
    enabled: !!user,
  });

  const filtered = courses.filter((c: any) =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    (c.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleCourseClick = (course: any) => {
    if (enrollments.includes(course.id)) {
      navigate(`/learn/${course.id}`);
    } else {
      setSelectedCourse(course);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-2">
          <h1 className="font-display text-3xl font-bold">Explore Courses</h1>
          <p className="text-muted-foreground">Level up your skills with expert-led courses</p>
        </div>
        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search courses..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No courses found. Check back soon!</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((course: any, i: number) => {
              const enrolled = enrollments.includes(course.id);
              const prog = progressMap[course.id];
              const pct = prog ? Math.round((prog.completed / prog.total) * 100) : 0;
              return (
                <motion.div key={course.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="glass-card hover-lift cursor-pointer overflow-hidden group" onClick={() => handleCourseClick(course)}>
                    <div className="aspect-video bg-muted relative overflow-hidden">
                      {course.thumbnail_url ? (
                        <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full gradient-primary flex items-center justify-center">
                          <BookOpen className="w-12 h-12 text-primary-foreground/50" />
                        </div>
                      )}
                      {enrolled && (
                        <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">Enrolled</Badge>
                      )}
                    </div>
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-display font-semibold text-lg line-clamp-1">{course.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                      <div className="flex items-center justify-between">
                        {enrolled ? (
                          <div className="w-full space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Progress</span><span>{pct}%</span>
                            </div>
                            <Progress value={pct} className="h-2" />
                          </div>
                        ) : (
                          <>
                            <span className="font-display font-bold text-lg text-primary">
                              {course.price > 0 ? `$${course.price}` : 'Free'}
                            </span>
                            <Button size="sm" className="gradient-primary text-primary-foreground">Enroll</Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <Chatbot courses={courses} />
      {selectedCourse && (
        <PaymentModal course={selectedCourse} onClose={() => setSelectedCourse(null)} />
      )}
    </div>
  );
}
