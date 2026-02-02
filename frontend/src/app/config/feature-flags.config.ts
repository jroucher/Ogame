export interface FeatureFlag {
  id: string;
  enabled: boolean;
  description?: string;
}

export interface FeatureFlagsConfig {
  [taskId: string]: FeatureFlag;
}

export const FEATURE_FLAGS: FeatureFlagsConfig = {
  'maximize-mines': {
    id: 'maximize-mines',
    enabled: true,
    description: 'Maximizar Minas - Feature lista para producción',
  },
  'expansion-policy': {
    id: 'expansion-policy',
    enabled: true,
    description: 'Política Expansionista - Feature en desarrollo',
  },
};

export function isFeatureEnabled(taskId: string): boolean {
  const flag = FEATURE_FLAGS[taskId];
  return flag?.enabled ?? false;
}

export function getEnabledFeatures(): string[] {
  return Object.keys(FEATURE_FLAGS).filter((key) => FEATURE_FLAGS[key].enabled);
}
