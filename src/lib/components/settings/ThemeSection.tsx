import { Sun, Moon, Monitor } from 'lucide-react';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useSettingsStore } from '../../stores/settings';
import type { ThemeMode } from '../../utils/theme';

export function ThemeSection() {
  const { themeMode, setThemeMode } = useSettingsStore();

  const handleThemeModeChange = (mode: string) => {
    console.log('[ThemeSection] Radio button clicked');
    console.log('[ThemeSection] Mode being passed to setThemeMode:', mode);
    console.log('[ThemeSection] Current themeMode before change:', themeMode);
    setThemeMode(mode as ThemeMode);
    console.log('[ThemeSection] After setThemeMode call');
  };

  const manualToggleDark = () => {
    console.log('[MANUAL TEST] Toggling dark class directly');
    const root = document.documentElement;
    console.log('[MANUAL TEST] Before toggle:', root.classList.toString());
    root.classList.toggle('dark');
    console.log('[MANUAL TEST] After toggle:', root.classList.toString());
    console.log('[MANUAL TEST] Has dark class:', root.classList.contains('dark'));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Theme Settings</h2>
        <div className="h-px bg-border mb-6" />
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <Label className="text-base font-medium">Theme Mode</Label>
          <p className="text-sm text-muted-foreground">
            Choose how the application appearance should be determined
          </p>

          <RadioGroup value={themeMode} onValueChange={handleThemeModeChange}>
            <div className="space-y-3 mt-4">
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="light" id="theme-light" />
                <Label
                  htmlFor="theme-light"
                  className="flex-1 cursor-pointer flex items-center gap-3"
                >
                  <Sun className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <div className="font-medium">Light</div>
                    <div className="text-sm text-muted-foreground">
                      Always use light theme
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="dark" id="theme-dark" />
                <Label
                  htmlFor="theme-dark"
                  className="flex-1 cursor-pointer flex items-center gap-3"
                >
                  <Moon className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <div className="font-medium">Dark</div>
                    <div className="text-sm text-muted-foreground">
                      Always use dark theme
                    </div>
                  </div>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="adaptive" id="theme-adaptive" />
                <Label
                  htmlFor="theme-adaptive"
                  className="flex-1 cursor-pointer flex items-center gap-3"
                >
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                  <div className="space-y-1">
                    <div className="font-medium">Adaptive</div>
                    <div className="text-sm text-muted-foreground">
                      Match your system preferences
                    </div>
                  </div>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-medium mb-1">Theme Preview</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Current theme: <span className="font-medium capitalize">{themeMode}</span>
              </p>
              <button
                onClick={manualToggleDark}
                className="mb-3 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:opacity-80 transition-opacity"
              >
                DEBUG: Manual Dark Toggle
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded bg-background border border-border">
                  <div className="text-xs font-medium text-foreground mb-1">Background</div>
                  <div className="text-xs text-muted-foreground">Default background color</div>
                </div>
                <div className="p-3 rounded bg-primary text-primary-foreground border border-border">
                  <div className="text-xs font-medium mb-1">Primary</div>
                  <div className="text-xs opacity-90">Primary accent color</div>
                </div>
                <div className="p-3 rounded bg-secondary text-secondary-foreground border border-border">
                  <div className="text-xs font-medium mb-1">Secondary</div>
                  <div className="text-xs opacity-90">Secondary color</div>
                </div>
                <div className="p-3 rounded bg-muted text-muted-foreground border border-border">
                  <div className="text-xs font-medium mb-1">Muted</div>
                  <div className="text-xs">Muted elements</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
