import { z } from 'zod'

export const situationFeaturesSchema = z.object({
  archetype: z
    .enum([
      'creating',
      'sustaining',
      'transforming',
      'dissolving',
      'waiting',
      'advancing',
      'retreating',
      'conflicting',
      'uniting',
      'separating',
      'learning',
      'leading',
    ])
    .optional(),
  phase: z
    .enum(['germinal', 'emerging', 'developing', 'peak', 'declining', 'ending'])
    .optional(),
  scale: z
    .enum(['personal', 'interpersonal', 'team', 'organizational', 'societal'])
    .optional(),
  power: z
    .enum(['dominant', 'advantaged', 'balanced', 'disadvantaged', 'subordinate'])
    .optional(),
  agency: z.enum(['active', 'responsive', 'patient', 'submissive']).optional(),
  risk: z.enum(['low', 'moderate', 'high', 'existential']).optional(),
})

export const cotJudgmentSchema = z.object({
  selectedNumber: z.number().int().min(1).max(64),
  reasoning: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  runners: z.array(z.number().int().min(1).max(64)),
})

export const yaoPositioningSchema = z.object({
  yaoPosition: z.number().int().min(1).max(6),
  confidence: z.enum(['high', 'medium', 'low']),
  brief: z.string(),
})
