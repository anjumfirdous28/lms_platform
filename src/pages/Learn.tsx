import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, ChevronLeft, ChevronRight, ArrowLeft, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

function getYoutubeId(url: string) {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#]+)/);
  return match?.[1];
}

export default function Learn() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*').eq('id', courseId!).single();
      return data;
    },
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', courseId],
    queryFn: async () => {
      const { data } = await supabase.from('sections').select('*, lessons(*)').eq('course_id', courseId!).order('sort_order');
      return (data || []).map((s: any) => ({
        ...s,
        lessons: (s.lessons || []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      }));
    },
  });

  const allLessons = useMemo(() => sections.flatMap((s: any) => s.lessons), [sections]);

  const { data: completedLessons = [] } = useQuery({
    queryKey: ['lesson-progress', courseId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const ids = allLessons.map((l: any) => l.id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from('lesson_progress').select('lesson_id').eq('user_id', user.id).eq('completed', true).in('lesson_id', ids);
      return data?.map(p => p.lesson_id) || [];
    },
    enabled: !!user && allLessons.length > 0,
  });

  const currentLesson = allLessons.find((l: any) => l.id === selectedLessonId) || allLessons[0];
  const currentIndex = allLessons.indexOf(currentLesson);
  const pct = allLessons.length > 0 ? Math.round((completedLessons.length / allLessons.length) * 100) : 0;

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user) return;
      await supabase.from('lesson_progress').upsert({
        user_id: user.id,
        lesson_id: lessonId,
        completed: true,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,lesson_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      toast.success('Lesson completed!');
    },
  });

  if (!course) return null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card overflow-y-auto shrink-0 hidden md:block">
        <div className="p-4 border-b border-border">
          <Button variant="ghost" size="sm" onClick={() => navigate('/courses')} className="gap-2 mb-3">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h2 className="font-display font-bold text-lg line-clamp-2">{course.title}</h2>
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Progress</span><span>{pct}%</span></div>
            <Progress value={pct} className="h-2" />
          </div>
        </div>
        <div className="p-2">
          {sections.map((section: any) => (
            <div key={section.id} className="mb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">{section.title}</p>
              {section.lessons.map((lesson: any) => {
                const done = completedLessons.includes(lesson.id);
                const active = lesson.id === currentLesson?.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLessonId(lesson.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors ${active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted'}`}
                  >
                    {done ? <CheckCircle className="w-4 h-4 text-accent shrink-0" /> : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className="line-clamp-1">{lesson.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {currentLesson ? (
          <>
            <div className="aspect-video bg-foreground/5 w-full">
              {currentLesson.video_url && getYoutubeId(currentLesson.video_url) ? (
                <iframe
                  className="w-full h-full"
                  src={`https://www.youtube.com/embed/${getYoutubeId(currentLesson.video_url)}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <PlayCircle className="w-16 h-16 opacity-30" />
                </div>
              )}
            </div>
            <div className="p-6 flex-1">
              <motion.h1 key={currentLesson.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-2xl font-bold mb-4">
                {currentLesson.title}
              </motion.h1>
              <div className="flex gap-3 flex-wrap">
                {!completedLessons.includes(currentLesson.id) && (
                  <Button onClick={() => markComplete.mutate(currentLesson.id)} className="gradient-accent text-accent-foreground gap-2">
                    <CheckCircle className="w-4 h-4" /> Mark Complete
                  </Button>
                )}
                <Button variant="outline" disabled={currentIndex <= 0} onClick={() => setSelectedLessonId(allLessons[currentIndex - 1]?.id)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Previous
                </Button>
                <Button variant="outline" disabled={currentIndex >= allLessons.length - 1} onClick={() => setSelectedLessonId(allLessons[currentIndex + 1]?.id)} className="gap-2">
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>No lessons yet. Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
