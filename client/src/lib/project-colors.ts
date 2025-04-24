// Utility to generate consistent colors for project names

// Muted color palette that fits with the app's existing theme
const PROJECT_COLORS = [
  'bg-blue-100 text-blue-800',     // Muted blue
  'bg-emerald-100 text-emerald-800', // Muted green
  'bg-amber-100 text-amber-800',    // Muted amber/yellow
  'bg-rose-100 text-rose-800',      // Muted rose/pink
  'bg-purple-100 text-purple-800',  // Muted purple
  'bg-teal-100 text-teal-800',      // Muted teal
  'bg-orange-100 text-orange-800',  // Muted orange
  'bg-indigo-100 text-indigo-800',  // Muted indigo
  'bg-cyan-100 text-cyan-800',      // Muted cyan
  'bg-fuchsia-100 text-fuchsia-800' // Muted fuchsia
];

// Map to store project name to color index mappings
const projectColorMap = new Map<string, number>();

/**
 * Get a consistent color for a project name
 * @param projectName The name of the project
 * @returns Tailwind CSS classes for background and text color
 */
export function getProjectColor(projectName: string): string {
  if (!projectName) return '';
  
  // If we've already assigned a color to this project, use it
  if (projectColorMap.has(projectName)) {
    return PROJECT_COLORS[projectColorMap.get(projectName)!];
  }
  
  // Otherwise, assign a new color based on the length of the map
  // This ensures each new project gets the next color in the sequence
  const colorIndex = projectColorMap.size % PROJECT_COLORS.length;
  projectColorMap.set(projectName, colorIndex);
  
  return PROJECT_COLORS[colorIndex];
}