import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useHaptics } from '@/hooks/useHaptics';
import { Star, Sparkles, MessageCircle, Send, CheckCircle2 } from 'lucide-react';

// Streamlined schema for 1-minute form
const feedbackSchema = z.object({
  experience_rating: z.string().min(1, 'Please rate your experience'),
  chat_purpose: z.array(z.string()).min(1, 'Please select at least one'),
  is_first_time: z.string().min(1, 'Please select an option'),
  accuracy_rating: z.number().min(1).max(5),
  tone_rating: z.string().min(1, 'Please select an option'),
  had_issues: z.string().min(1, 'Please select an option'),
  issue_description: z.string().optional(),
  likelihood_recommend: z.number().min(0).max(10),
  open_feedback: z.string().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

interface FeedbackFormProps {
  sessionId: string;
  onClose: () => void;
  onSubmit: () => void;
}

// Experience options with emojis
const experienceOptions = [
  { value: 'amazing', emoji: '🌟', label: 'Amazing' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'not_great', emoji: '😕', label: 'Not great' },
  { value: 'terrible', emoji: '😣', label: 'Terrible' },
];

// Purpose options
const purposeOptions = [
  { value: 'general_guidance', label: 'General guidance' },
  { value: 'love', label: 'Love & relationships' },
  { value: 'career', label: 'Career & money' },
  { value: 'health', label: 'Health' },
  { value: 'daily', label: 'Daily vibe' },
  { value: 'testing', label: 'Just testing' },
];

// Tone options
const toneOptions = [
  { value: 'too_formal', label: 'Too formal' },
  { value: 'just_right', label: 'Just right ✓' },
  { value: 'too_casual', label: 'Too casual' },
];

// Issues options
const issuesOptions = [
  { value: 'none', label: 'None' },
  { value: 'minor', label: 'Minor' },
  { value: 'major', label: 'Major' },
];

export const FeedbackForm: React.FC<FeedbackFormProps> = ({
  sessionId,
  onClose,
  onSubmit,
}) => {
  const { toast } = useToast();
  const { impact } = useHaptics();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      experience_rating: '',
      chat_purpose: [],
      is_first_time: '',
      accuracy_rating: 0,
      tone_rating: '',
      had_issues: '',
      issue_description: '',
      likelihood_recommend: 5,
      open_feedback: '',
    },
  });

  const watchedIssues = form.watch('had_issues');

  const handleSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    impact('light');

    try {
      const { error } = await supabase.from('feedback_responses').insert({
        session_id: sessionId,
        experience_rating: data.experience_rating,
        chat_purpose: data.chat_purpose,
        is_first_time: data.is_first_time === 'yes',
        resonance_rating: data.accuracy_rating, // Map accuracy to resonance
        tone_rating: toneOptions.findIndex(t => t.value === data.tone_rating) + 1, // Convert to 1-3 scale stored as number
        had_issues: data.had_issues,
        issue_description: data.issue_description || null,
        likelihood_recommend: data.likelihood_recommend,
        improvement_suggestions: data.open_feedback || null,
        consent_given: true,
        // Set nullable fields to null
        astrology_familiarity: null,
        understanding_rating: null,
        clarity_rating: null,
        guidance_type: null,
        ease_of_use_rating: null,
        response_speed: null,
        got_what_needed: null,
        likelihood_use_again: null,
      });

      if (error) throw error;

      setIsSubmitted(true);
      impact('medium');
      
      setTimeout(() => {
        toast({
          title: "Thank you! 🙏",
          description: "Your feedback helps us improve.",
        });
        onSubmit();
      }, 1500);
    } catch (error) {
      console.error('Feedback submission error:', error);
      toast({
        title: "Couldn't submit feedback",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 animate-in fade-in-0 zoom-in-95 duration-500">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary animate-in zoom-in-0 duration-300" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">Thank you!</h3>
        <p className="text-muted-foreground text-center">Your feedback means a lot to us.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Quick Feedback</h2>
        </div>
        <p className="text-sm text-muted-foreground">~1 minute • Help us improve</p>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            
            {/* Section 1: Quick Vibes */}
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">1</span>
                Quick Vibes
              </div>

              {/* Experience Rating */}
              <FormField
                control={form.control}
                name="experience_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">How was your experience?</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 flex-wrap">
                        {experienceOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              field.onChange(option.value);
                              impact('light');
                            }}
                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all min-w-[60px] ${
                              field.value === option.value
                                ? 'border-primary bg-primary/10 scale-105'
                                : 'border-border/50 bg-card hover:border-primary/50'
                            }`}
                          >
                            <span className="text-2xl">{option.emoji}</span>
                            <span className="text-xs text-muted-foreground">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Chat Purpose */}
              <FormField
                control={form.control}
                name="chat_purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">What brought you here?</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 flex-wrap">
                        {purposeOptions.map((option) => {
                          const isSelected = field.value.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                const newValue = isSelected
                                  ? field.value.filter(v => v !== option.value)
                                  : [...field.value, option.value];
                                field.onChange(newValue);
                                impact('light');
                              }}
                              className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-border/50 bg-card text-foreground hover:border-primary/50'
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* First Time */}
              <FormField
                control={form.control}
                name="is_first_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">First time using AI astrology?</FormLabel>
                    <FormControl>
                      <div className="flex gap-3">
                        {[
                          { value: 'yes', label: 'Yes' },
                          { value: 'no', label: 'No' },
                        ].map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              field.onChange(option.value);
                              impact('light');
                            }}
                            className={`px-6 py-2.5 rounded-full text-sm font-medium border-2 transition-all ${
                              field.value === option.value
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border/50 bg-card text-foreground hover:border-primary/50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section 2: Quality Check */}
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">2</span>
                Quality Check
              </div>

              {/* Accuracy Rating (Stars) */}
              <FormField
                control={form.control}
                name="accuracy_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">How accurate did the reading feel?</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              field.onChange(star);
                              impact('light');
                            }}
                            className="p-1 transition-transform hover:scale-110"
                          >
                            <Star
                              className={`w-10 h-10 transition-colors ${
                                star <= field.value
                                  ? 'fill-primary text-primary'
                                  : 'fill-muted text-muted-foreground/30'
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tone Rating */}
              <FormField
                control={form.control}
                name="tone_rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Was the tone right for you?</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 flex-wrap">
                        {toneOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              field.onChange(option.value);
                              impact('light');
                            }}
                            className={`px-4 py-2.5 rounded-full text-sm font-medium border-2 transition-all ${
                              field.value === option.value
                                ? option.value === 'just_right'
                                  ? 'border-green-500 bg-green-500/20 text-green-700 dark:text-green-300'
                                  : 'border-primary bg-primary/10 text-foreground'
                                : 'border-border/50 bg-card text-foreground hover:border-primary/50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Issues */}
              <FormField
                control={form.control}
                name="had_issues"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Any technical issues?</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        {issuesOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              field.onChange(option.value);
                              impact('light');
                            }}
                            className={`px-5 py-2.5 rounded-full text-sm font-medium border-2 transition-all ${
                              field.value === option.value
                                ? option.value === 'none'
                                  ? 'border-green-500 bg-green-500/20 text-green-700 dark:text-green-300'
                                  : 'border-amber-500 bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                : 'border-border/50 bg-card text-foreground hover:border-primary/50'
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Conditional Issue Description */}
              {(watchedIssues === 'minor' || watchedIssues === 'major') && (
                <FormField
                  control={form.control}
                  name="issue_description"
                  render={({ field }) => (
                    <FormItem className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
                      <FormLabel className="text-foreground font-medium">What happened?</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Briefly describe the issue..."
                          className="resize-none min-h-[80px] bg-card border-border/50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Section 3: Final Thoughts */}
            <div className="space-y-5 pt-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center">3</span>
                Final Thoughts
              </div>

              {/* NPS Score */}
              <FormField
                control={form.control}
                name="likelihood_recommend"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Would you recommend to a friend?</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex justify-between gap-1">
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => {
                                field.onChange(num);
                                impact('light');
                              }}
                              className={`w-8 h-10 rounded-lg text-sm font-medium border-2 transition-all ${
                                field.value === num
                                  ? num >= 9
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : num >= 7
                                    ? 'border-amber-500 bg-amber-500 text-white'
                                    : 'border-red-500 bg-red-500 text-white'
                                  : 'border-border/50 bg-card text-foreground hover:border-primary/50'
                              }`}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground px-1">
                          <span>Not likely</span>
                          <span>Very likely</span>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Open Feedback */}
              <FormField
                control={form.control}
                name="open_feedback"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium flex items-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Anything you'd like to share?
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="What did you love? What could be better?"
                        className="resize-none min-h-[80px] bg-card border-border/50"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2 pb-4">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 text-base font-medium gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default FeedbackForm;
