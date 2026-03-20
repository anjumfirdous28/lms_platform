import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Trash2, BookOpen, Layers, Play, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[60vh] text-muted-foreground">
          <p>Admin access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" /> Admin Dashboard
          </h1>
        </div>
        <CourseManager />
      </div>
    </div>
  );
}

function CourseManager() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [price, setPrice] = useState('0');

  const { data: courses = [] } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
      return data || [];
    },
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      if (editId) {
        await supabase.from('courses').update({ title, description, thumbnail_url: thumbnail, price: Number(price) }).eq('id', editId);
      } else {
        await supabase.from('courses').insert({ title, description, thumbnail_url: thumbnail, price: Number(price), created_by: user!.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast.success(editId ? 'Course updated!' : 'Course created!');
      resetForm();
    },
    onError: () => toast.error('Failed to save course'),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('courses').delete().eq('id', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      toast.success('Course deleted');
    },
  });

  const resetForm = () => { setOpen(false); setEditId(null); setTitle(''); setDescription(''); setThumbnail(''); setPrice('0'); };

  const openEdit = (c: any) => { setEditId(c.id); setTitle(c.title); setDescription(c.description || ''); setThumbnail(c.thumbnail_url || ''); setPrice(String(c.price)); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5" /> Courses</h2>
        <Dialog open={open} onOpenChange={v => { if (!v) resetForm(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="gradient-primary text-primary-foreground gap-2"><Plus className="w-4 h-4" /> New Course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{editId ? 'Edit' : 'New'} Course</DialogTitle></DialogHeader>
            <form onSubmit={e => { e.preventDefault(); saveCourse.mutate(); }} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} required /></div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div className="space-y-2"><Label>Thumbnail URL</Label><Input value={thumbnail} onChange={e => setThumbnail(e.target.value)} placeholder="https://..." /></div>
              <div className="space-y-2"><Label>Price ($)</Label><Input type="number" value={price} onChange={e => setPrice(e.target.value)} min="0" step="0.01" /></div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground">Save</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {courses.map((c: any) => (
          <Card key={c.id} className="glass-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-muted-foreground">${c.price}</p>
              </div>
              <div className="flex gap-2">
                <SectionManager courseId={c.id} />
                <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteCourse.mutate(c.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SectionManager({ courseId }: { courseId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const [sTitle, setSTitle] = useState('');
  const [lTitle, setLTitle] = useState('');
  const [lVideo, setLVideo] = useState('');
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null);

  const { data: sections = [] } = useQuery({
    queryKey: ['admin-sections', courseId],
    queryFn: async () => {
      const { data } = await supabase.from('sections').select('*, lessons(*)').eq('course_id', courseId).order('sort_order');
      return data || [];
    },
    enabled: open,
  });

  const addSection = useMutation({
    mutationFn: async () => {
      await supabase.from('sections').insert({ course_id: courseId, title: sTitle, sort_order: sections.length });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sections', courseId] }); setSTitle(''); toast.success('Section added!'); },
  });

  const addLesson = useMutation({
    mutationFn: async (sectionId: string) => {
      const existing = sections.find((s: any) => s.id === sectionId)?.lessons?.length || 0;
      await supabase.from('lessons').insert({ section_id: sectionId, title: lTitle, video_url: lVideo, sort_order: existing });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-sections', courseId] }); setLTitle(''); setLVideo(''); setAddingSectionId(null); toast.success('Lesson added!'); },
  });

  const deleteSection = async (id: string) => {
    await supabase.from('sections').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-sections', courseId] });
  };

  const deleteLesson = async (id: string) => {
    await supabase.from('lessons').delete().eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['admin-sections', courseId] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1"><Layers className="w-4 h-4" /> Content</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Sections & Lessons</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input placeholder="Section title" value={sTitle} onChange={e => setSTitle(e.target.value)} />
            <Button onClick={() => addSection.mutate()} disabled={!sTitle} className="gradient-primary text-primary-foreground shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
          {sections.map((s: any) => (
            <div key={s.id} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm flex items-center gap-2"><Layers className="w-4 h-4 text-primary" /> {s.title}</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setAddingSectionId(s.id)}><Plus className="w-3 h-3" /></Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteSection(s.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              {(s.lessons || []).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between pl-4 py-1 text-sm">
                  <span className="flex items-center gap-2"><Play className="w-3 h-3 text-muted-foreground" /> {l.title}</span>
                  <Button variant="ghost" size="sm" className="text-destructive h-6" onClick={() => deleteLesson(l.id)}><Trash2 className="w-3 h-3" /></Button>
                </div>
              ))}
              {addingSectionId === s.id && (
                <div className="pl-4 space-y-2">
                  <Input placeholder="Lesson title" value={lTitle} onChange={e => setLTitle(e.target.value)} className="text-sm" />
                  <Input placeholder="YouTube URL" value={lVideo} onChange={e => setLVideo(e.target.value)} className="text-sm" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => addLesson.mutate(s.id)} disabled={!lTitle} className="gradient-primary text-primary-foreground">Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingSectionId(null)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
