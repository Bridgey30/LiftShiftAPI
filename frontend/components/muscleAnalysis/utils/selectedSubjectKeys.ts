export type MuscleAnalysisViewMode = 'headless';

export const resolveSelectedSubjectKeys = (args: {
  selectedMuscle: string | null;
}): string[] => {
  const { selectedMuscle } = args;
  return selectedMuscle ? [selectedMuscle] : [];
};
