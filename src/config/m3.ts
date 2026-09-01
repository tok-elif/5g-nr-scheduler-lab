import rawConfig from './m3.json'
export interface QdfPfParameters {
 beta: number
 gamma: number
 epsilonThroughputMbps: number
 epsilonGbrMbps: number
 epsilonTimeSeconds: number
 delta: number
}
export interface M3ScientificExperimentParameters {
 defaultSeedCount: number
 minimumSeedCount: number
 maximumSeedCount: number
 confidenceLevel: number
}
interface M3Config {
 qdfPf: QdfPfParameters
 scientificExperiment: M3ScientificExperimentParameters
}
const config = rawConfig as M3Config
function positiveFinite(value: number, label: string): void {
 if (!Number.isFinite(value) || value <= 0) {
   throw new Error(`${label} pozitif ve sonlu olmalıdır.`)
 }
}
positiveFinite(config.qdfPf.beta, 'QDF-PF beta')
positiveFinite(config.qdfPf.gamma, 'QDF-PF gamma')
positiveFinite(config.qdfPf.epsilonThroughputMbps, 'QDF-PF throughput epsilon')
positiveFinite(config.qdfPf.epsilonGbrMbps, 'QDF-PF GBR epsilon')
positiveFinite(config.qdfPf.epsilonTimeSeconds, 'QDF-PF zaman epsilon')
positiveFinite(config.qdfPf.delta, 'QDF-PF delta')
if (config.qdfPf.delta > 1) {
 throw new Error('QDF-PF delta 0 ile 1 arasında olmalıdır.')
}
const experiment = config.scientificExperiment
if (!Number.isInteger(experiment.defaultSeedCount)
 || !Number.isInteger(experiment.minimumSeedCount)
 || !Number.isInteger(experiment.maximumSeedCount)
 || experiment.minimumSeedCount < 2
 || experiment.defaultSeedCount < experiment.minimumSeedCount
 || experiment.maximumSeedCount < experiment.defaultSeedCount) {
 throw new Error('M3 bilimsel deney seed sınırları geçersiz.')
}
if (experiment.confidenceLevel !== 0.95) {
 throw new Error('Bu sürüm yalnız Student-t tabanlı %95 güven aralığını destekler.')
}
export const M3_CONFIG: Readonly<M3Config> = Object.freeze({
 qdfPf: Object.freeze({ ...config.qdfPf }),
 scientificExperiment: Object.freeze({ ...experiment }),
})
