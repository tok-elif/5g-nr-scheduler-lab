export type RandomSource = () => number
export function createSeededRandom(seed: number): RandomSource {
 let state = seed >>> 0
 return () => {
   state += 0x6d2b79f5
   let value = state
   value = Math.imul(value ^ (value >>> 15), value | 1)
   value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
   return ((value ^ (value >>> 14)) >>> 0) / 4294967296
 }
}
export function sampleNormal(random: RandomSource, mean: number, stdDev: number): number {
 const u1 = Math.max(random(), Number.EPSILON)
 const u2 = random()
 const standardNormal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
 return mean + stdDev * standardNormal
}
export function samplePoisson(random: RandomSource, lambda: number): number {
 if (!Number.isFinite(lambda) || lambda < 0) throw new Error('Poisson lambda sonlu ve negatif olmayan bir sayı olmalıdır.')
 if (lambda === 0) return 0
 // Slot başına trafik yoğunluğu varsayılan senaryolarda 1'in oldukça
 // altındadır. Büyük lambda değerlerini de güvenli tutmak için toplamsal
 // parçalama kullanılır; böylece exp(-lambda) sayısal olarak sıfıra düşmez.
 let remaining = lambda
 let total = 0
 while (remaining > 0) {
   const chunk = Math.min(remaining, 30)
   const limit = Math.exp(-chunk)
   let product = 1
   let count = 0
   do {
     count += 1
     product *= random()
   } while (product > limit)
   total += count - 1
   remaining -= chunk
 }
 return total
}
export function clamp(value: number, min: number, max: number): number {
 return Math.min(max, Math.max(min, value))
}
