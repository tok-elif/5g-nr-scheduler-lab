export type ModuleView = 'm0' | 'm1' | 'm2' | 'm3' | 'm4'
export const MODULE_NAVIGATION: readonly Readonly<{
 view: ModuleView
 index: string
 label: string
}>[] = Object.freeze([
 { view: 'm0', index: '01', label: 'M0 · Link Adaptation' },
 { view: 'm1', index: '02', label: 'M1 · Scheduling' },
 { view: 'm2', index: '03', label: 'M2 · QoS + Trafik' },
 { view: 'm3', index: '04', label: 'M3 · QoS Karşılaştırma' },
 { view: 'm4', index: '05', label: 'M4 · Network Slicing' },
])
