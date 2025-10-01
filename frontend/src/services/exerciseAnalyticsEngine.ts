// Exercise Analytics Engine - Advanced data-driven insights
// Senior React Developer implementation with real Supabase data

export interface TrainingHistory {
  date: string;
  sets: number;
  reps: number[];
  weights: number[];
  volume: number;
  maxWeight: number;
  intensity: number;
  estimated1RM: number;
}

export interface VolumeTrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  trendStrength: number; // 0-1 confidence score
  averageGrowthRate: number; // % per week
  volatility: number; // Standard deviation
  recentPerformance: 'above_average' | 'average' | 'below_average';
  recommendation: string;
  rSquared: number;
}

export interface StrengthProgression {
  current1RM: number;
  previous1RM: number;
  improvementRate: number; // % improvement over time
  strengthGains: Array<{ date: string; estimated1RM: number }>;
  progressionCurve: 'linear' | 'logarithmic' | 'plateau' | 'declining';
  nextMilestone: { target: number; timeframe: string };
  totalImprovement: number; // % improvement since first training
}

export interface ConsistencyMetrics {
  trainingFrequency: number; // sessions per week
  consistencyScore: number; // 0-100
  longestStreak: number; // days
  averageGap: number; // days between sessions
  bestPeriod: { start: string; end: string; performance: number };
  consistencyTrend: 'improving' | 'stable' | 'declining';
  missedTrainings: number;
  adherenceRate: number; // %
}

export interface PerformancePrediction {
  next4Weeks: Array<{ week: number; predictedVolume: number; confidence: number }>;
  next8Weeks: Array<{ week: number; predictedVolume: number; confidence: number }>;
  next12Weeks: Array<{ week: number; predictedVolume: number; confidence: number }>;
  peakPerformanceEstimate: { date: string; estimatedVolume: number };
  riskFactors: string[];
  growthPotential: number; // 0-100 score
}

export interface PlateauDetection {
  isPlateaued: boolean;
  plateauStart: string | null;
  plateauDuration: number | null; // weeks
  severity: 'mild' | 'moderate' | 'severe';
  suggestedInterventions: string[];
  alternativeExercises: Array<{ name: string; reason: string }>;
  plateauScore: number; // 0-100 (higher = more severe)
}

export interface ProgressionRecommendation {
  nextTraining: {
    suggestedWeight: number[];
    suggestedReps: number[];
    confidence: number;
    reasoning: string;
    progressionType: 'linear' | 'wave' | 'step' | 'deload';
  };
  longTermPlan: {
    progressionType: 'linear' | 'wave' | 'step';
    milestones: Array<{ target: number; timeframe: string; description: string }>;
  };
  riskAssessment: 'low' | 'medium' | 'high';
  alternativeApproaches: string[];
}

export interface ExerciseInsights {
  volumeTrend: VolumeTrendAnalysis;
  strengthProgression: StrengthProgression;
  consistency: ConsistencyMetrics;
  predictions: PerformancePrediction;
  plateauDetection: PlateauDetection;
  recommendations: ProgressionRecommendation;
  overallScore: number; // 0-100 composite score
  keyInsights: string[];
  actionItems: string[];
}

export class ExerciseAnalyticsEngine {
  /**
   * Calculate estimated 1RM using Epley and Brzycki formulas
   */
  static calculateEstimated1RM(weight: number, reps: number): number {
    if (reps === 1) return weight;
    if (reps <= 0 || weight <= 0) return 0;
    
    // Epley Formula: 1RM = weight × (1 + reps/30)
    const epley = weight * (1 + reps / 30);
    
    // Brzycki Formula: 1RM = weight / (1.0278 - 0.0278 × reps)
    const brzycki = weight / (1.0278 - 0.0278 * reps);
    
    // Average both for better accuracy
    return Math.round((epley + brzycki) / 2);
  }

  /**
   * Process raw training data into structured history
   */
  static processTrainingHistory(rawData: Array<{
    date: string;
    volume: number;
    maxWeight: number;
    sets: number;
    reps: number[];
    weights: number[];
  }>): TrainingHistory[] {
    return rawData.map(training => {
      // Calculate intensity (average weight relative to max weight)
      const avgWeight = training.weights.reduce((sum, w) => sum + w, 0) / training.weights.length;
      const intensity = training.maxWeight > 0 ? (avgWeight / training.maxWeight) * 100 : 0;
      
      // Calculate estimated 1RM for this training
      const bestSetIndex = training.weights.findIndex(w => w === training.maxWeight);
      const bestReps = bestSetIndex >= 0 ? training.reps[bestSetIndex] : Math.max(...training.reps);
      const estimated1RM = this.calculateEstimated1RM(training.maxWeight, bestReps);
      
      return {
        date: training.date,
        sets: training.sets,
        reps: training.reps,
        weights: training.weights,
        volume: training.volume,
        maxWeight: training.maxWeight,
        intensity,
        estimated1RM
      };
    });
  }

  /**
   * Analyze volume trends using linear regression
   */
  static analyzeVolumeTrend(historyData: TrainingHistory[]): VolumeTrendAnalysis {
    if (historyData.length < 3) {
      return {
        trend: 'stable',
        trendStrength: 0,
        averageGrowthRate: 0,
        volatility: 0,
        recentPerformance: 'average',
        recommendation: 'Need more data for trend analysis',
        rSquared: 0
      };
    }

    // Prepare data for linear regression
    const n = historyData.length;
    const xValues = historyData.map((_, i) => i);
    const yValues = historyData.map(d => d.volume);
    
    // Calculate linear regression
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const ssRes = yValues.reduce((sum, y, i) => {
      const predicted = slope * xValues[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const ssTot = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
    
    // Calculate volatility (standard deviation)
    const mean = sumY / n;
    const variance = yValues.reduce((sum, y) => sum + Math.pow(y - mean, 2), 0) / n;
    const volatility = Math.sqrt(variance);
    
    // Determine trend
    let trend: VolumeTrendAnalysis['trend'];
    if (Math.abs(slope) < 0.1) {
      trend = 'stable';
    } else if (slope > 0.1) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }
    
    // Check for volatility
    if (volatility / mean > 0.3) {
      trend = 'volatile';
    }
    
    // Calculate growth rate (% per week)
    const timeSpan = this.getDaysBetween(historyData[0].date, historyData[n-1].date);
    const weeks = Math.max(1, timeSpan / 7);
    const averageGrowthRate = (slope * n) / weeks;
    
    // Determine recent performance
    const recentAverage = yValues.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, yValues.length);
    const overallAverage = yMean;
    const recentPerformance = recentAverage > overallAverage * 1.1 ? 'above_average' :
                            recentAverage < overallAverage * 0.9 ? 'below_average' : 'average';
    
    // Generate recommendation
    let recommendation = '';
    if (trend === 'increasing') {
      recommendation = 'Great progress! Keep up the momentum.';
    } else if (trend === 'decreasing') {
      recommendation = 'Consider deloading or checking for overtraining signs.';
    } else if (trend === 'volatile') {
      recommendation = 'Focus on consistency in your training approach.';
    } else {
      recommendation = 'Consider progressive overload to break the plateau.';
    }
    
    return {
      trend,
      trendStrength: Math.max(0, Math.min(1, rSquared)),
      averageGrowthRate: Math.round(averageGrowthRate * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      recentPerformance,
      recommendation,
      rSquared: Math.round(rSquared * 100) / 100
    };
  }

  /**
   * Analyze strength progression over time
   */
  static analyzeStrengthProgression(historyData: TrainingHistory[]): StrengthProgression {
    if (historyData.length < 2) {
      return {
        current1RM: 0,
        previous1RM: 0,
        improvementRate: 0,
        strengthGains: [],
        progressionCurve: 'linear',
        nextMilestone: { target: 0, timeframe: 'N/A' },
        totalImprovement: 0
      };
    }

    // Calculate strength gains over time
    const strengthGains = historyData.map(training => ({
      date: training.date,
      estimated1RM: training.estimated1RM
    }));

    const current1RM = strengthGains[strengthGains.length - 1].estimated1RM;
    const previous1RM = strengthGains.length > 1 ? strengthGains[strengthGains.length - 2].estimated1RM : 0;
    const first1RM = strengthGains[0].estimated1RM;
    
    // Calculate improvement rates
    const improvementRate = previous1RM > 0 ? ((current1RM - previous1RM) / previous1RM) * 100 : 0;
    const totalImprovement = first1RM > 0 ? ((current1RM - first1RM) / first1RM) * 100 : 0;
    
    // Analyze progression curve
    let progressionCurve: StrengthProgression['progressionCurve'] = 'linear';
    if (historyData.length >= 4) {
      const recentGains = strengthGains.slice(-4).map((g, i, arr) => 
        i > 0 ? g.estimated1RM - arr[i-1].estimated1RM : 0
      ).slice(1);
      
      const avgRecentGain = recentGains.reduce((a, b) => a + b, 0) / recentGains.length;
      if (avgRecentGain < 1) {
        progressionCurve = 'plateau';
      } else if (avgRecentGain < 2) {
        progressionCurve = 'declining';
      }
    }
    
    // Calculate next milestone
    const nextTarget = Math.ceil(current1RM / 5) * 5; // Round up to nearest 5
    const timeToMilestone = improvementRate > 0 ? Math.ceil((nextTarget - current1RM) / (current1RM * improvementRate / 100)) : 12;
    
    return {
      current1RM,
      previous1RM,
      improvementRate: Math.round(improvementRate * 100) / 100,
      strengthGains,
      progressionCurve,
      nextMilestone: {
        target: nextTarget,
        timeframe: `${timeToMilestone} weeks`
      },
      totalImprovement: Math.round(totalImprovement * 100) / 100
    };
  }

  /**
   * Analyze training consistency
   */
  static analyzeConsistency(historyData: TrainingHistory[]): ConsistencyMetrics {
    if (historyData.length < 2) {
      return {
        trainingFrequency: 0,
        consistencyScore: 0,
        longestStreak: 0,
        averageGap: 0,
        bestPeriod: { start: '', end: '', performance: 0 },
        consistencyTrend: 'stable',
        missedTrainings: 0,
        adherenceRate: 0
      };
    }

    // Calculate gaps between trainings
    const gaps: number[] = [];
    for (let i = 1; i < historyData.length; i++) {
      const gap = this.getDaysBetween(historyData[i-1].date, historyData[i].date);
      gaps.push(gap);
    }
    
    const averageGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const trainingFrequency = 7 / averageGap; // trainings per week
    
    // Calculate longest streak
    let currentStreak = 1;
    let longestStreak = 1;
    for (const gap of gaps) {
      if (gap <= 3) { // Consider trainings within 3 days as part of streak
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, currentStreak);
    
    // Calculate consistency score (0-100)
    const idealGap = 2; // Ideal 2-day gap between trainings
    const gapVariance = gaps.reduce((sum, gap) => sum + Math.pow(gap - idealGap, 2), 0) / gaps.length;
    const consistencyScore = Math.max(0, 100 - Math.sqrt(gapVariance) * 10);
    
    // Find best performance period
    const weeklyVolumes = this.calculateWeeklyVolumes(historyData);
    const bestWeek = weeklyVolumes.reduce((best, week) => 
      week.volume > best.volume ? week : best, weeklyVolumes[0] || { volume: 0, start: '', end: '' });
    
    // Calculate adherence rate (assuming user should work out 3x per week)
    const expectedTrainings = Math.floor(this.getDaysBetween(historyData[0].date, historyData[historyData.length-1].date) / 7) * 3;
    const actualTrainings = historyData.length;
    const adherenceRate = expectedTrainings > 0 ? (actualTrainings / expectedTrainings) * 100 : 100;
    
    // Determine consistency trend
    const recentGaps = gaps.slice(-3);
    const earlyGaps = gaps.slice(0, Math.min(3, gaps.length));
    const recentAvgGap = recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length;
    const earlyAvgGap = earlyGaps.reduce((a, b) => a + b, 0) / earlyGaps.length;
    
    const consistencyTrend = recentAvgGap < earlyAvgGap * 0.9 ? 'improving' :
                           recentAvgGap > earlyAvgGap * 1.1 ? 'declining' : 'stable';
    
    return {
      trainingFrequency: Math.round(trainingFrequency * 100) / 100,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      longestStreak,
      averageGap: Math.round(averageGap * 100) / 100,
      bestPeriod: {
        start: bestWeek.start,
        end: bestWeek.end,
        performance: bestWeek.volume
      },
      consistencyTrend,
      missedTrainings: Math.max(0, expectedTrainings - actualTrainings),
      adherenceRate: Math.round(adherenceRate * 100) / 100
    };
  }

  /**
   * Detect plateaus in performance
   */
  static detectPlateau(historyData: TrainingHistory[]): PlateauDetection {
    if (historyData.length < 6) {
      return {
        isPlateaued: false,
        plateauStart: null,
        plateauDuration: null,
        severity: 'mild',
        suggestedInterventions: [],
        alternativeExercises: [],
        plateauScore: 0
      };
    }

    const recentData = historyData.slice(-6); // Last 6 sessions
    const volumes = recentData.map(d => d.volume);
    const maxVolume = Math.max(...volumes);
    const minVolume = Math.min(...volumes);
    const averageVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    
    // Calculate variation coefficient
    const variance = volumes.reduce((sum, vol) => sum + Math.pow(vol - averageVolume, 2), 0) / volumes.length;
    const standardDeviation = Math.sqrt(variance);
    const variationCoefficient = standardDeviation / averageVolume;
    
    // Check for plateau indicators
    const isLowVariation = variationCoefficient < 0.15; // Less than 15% variation
    const hasNoGrowth = this.analyzeVolumeTrend(recentData).trend === 'stable';
    const isPlateaued = isLowVariation && hasNoGrowth;
    
    // Calculate plateau severity
    let severity: PlateauDetection['severity'] = 'mild';
    let plateauScore = 0;
    
    if (variationCoefficient < 0.1) {
      severity = 'severe';
      plateauScore = 80;
    } else if (variationCoefficient < 0.15) {
      severity = 'moderate';
      plateauScore = 50;
    } else {
      plateauScore = 20;
    }
    
    // Generate interventions
    const suggestedInterventions = [];
    if (severity === 'severe') {
      suggestedInterventions.push('Consider a deload week');
      suggestedInterventions.push('Try different rep ranges');
      suggestedInterventions.push('Add variation to your routine');
    } else if (severity === 'moderate') {
      suggestedInterventions.push('Increase training intensity');
      suggestedInterventions.push('Modify exercise selection');
    }
    
    // Suggest alternative exercises (placeholder - would need exercise database)
    const alternativeExercises = [
      { name: 'Similar exercise variation', reason: 'Break movement pattern' },
      { name: 'Different rep range', reason: 'Stimulate new adaptation' }
    ];
    
    return {
      isPlateaued,
      plateauStart: isPlateaued ? recentData[0].date : null,
      plateauDuration: isPlateaued ? Math.ceil(recentData.length / 2) : null,
      severity,
      suggestedInterventions,
      alternativeExercises,
      plateauScore
    };
  }

  /**
   * Generate performance predictions
   */
  static predictPerformance(historyData: TrainingHistory[]): PerformancePrediction {
    if (historyData.length < 4) {
      return {
        next4Weeks: [],
        next8Weeks: [],
        next12Weeks: [],
        peakPerformanceEstimate: { date: '', estimatedVolume: 0 },
        riskFactors: [],
        growthPotential: 0
      };
    }

    const trendAnalysis = this.analyzeVolumeTrend(historyData);
    const currentVolume = historyData[historyData.length - 1].volume;
    const growthRate = trendAnalysis.averageGrowthRate;
    
    // Generate predictions for different timeframes
    const generatePredictions = (weeks: number) => {
      return Array.from({ length: weeks }, (_, i) => {
        const predictedVolume = currentVolume + (growthRate * (i + 1));
        const confidence = Math.max(0.3, Math.min(0.9, trendAnalysis.trendStrength));
        return {
          week: i + 1,
          predictedVolume: Math.round(predictedVolume * 100) / 100,
          confidence: Math.round(confidence * 100) / 100
        };
      });
    };
    
    const next4Weeks = generatePredictions(4);
    const next8Weeks = generatePredictions(8);
    const next12Weeks = generatePredictions(12);
    
    // Estimate peak performance
    const peakVolume = currentVolume + (growthRate * 8); // 8 weeks from now
    const peakDate = new Date();
    peakDate.setDate(peakDate.getDate() + 56); // 8 weeks
    
    // Identify risk factors
    const riskFactors = [];
    if (trendAnalysis.trend === 'decreasing') {
      riskFactors.push('Declining performance trend');
    }
    if (trendAnalysis.volatility > currentVolume * 0.3) {
      riskFactors.push('High performance variability');
    }
    if (trendAnalysis.trendStrength < 0.5) {
      riskFactors.push('Unreliable trend data');
    }
    
    // Calculate growth potential
    const growthPotential = Math.min(100, Math.max(0, 
      (trendAnalysis.trendStrength * 50) + 
      (growthRate > 0 ? 30 : 0) + 
      (trendAnalysis.volatility < currentVolume * 0.2 ? 20 : 0)
    ));
    
    return {
      next4Weeks,
      next8Weeks,
      next12Weeks,
      peakPerformanceEstimate: {
        date: peakDate.toISOString().split('T')[0],
        estimatedVolume: Math.round(peakVolume * 100) / 100
      },
      riskFactors,
      growthPotential: Math.round(growthPotential * 100) / 100
    };
  }

  /**
   * Generate progression recommendations
   */
  static generateProgressionRecommendation(historyData: TrainingHistory[]): ProgressionRecommendation {
    if (historyData.length < 2) {
      return {
        nextTraining: {
          suggestedWeight: [],
          suggestedReps: [],
          confidence: 0,
          reasoning: 'Need more data for recommendations',
          progressionType: 'linear'
        },
        longTermPlan: {
          progressionType: 'linear',
          milestones: []
        },
        riskAssessment: 'low',
        alternativeApproaches: []
      };
    }

    const lastTraining = historyData[historyData.length - 1];
    const plateauDetection = this.detectPlateau(historyData);
    const trendAnalysis = this.analyzeVolumeTrend(historyData);
    
    // Determine progression type
    let progressionType: ProgressionRecommendation['nextTraining']['progressionType'] = 'linear';
    if (plateauDetection.isPlateaued) {
      progressionType = plateauDetection.severity === 'severe' ? 'deload' : 'wave';
    } else if (trendAnalysis.trend === 'decreasing') {
      progressionType = 'deload';
    } else if (trendAnalysis.volatility > lastTraining.volume * 0.3) {
      progressionType = 'step';
    }
    
    // Generate next training suggestions
    const suggestedWeight = [...lastTraining.weights];
    const suggestedReps = [...lastTraining.reps];
    let reasoning = '';
    
    if (progressionType === 'linear') {
      // 2.5-5% increase
      const increase = 1.025;
      suggestedWeight.forEach((weight, i) => {
        suggestedWeight[i] = Math.round(weight * increase * 2.5) / 2.5; // Round to nearest 2.5
      });
      reasoning = 'Linear progression with 2.5% weight increase';
    } else if (progressionType === 'deload') {
      // 10-15% decrease
      const decrease = 0.85;
      suggestedWeight.forEach((weight, i) => {
        suggestedWeight[i] = Math.round(weight * decrease * 2.5) / 2.5;
      });
      reasoning = 'Deload week to allow recovery and prevent overtraining';
    } else if (progressionType === 'wave') {
      // Wave loading - alternate heavy and light days
      const heavyIncrease = 1.05;
      const lightDecrease = 0.9;
      suggestedWeight.forEach((weight, i) => {
        if (i % 2 === 0) {
          suggestedWeight[i] = Math.round(weight * heavyIncrease * 2.5) / 2.5;
        } else {
          suggestedWeight[i] = Math.round(weight * lightDecrease * 2.5) / 2.5;
        }
      });
      reasoning = 'Wave loading to break through plateau';
    }
    
    // Generate milestones
    const current1RM = lastTraining.estimated1RM;
    const milestones = [
      {
        target: Math.ceil(current1RM * 1.1),
        timeframe: '4-6 weeks',
        description: '10% strength increase'
      },
      {
        target: Math.ceil(current1RM * 1.25),
        timeframe: '8-12 weeks',
        description: '25% strength increase'
      }
    ];
    
    // Risk assessment
    const riskFactors = [];
    if (plateauDetection.isPlateaued) riskFactors.push('plateau');
    if (trendAnalysis.trend === 'decreasing') riskFactors.push('declining_performance');
    if (trendAnalysis.volatility > lastTraining.volume * 0.3) riskFactors.push('high_variability');
    
    const riskAssessment = riskFactors.length >= 2 ? 'high' : 
                          riskFactors.length === 1 ? 'medium' : 'low';
    
    return {
      nextTraining: {
        suggestedWeight,
        suggestedReps,
        confidence: Math.round(trendAnalysis.trendStrength * 100) / 100,
        reasoning,
        progressionType
      },
      longTermPlan: {
        progressionType: plateauDetection.isPlateaued ? 'wave' : 'linear',
        milestones
      },
      riskAssessment,
      alternativeApproaches: [
        'Try different rep ranges (3-5, 8-12, 15-20)',
        'Add tempo variations (slow negatives)',
        'Include accessory exercises',
        'Consider periodization'
      ]
    };
  }

  /**
   * Generate comprehensive insights
   */
  static generateInsights(historyData: TrainingHistory[]): ExerciseInsights {
    if (historyData.length === 0) {
      return {
        volumeTrend: this.analyzeVolumeTrend([]),
        strengthProgression: this.analyzeStrengthProgression([]),
        consistency: this.analyzeConsistency([]),
        predictions: this.predictPerformance([]),
        plateauDetection: this.detectPlateau([]),
        recommendations: this.generateProgressionRecommendation([]),
        overallScore: 0,
        keyInsights: ['No data available for analysis'],
        actionItems: ['Start logging trainings to get insights']
      };
    }

    const volumeTrend = this.analyzeVolumeTrend(historyData);
    const strengthProgression = this.analyzeStrengthProgression(historyData);
    const consistency = this.analyzeConsistency(historyData);
    const predictions = this.predictPerformance(historyData);
    const plateauDetection = this.detectPlateau(historyData);
    const recommendations = this.generateProgressionRecommendation(historyData);
    
    // Calculate overall score (0-100)
    const overallScore = Math.round(
      (volumeTrend.trendStrength * 20) +
      (strengthProgression.improvementRate > 0 ? 20 : 10) +
      (consistency.consistencyScore * 0.2) +
      (predictions.growthPotential * 0.2) +
      (plateauDetection.isPlateaued ? 10 : 20) +
      (recommendations.riskAssessment === 'low' ? 10 : 5)
    );
    
    // Generate key insights
    const keyInsights: string[] = [];
    if (volumeTrend.trend === 'increasing') {
      keyInsights.push('📈 Volume is trending upward - great progress!');
    }
    if (strengthProgression.improvementRate > 5) {
      keyInsights.push(`💪 Strength increased by ${strengthProgression.improvementRate}% recently`);
    }
    if (consistency.consistencyScore > 80) {
      keyInsights.push('🎯 Excellent training consistency');
    }
    if (plateauDetection.isPlateaued) {
      keyInsights.push('⏸️ Performance plateau detected - time for variation');
    }
    if (predictions.growthPotential > 70) {
      keyInsights.push('🚀 High growth potential based on current trends');
    }
    
    // Generate action items
    const actionItems: string[] = [];
    if (recommendations.nextTraining.reasoning) {
      actionItems.push(`Next training: ${recommendations.nextTraining.reasoning}`);
    }
    if (plateauDetection.suggestedInterventions.length > 0) {
      actionItems.push(...plateauDetection.suggestedInterventions);
    }
    if (consistency.consistencyScore < 70) {
      actionItems.push('Focus on more consistent training schedule');
    }
    
    return {
      volumeTrend,
      strengthProgression,
      consistency,
      predictions,
      plateauDetection,
      recommendations,
      overallScore,
      keyInsights,
      actionItems
    };
  }

  /**
   * Helper: Calculate days between two dates
   */
  private static getDaysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Calculate weekly volumes
   */
  private static calculateWeeklyVolumes(historyData: TrainingHistory[]): Array<{ volume: number; start: string; end: string }> {
    const weeklyData: { [key: string]: number } = {};
    
    historyData.forEach(training => {
      const date = new Date(training.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + training.volume;
    });
    
    return Object.entries(weeklyData).map(([weekStart, volume]) => {
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      
      return {
        volume,
        start: weekStart,
        end: endDate.toISOString().split('T')[0]
      };
    });
  }
}
