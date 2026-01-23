import { describe, it, expect } from 'vitest';
import { getLatestRelease } from './github';

describe('github.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch latest release successfully', async () => {
    const mockRelease = {
      tag_name: 'v1.0.0',
      assets: [
        { name: 'GIRO_1.0.0_x64-setup.exe', browser_download_url: 'http://win.com' },
        { name: 'giro_1.0.0_amd64.AppImage', browser_download_url: 'http://linux.com' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRelease,
    });

    const release = await getLatestRelease();
    
    if (!release) {
      const resp = await (global.fetch as any).mock.results[0].value;
      const json = await resp.json();
      console.log('Mocked JSON:', json);
    }

    expect(release).not.toBeNull();
    expect(release?.version).toBe('v1.0.0');
    expect(release?.assets.windows).toBe('http://win.com');
    expect(release?.assets.linux_appimage).toBe('http://linux.com');
  });

  it('should handle fetch failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
    });

    const release = await getLatestRelease();
    expect(release).toBeNull();
  });

  it('should handle fetch errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const release = await getLatestRelease();
    expect(release).toBeNull();
  });

  it('should use patterns to find correct assets', async () => {
    const mockRelease = {
      tag_name: 'v2.0.0',
      assets: [
        { name: 'other_file.zip', browser_download_url: 'http://other.com' },
        { name: 'GIRO_2.0.0_x64-setup.exe', browser_download_url: 'http://win.com' },
        { name: 'giro_2.0.0_amd64.deb', browser_download_url: 'http://deb.com' },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockRelease,
    });

    const release = await getLatestRelease();
    expect(release?.assets.windows).toBe('http://win.com');
    expect(release?.assets.linux_deb).toBe('http://deb.com');
  });
});
