interface GitHubAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubReleaseResponse {
  tag_name: string;
  assets: GitHubAsset[];
}

export interface ReleaseData {
  version: string;
  assets: {
    windows: string | null;
    linux_appimage: string | null;
    linux_deb: string | null;
  };
}

export interface MobileReleaseData {
  version: string;
  apk: string | null;
}

export async function getLatestRelease(): Promise<ReleaseData | null> {
  try {
    const response = await fetch('https://api.github.com/repos/jhonslife/GIRO/releases/latest', {
      cache: 'no-store', // Disable cache to ensure fresh data during debugging
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch latest release:', response.statusText);
      return null;
    }

    const data: GitHubReleaseResponse = await response.json();

    // Find assets
    const assets = data.assets || [];

    const findAsset = (patterns: string[]) =>
      assets.find((a: GitHubAsset) => patterns.some(p => a.name.toLowerCase().includes(p.toLowerCase()) && !a.name.endsWith('.sig') && !a.name.endsWith('.zip') && !a.name.endsWith('.tar.gz')))?.browser_download_url || null;

    return {
      version: data.tag_name,
      assets: {
        windows: findAsset(['_x64-setup.exe', 'setup.exe', '.exe']),
        linux_appimage: findAsset(['.AppImage']),
        linux_deb: findAsset(['.deb']),
      },
    };
  } catch (error) {
    console.error('Error fetching release:', error);
    return null;
  }
}

export async function getLatestMobileRelease(): Promise<MobileReleaseData | null> {
  try {
    const response = await fetch('https://api.github.com/repos/jhonslife/giro-mobile/releases/latest', {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/vnd.github.v3+json' },
    });

    if (!response.ok) return null;

    const data: GitHubReleaseResponse = await response.json();
    const assets = data.assets || [];
    const apk = assets.find((a: GitHubAsset) => a.name.endsWith('.apk'))?.browser_download_url || null;

    return {
      version: data.tag_name,
      apk,
    };
  } catch (error) {
    console.error('Error fetching mobile release:', error);
    return null;
  }
}
