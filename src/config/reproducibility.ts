import { APPLICATION_METADATA } from './application'
import type { M1Config, ScenarioConfig } from '../simulation/types'
import type { M2Config } from '../simulation/m2Types'
export interface ExperimentFingerprintInput {
 cellId: string
 scenario: ScenarioConfig
 m1Config: M1Config
 m2Config?: M2Config
 seedCount: number
}
export function createExperimentFingerprint(
 input: ExperimentFingerprintInput,
 applicationVersion = APPLICATION_METADATA.version,
): string {
 const canonical = JSON.stringify([
   applicationVersion,
   input.cellId,
   input.scenario.ueCount,
   input.scenario.seed,
   input.scenario.meanSinrDb,
   input.scenario.stdDevSinrDb,
   input.scenario.minSinrDb,
   input.scenario.maxSinrDb,
   input.scenario.layers,
   input.scenario.overheadFraction,
   input.m1Config.slotCount,
   input.m1Config.pfWindowSlots,
   input.m1Config.traceSlotLimit ?? null,
   input.m2Config?.slotCount ?? null,
   input.m2Config?.pfWindowSlots ?? null,
   input.m2Config?.traceSlotLimit ?? null,
   input.m2Config?.trafficSeedOffset ?? null,
   input.m2Config?.trafficClasses.map((traffic) => [
     traffic.fiveQi,
     traffic.arrivalRatePacketsPerSecond,
     traffic.packetSizeBytes,
     traffic.gbrMbps,
   ]) ?? null,
   input.seedCount,
 ])
 let hash = 0x811c9dc5
 for (let index = 0; index < canonical.length; index += 1) {
   hash ^= canonical.charCodeAt(index)
   hash = Math.imul(hash, 0x01000193)
 }
 return `RUN-${(hash >>> 0).toString(16).padStart(8, '0').toUpperCase()}`
}
