import packageJson from '../../package.json';

// Define interfaces for GitHub API responses
interface GitHubRelease {
  tag_name: string;
  html_url: string;
  name: string;
  published_at: string;
}

/**
 * Get the current application version from package.json
 * @returns The current version string
 */
export const getCurrentVersion = (): string => {
  return packageJson.version;
};

/**
 * Fetch the latest release version from GitHub
 * @param owner The GitHub repository owner
 * @param repo The GitHub repository name
 * @returns Promise with the latest release information or null if fetch fails
 */
export const fetchLatestRelease = async (
  owner: string = 'GP02A',
  repo: string = 'aibo'
): Promise<GitHubRelease | null> => {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`
    );
    
    if (!response.ok) {
      console.error('Failed to fetch latest release:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data as GitHubRelease;
  } catch (error) {
    console.error('Error fetching latest release:', error);
    return null;
  }
};

/**
 * Compare two semantic version strings
 * @param version1 First version string (e.g., "1.0.0")
 * @param version2 Second version string (e.g., "1.1.0")
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
export const compareVersions = (version1: string, version2: string): number => {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part < v2Part) return -1;
    if (v1Part > v2Part) return 1;
  }
  
  return 0;
};

/**
 * Check if a new version is available
 * @param currentVersion The current version string
 * @param latestVersion The latest version string
 * @returns True if a newer version is available
 */
export const isNewVersionAvailable = (currentVersion: string, latestVersion: string): boolean => {
  return compareVersions(currentVersion, latestVersion) < 0;
};

/**
 * Format a version string by removing 'v' prefix if present
 * @param version The version string (e.g., "v1.0.0" or "1.0.0")
 * @returns Formatted version string (e.g., "1.0.0")
 */
export const formatVersion = (version: string): string => {
  return version.startsWith('v') ? version.substring(1) : version;
};