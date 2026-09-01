import qosConfig from './qos-profiles.json'
import type { QosProfile } from '../simulation/m2Types'
export const QOS_SOURCE = Object.freeze(qosConfig.source)
export const QOS_PROFILES: readonly QosProfile[] = Object.freeze(
 qosConfig.profiles.map((profile) => Object.freeze(profile as QosProfile)),
)
export function getQosProfile(fiveQi: number): QosProfile {
 const profile = QOS_PROFILES.find((item) => item.fiveQi === fiveQi)
 if (!profile) throw new Error(`Tanımsız 5QI profili: ${fiveQi}`)
 return profile
}
