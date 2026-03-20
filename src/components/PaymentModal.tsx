import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CreditCard, CheckCircle, Lock } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

interface Props {
  course: any;
  onClose: () => void;
}

export default function PaymentModal({ course, onClose }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<'payment' | 'processing' | 'success'>('payment');
  const [cardNumber, setCardNumber] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please sign in first');
      return;
    }
    setStep('processing');
    // Simulate payment
    await new Promise(r => setTimeout(r, 2000));
    const { error } = await supabase.from('enrollments').insert({ user_id: user.id, course_id: course.id });
    if (error) {
      toast.error('Enrollment failed');
      setStep('payment');
      return;
    }
    setStep('success');
    queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  };

  const goToLearn = () => {
    onClose();
    navigate(`/learn/${course.id}`);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md">
        {step === 'payment' && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" /> Enroll in Course
              </DialogTitle>
            </DialogHeader>
            <div className="p-4 rounded-lg bg-muted/50 mb-4">
              <h4 className="font-semibold">{course.title}</h4>
              <p className="text-2xl font-display font-bold text-primary mt-1">
                {course.price > 0 ? `$${course.price}` : 'Free'}
              </p>
            </div>
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-2">
                <Label>Card Number</Label>
                <Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={e => setCardNumber(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expiry</Label>
                  <Input placeholder="MM/YY" required />
                </div>
                <div className="space-y-2">
                  <Label>CVC</Label>
                  <Input placeholder="123" required />
                </div>
              </div>
              <Button type="submit" className="w-full gradient-primary text-primary-foreground gap-2">
                <Lock className="w-4 h-4" /> Pay & Enroll
              </Button>
              <p className="text-xs text-center text-muted-foreground">This is a dummy payment — no real charge.</p>
            </form>
          </>
        )}
        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full gradient-primary flex items-center justify-center animate-pulse">
              <CreditCard className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="font-display text-lg">Processing Payment...</p>
          </div>
        )}
        {step === 'success' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-accent/20 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-accent" />
            </div>
            <p className="font-display text-lg font-semibold">Enrollment Successful!</p>
            <p className="text-sm text-muted-foreground">You now have access to {course.title}</p>
            <Button onClick={goToLearn} className="gradient-primary text-primary-foreground">Start Learning</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
