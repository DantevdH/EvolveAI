export interface AddEnduranceSessionModalProps {
  visible: boolean;
  onClose: () => void;
  onAddSession: (sessionData: {
    sportType: string;
    trainingVolume: number;
    unit: string;
    heartRateZone: number;
    name?: string;
    description?: string;
  }) => void;
}

export interface EnduranceSessionData {
  sportType: string;
  duration: number;
  unit: string;
  heartRateZone: number;
  name: string;
  description: string;
}

