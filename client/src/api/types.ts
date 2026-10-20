import type { components } from './schema'

type Schemas = components['schemas']

export type StegoMode = Schemas['StegoMode']
export type HealthResponse = Schemas['HealthResponse']
export type AudioInfo = Schemas['AudioInfo']
export type CapacityResponse = Schemas['CapacityResponse']
export type DecodeResponse = Schemas['DecodeResponse']
export type CompareResponse = Schemas['CompareResponse']
export type EnvelopeModel = Schemas['EnvelopeModel']
export type DifferenceModel = Schemas['DifferenceModel']
export type SpectrogramModel = Schemas['SpectrogramModel']
export type DistortionModel = Schemas['DistortionModel']
export type ChiSquareModel = Schemas['ChiSquareModel']
export type WindowedChiSquareModel = Schemas['WindowedChiSquareModel']
export type ChiSquareResponse = Schemas['ChiSquareResponse']
export type RsResponse = Schemas['RsResponse']
export type RsCountsModel = Schemas['RsCountsModel']
export type StegoAnalysisModel = Schemas['StegoAnalysisModel']
export type SweepPointModel = Schemas['SweepPointModel']
export type SweepResponse = Schemas['SweepResponse']
export type RobustnessResponse = Schemas['RobustnessResponse']
export type ErrorResponse = Schemas['ErrorResponse']

export interface EncodeStats {
  payloadBytes: number
  capacityBytes: number
  embeddedBits: number
  changedSamples: number
}

export interface EncodeResult {
  stego: File
  stats: EncodeStats
}
