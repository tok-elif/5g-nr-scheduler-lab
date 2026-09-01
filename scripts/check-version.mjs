import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const packageJson = readJson('package.json')
const packageLock = readJson('package-lock.json')
const application = readJson('src/config/application.json')
const m3Config = readJson('src/config/m3.json')
const changelog = readFileSync('CHANGELOG.md', 'utf8')
const readme = readFileSync('README.md', 'utf8')
const m3Index = readFileSync('src/m3Schedulers/index.ts', 'utf8')
const qdfSchedulerSource = readFileSync('src/m3Schedulers/qdfPf.scheduler.ts', 'utf8')
const expectedVersion = packageJson.version
const allowedBranches = [
 'main',
 'feature/m3-qos-scheduler',
 'feature/m3-scientific-algorithm-selection',
]
const ignoredDistributionFiles = new Set([
 '?? BUILD_VALIDATION.txt',
 '?? README_FIRST.txt',
 '?? START_PROJECT.bat',
])
const mismatches = []
const check = (source, actual, expected) => {
 if (actual !== expected) mismatches.push([source, `${actual} (beklenen ${expected})`])
}
check('package-lock.json', packageLock.version, expectedVersion)
check('package-lock root package', packageLock.packages?.['']?.version, expectedVersion)
check('application metadata', application.version, expectedVersion)
const escapedVersion = expectedVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const changelogHeadingMatch = changelog.match(
 new RegExp(`^## v${escapedVersion}.*?(\\d{4}-\\d{2}-\\d{2})`, 'm'),
)
if (!changelogHeadingMatch) {
 mismatches.push(['CHANGELOG.md', 'sürüm başlığı bulunamadı'])
} else {
 check('application releaseDate', application.releaseDate, changelogHeadingMatch[1])
}
if (!readme.includes('M0 + M1 + M2 + M3')) {
 mismatches.push(['README.md', 'M3 mevcut durum başlığında yok'])
}
if (readme.includes('ardından M3 önerilen algoritmaya geçilecektir')) {
 mismatches.push(['README.md', 'eski gelecek-zaman M3 ifadesi kaldı'])
}
if (!readme.includes(`v${expectedVersion}`)) {
 mismatches.push(['README.md', `v${expectedVersion} görünmüyor`])
}
if (existsSync('BUILD_VALIDATION.txt')) {
 const buildValidation = readFileSync('BUILD_VALIDATION.txt', 'utf8')
 const buildValidationVersion = buildValidation.match(/^Version\s*:\s*(\S+)/m)?.[1]
 check('BUILD_VALIDATION.txt', buildValidationVersion, expectedVersion)
}
const m2Kinds = readdirSync('src/m2Schedulers')
 .filter((name) => name.endsWith('.scheduler.ts'))
 .map((name) => {
   const source = readFileSync(`src/m2Schedulers/${name}`, 'utf8')
   return source.match(/kind:\s*'([^']+)'/)?.[1]
 })
 .filter(Boolean)
 .sort()
const expectedM2Kinds = [
 'exp-pf',
 'm-lwdf',
 'max-ci',
 'proportional-fair',
 'round-robin',
]
if (JSON.stringify(m2Kinds) !== JSON.stringify(expectedM2Kinds)) {
 mismatches.push(['M2 scheduler registry', m2Kinds.join(', ')])
}
if (m2Kinds.includes('qdf-pf')) {
 mismatches.push(['M2 scheduler registry', 'QDF-PF yanlışlıkla M2 içinde'])
}
for (const kind of ['m-lwdf', 'exp-pf']) {
 if (!m3Index.includes(`'${kind}'`)) {
   mismatches.push(['M3 scheduler registry', `${kind} bulunamadı`])
 }
}
if (!qdfSchedulerSource.includes("kind: 'qdf-pf'") || !m3Index.includes('qdfPfScheduler')) {
 mismatches.push(['M3 scheduler registry', 'qdf-pf bulunamadı'])
}
for (const key of [
 'epsilonThroughputMbps',
 'epsilonGbrMbps',
 'epsilonTimeSeconds',
 'beta',
 'gamma',
 'delta',
]) {
 if (!(key in m3Config.qdfPf)) {
   mismatches.push(['src/config/m3.json', `${key} bulunamadı`])
 }
}
let branch
let gitTag
let status
const hasGitRepo = existsSync('.git')
if (hasGitRepo) {
 try {
   branch = execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim()
   gitTag = execFileSync('git', ['describe', '--tags', '--abbrev=0', 'HEAD'], { encoding: 'utf8' }).trim()
   status = execFileSync('git', ['status', '--short'], { encoding: 'utf8' })
     .split(/\r?\n/)
     .filter((line) => line && !ignoredDistributionFiles.has(line))
     .join('\n')
 } catch (error) {
   mismatches.push(['Git', error instanceof Error ? error.message : 'Git doğrulaması başarısız'])
 }
 if (branch && !allowedBranches.includes(branch)) mismatches.push(['Git branch', branch])
 if (gitTag && gitTag !== `v${expectedVersion}`) mismatches.push(['Git tag', gitTag])
 if (status) mismatches.push(['Git status', status])
} else {
 console.log('Git deposu bulunamadı (dağıtım paketi) — git tabanlı kontroller atlandı.')
}
if (mismatches.length > 0) {
 for (const [source, value] of mismatches) console.error(`${source}: ${value}`)
 process.exitCode = 1
} else {
 console.log(
   `Sürüm ve bütünlük tutarlı: ${expectedVersion} · `
   + `branch ${hasGitRepo ? branch : 'N/A (dağıtım paketi)'} · base tag v${expectedVersion} · M2=5 · M3=3`,
 )
}
