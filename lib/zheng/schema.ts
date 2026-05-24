/**
 * 「征」模块 — Zod schemas for runtime validation
 *
 * 用途：
 * - v1: 读取 localStorage 时过滤脏数据
 * - v2: 前后端 API 边界的 contract / validation
 */

import { z } from 'zod'

const YaoPositionSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])

export const VerificationStatusSchema = z.enum([
  'unverified',
  'fulfilled',
  'partial',
  'unfulfilled',
])

export const SavedYaoLocationSchema = z.object({
  topPosition: YaoPositionSchema,
  topYaoName: z.string(),
  topRatio: z.number().min(0).max(1),
  crossYaoPosition: YaoPositionSchema.optional(),
  crossYaoName: z.string().optional(),
})

export const ConsultationRecordSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  createdAt: z.number().int().nonnegative(),
  situation: z.string().min(1),
  hexagramId: z.number().int().min(1).max(64),
  hexagramName: z.string().min(1),
  fitScore: z.number().min(0).max(1),
  yaoLocation: SavedYaoLocationSchema.optional(),
  userNote: z.string().optional(),
  verification: VerificationStatusSchema,
  verificationNote: z.string().optional(),
  verifiedAt: z.number().int().nonnegative().optional(),
  userId: z.string().optional(),
  syncedAt: z.number().int().nonnegative().optional(),
})
