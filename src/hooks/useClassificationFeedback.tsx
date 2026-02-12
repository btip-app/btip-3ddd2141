import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClassificationFeedback {
  id: string;
  incident_id: string;
  analyst_id: string;
  feedback_type: string;
  original_category: string;
  original_severity: number;
  original_confidence: number;
  corrected_category: string | null;
  corrected_severity: number | null;
  corrected_confidence: number | null;
  notes: string | null;
  created_at: string;
}

export interface AccuracyMetrics {
  totalReviewed: number;
  confirmedCorrect: number;
  corrected: number;
  accuracyRate: number;
  categoryAccuracy: Record<string, { correct: number; total: number; rate: number }>;
  severityDrift: { avgDelta: number; overEstimated: number; underEstimated: number };
  confidenceCalibration: { avgOriginal: number; avgCorrectedOriginal: number };
  weeklyTrend: { week: string; accuracy: number; total: number }[];
}

export function useClassificationFeedback() {
  const [feedback, setFeedback] = useState<ClassificationFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    const { data, error } = await supabase
      .from('classification_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setFeedback(data);
    if (error) console.error('Failed to fetch feedback:', error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFeedback();
    const channel = supabase
      .channel('feedback-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classification_feedback' }, () => fetchFeedback())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchFeedback]);

  const metrics: AccuracyMetrics = useMemo(() => {
    const totalReviewed = feedback.length;
    const confirmedCorrect = feedback.filter(f => f.feedback_type === 'confirmed_correct').length;
    const corrected = feedback.filter(f => f.feedback_type === 'corrected').length;
    const accuracyRate = totalReviewed > 0 ? (confirmedCorrect / totalReviewed) * 100 : 0;

    // Category accuracy
    const catMap: Record<string, { correct: number; total: number }> = {};
    for (const f of feedback) {
      const cat = f.original_category;
      if (!catMap[cat]) catMap[cat] = { correct: 0, total: 0 };
      catMap[cat].total++;
      if (f.feedback_type === 'confirmed_correct') catMap[cat].correct++;
    }
    const categoryAccuracy: AccuracyMetrics['categoryAccuracy'] = {};
    for (const [k, v] of Object.entries(catMap)) {
      categoryAccuracy[k] = { ...v, rate: v.total > 0 ? (v.correct / v.total) * 100 : 0 };
    }

    // Severity drift
    const corrections = feedback.filter(f => f.feedback_type === 'corrected' && f.corrected_severity != null);
    const deltas = corrections.map(f => f.corrected_severity! - f.original_severity);
    const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
    const overEstimated = deltas.filter(d => d < 0).length;
    const underEstimated = deltas.filter(d => d > 0).length;

    // Confidence calibration
    const avgOriginal = feedback.length > 0
      ? feedback.reduce((s, f) => s + f.original_confidence, 0) / feedback.length : 0;
    const correctedItems = feedback.filter(f => f.feedback_type === 'corrected');
    const avgCorrectedOriginal = correctedItems.length > 0
      ? correctedItems.reduce((s, f) => s + f.original_confidence, 0) / correctedItems.length : 0;

    // Weekly trend (last 8 weeks)
    const weeklyTrend: AccuracyMetrics['weeklyTrend'] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekLabel = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const weekItems = feedback.filter(f => {
        const d = new Date(f.created_at);
        return d >= weekStart && d < weekEnd;
      });
      const correct = weekItems.filter(f => f.feedback_type === 'confirmed_correct').length;
      weeklyTrend.push({
        week: weekLabel,
        accuracy: weekItems.length > 0 ? (correct / weekItems.length) * 100 : 0,
        total: weekItems.length,
      });
    }

    return {
      totalReviewed, confirmedCorrect, corrected, accuracyRate,
      categoryAccuracy, severityDrift: { avgDelta, overEstimated, underEstimated },
      confidenceCalibration: { avgOriginal, avgCorrectedOriginal },
      weeklyTrend,
    };
  }, [feedback]);

  return { feedback, loading, metrics, refetch: fetchFeedback };
}
