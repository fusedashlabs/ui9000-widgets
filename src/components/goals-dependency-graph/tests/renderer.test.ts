import { describe, expect, it, vi } from 'vitest';

import fixture from '../../../stories/fixtures/goals-dependency-graph.default.json';
import { fieldCounts, MAX_GOALS, normalizeGoalsDependencyGraph, plantGoals } from '../lib/index.js';
import * as SHADERS from '../render/gl/shaders.js';
import { scenePalette } from '../render/scene-palette.js';

// the programs the renderer asks for, with their defines: the first one is enough to read the arrays' size
const asked: Record<string, number>[] = [];
vi.mock('../render/gl/program.js', async (actual) => ({
  ...(await actual<typeof import('../render/gl/program.js')>()),
  halfFloatTargets: () => true,
  createProgram: (_gl: unknown, _vertex: string, _fragment: string, defines: Record<string, number> = {}) => {
    asked.push(defines);
    throw new Error('stop at the first program');
  },
}));

const { createFieldRenderer } = await import('../render/gl/renderer.js');

describe('goals dependency graph WebGL picture', () => {
  it('sizes every per-goal array in the shaders by GOALS, never by a number of its own', () => {
    const source = Object.values(SHADERS as Record<string, unknown>)
      .filter((v): v is string => typeof v === 'string')
      .join('\n');
    const sizes = Object.fromEntries([...source.matchAll(/uniform\s+\w+\s+(u\w+)\[(\w+)\]/g)].map((m) => [m[1], m[2]]));
    for (const name of ['uGoal', 'uGoalB', 'uLight', 'uLightCol', 'uScale']) expect(sizes[name]).toBe('GOALS');
    // the loop over the goals' lights runs to the same bound
    expect(source).toMatch(/for \(int i = 0; i < GOALS; i\+\+\)[^}]*uLight\[i\]/);
  });

  it('defines GOALS as the most goals the model keeps', () => {
    const model = normalizeGoalsDependencyGraph(fixture);
    const planted = plantGoals(model.goals);
    const field = { clouds: model.goals.map((g) => planted[g.id]!.cloud), counts: fieldCounts(model.goals) };
    const canvas = { getContext: () => ({}), addEventListener: () => {}, removeEventListener: () => {} } as unknown as HTMLCanvasElement;
    expect(() => createFieldRenderer(canvas, field as never, scenePalette('default'))).toThrow('stop at the first program');
    expect(asked[0]).toMatchObject({ GOALS: MAX_GOALS });
  });
});
