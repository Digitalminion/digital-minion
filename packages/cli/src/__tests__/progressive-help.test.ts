import { describe, it, expect } from 'vitest';
import { shouldUseColors, renderMainHelp } from '../utils/progressive-help';

describe('Progressive Help System', () => {
  describe('shouldUseColors', () => {
    it('should return false when NO_COLOR is set', () => {
      const originalNoColor = process.env.NO_COLOR;
      process.env.NO_COLOR = '1';

      expect(shouldUseColors()).toBe(false);

      // Cleanup
      if (originalNoColor === undefined) {
        delete process.env.NO_COLOR;
      } else {
        process.env.NO_COLOR = originalNoColor;
      }
    });

    it('should return false when FORCE_COLOR is 0', () => {
      const originalForceColor = process.env.FORCE_COLOR;
      process.env.FORCE_COLOR = '0';

      expect(shouldUseColors()).toBe(false);

      // Cleanup
      if (originalForceColor === undefined) {
        delete process.env.FORCE_COLOR;
      } else {
        process.env.FORCE_COLOR = originalForceColor;
      }
    });
  });

  describe('renderMainHelp', () => {
    it('should render help with module list', () => {
      const modules = [
        { name: 'task', description: 'Manage tasks' },
        { name: 'tag', description: 'Manage tags' },
      ];

      const help = renderMainHelp(modules, { useColors: false, width: 80 });

      expect(help).toContain('DIGITAL MINION TASK CLI');
      expect(help).toContain('task');
      expect(help).toContain('tag');
      expect(help).toContain('Manage tasks');
      expect(help).toContain('Manage tags');
    });

    it('should include quick start section', () => {
      const modules = [{ name: 'list', description: 'List tasks' }];

      const help = renderMainHelp(modules, { useColors: false, width: 80 });

      expect(help).toContain('QUICK START');
      expect(help).toContain('dm list --agent myname');
    });

    it('should not include ANSI color codes when useColors is false', () => {
      const modules = [{ name: 'task', description: 'Manage tasks' }];

      const help = renderMainHelp(modules, { useColors: false, width: 80 });

      // ANSI codes typically start with \x1b[ or \u001b[
      expect(help).not.toMatch(/\x1b\[/);
      expect(help).not.toMatch(/\u001b\[/);
    });
  });
});
