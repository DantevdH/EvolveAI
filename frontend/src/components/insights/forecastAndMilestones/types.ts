export interface ForecastData {
  week: number;
  predictedVolume: number;
  confidence: number;
  exercise?: string;
}

export interface MilestonePrediction {
  exercise: {
    id: number;
    name: string;
  };
  current1RM: number;
  nextMilestone: number;
  predictedDate: string;
  confidence: number;
  weeksToGoal: number;
}

export interface ForecastAndMilestonesProps {
  forecastData: ForecastData[];
  milestoneData: MilestonePrediction[];
}

