import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const PLIST_LABEL = 'com.voyager.greatwall';

export function generatePlist(projectRoot: string, nodePath: string): string {
  const runnerPath = resolve(projectRoot, 'packages', 'core', 'src', 'scheduler', 'runner.ts');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${resolve(projectRoot, 'node_modules', '.bin', 'tsx')}</string>
        <string>${runnerPath}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${projectRoot}</string>
    <key>StartCalendarInterval</key>
    <array>
        <!-- Monday 07:00 -->
        <dict>
            <key>Weekday</key><integer>1</integer>
            <key>Hour</key><integer>7</integer>
            <key>Minute</key><integer>0</integer>
        </dict>
        <!-- Friday 07:00 -->
        <dict>
            <key>Weekday</key><integer>5</integer>
            <key>Hour</key><integer>7</integer>
            <key>Minute</key><integer>0</integer>
        </dict>
    </array>
    <key>StandardOutPath</key>
    <string>${resolve(projectRoot, 'data', 'logs', 'stdout.log')}</string>
    <key>StandardErrorPath</key>
    <string>${resolve(projectRoot, 'data', 'logs', 'stderr.log')}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:${nodePath}:/usr/local/bin:/usr/bin:/bin</string>
        <key>HOME</key>
        <string>${process.env.HOME}</string>
    </dict>
</dict>
</plist>`;
}

export function installSchedule(projectRoot: string): void {
  const nodePath = execSync('dirname $(which node)', { encoding: 'utf-8' }).trim();
  const plist = generatePlist(projectRoot, nodePath);
  const plistPath = resolve(process.env.HOME!, 'Library', 'LaunchAgents', `${PLIST_LABEL}.plist`);

  writeFileSync(plistPath, plist, 'utf-8');
  console.log(`[Schedule] Plist written to ${plistPath}`);

  try {
    execSync(`launchctl unload ${plistPath} 2>/dev/null`, { encoding: 'utf-8' });
  } catch { /* not loaded, that's fine */ }

  execSync(`launchctl load ${plistPath}`, { encoding: 'utf-8' });
  console.log('[Schedule] Loaded into launchctl. Running Monday + Friday at 07:00.');
}

export function uninstallSchedule(): void {
  const plistPath = resolve(process.env.HOME!, 'Library', 'LaunchAgents', `${PLIST_LABEL}.plist`);
  try {
    execSync(`launchctl unload ${plistPath}`, { encoding: 'utf-8' });
    console.log('[Schedule] Unloaded from launchctl.');
  } catch {
    console.log('[Schedule] Not currently loaded.');
  }
}
