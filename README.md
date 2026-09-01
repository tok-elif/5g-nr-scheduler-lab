# 5G NR Scheduler Lab

A system-level simulator for comparing **5G NR downlink packet scheduling algorithms**,
built with React and TypeScript.

```
SINR -> CQI -> MCS -> spectral efficiency -> achievable rate
     -> traffic queues -> scheduler decision -> RB allocation
     -> throughput / delay / fairness / QoS
```

Current scope: **M0 + M1 + M2 + M3 + M4** (optional slicing) · version **v1.7.5-m3.5**

> Türkçe dokümantasyon: **[README_TR.md](README_TR.md)** — model varsayımları, deney
> matrisleri ve modül modül ayrıntılar orada.

---

## Modules

| Module | Scope |
|---|---|
| **M0** | Link adaptation: seeded UE/SINR population, SINR → CQI → MCS → achievable rate |
| **M1** | Full-buffer scheduling and the frame · subframe · slot resource view |
| **M2** | Packet traffic: Poisson arrivals, FIFO queues, 5QI/GBR classes, greedy RB sharing |
| **M3** | QoS comparison and the proposed **QDF-PF** scheduler, with a scientific experiment protocol |
| **M4** | RAN-level network slicing: eMBB / URLLC / mMTC sharing one cell budget |

## Schedulers

Round Robin · Max C/I · Proportional Fair · M-LWDF · EXP/PF · **QDF-PF** (proposed).

Delay-aware schedulers require packet queues, so they run from M2 onwards.

---

## Quick start

**Windows:** double-click **`KUR_VE_CALISTIR.bat`** — it installs dependencies and opens the app.

**Any platform:**

```bash
npm install
```

```bash
npm run dev
```

Then open http://127.0.0.1:5173

### Checks

```bash
npm test
```

```bash
npm run lint
```

```bash
npm run build
```

Current status: **569/569 tests pass**, lint reports 0 warnings and 0 errors, and the
production build succeeds. The same checks run on GitHub Actions for every push and pull
request.

---

## Frequency-selective channel (optional)

The M0 core represents the channel with a **single wideband SINR per UE**. Under that
assumption every RB is identical, so the UE with the best metric in a slot is the best on
*every* RB and allocations necessarily come out as **contiguous blocks**. That is not a
defect — it is the correct result of a flat channel.

In a real cell the SINR varies across RBs (frequency-selective fading): one UE is better at
one end of the band, another UE at the other end. The `frequencySelective` block in
`src/config/simulation.json` enables that behaviour:

```jsonc
"frequencySelective": {
  "enabled": false,          // set to true to switch on per-RB scheduling
  "stdDevDb": 4,             // standard deviation of the per-RB SINR offset (dB)
  "coherenceBandwidthRb": 4, // how many RBs the offset stays smooth across
  "seedOffset": 9176         // seed offset used when generating per-UE offsets
}
```

When enabled:

- A per-RB SINR profile is generated for every UE. Offsets are zero-mean, correlated across
  frequency, and **reproducible from the seed**.
- The scheduling decision is made **per RB** rather than once per slot: each RB goes to the UE
  with the highest metric at that point, and a UE leaves the contest once its backlog drains.
  All six schedulers work unchanged.
- Allocations interleave naturally — a UE can receive non-contiguous RBs. The RB indices shown
  in the resource map are the engine's real decision, never generated for display purposes.
- Service capacity is computed by summing the rates of the RBs actually assigned to the UE.

When disabled (the default) no code path changes and wideband results are preserved
bit-for-bit. Round Robin is not channel-aware, so it still produces contiguous blocks even
when the model is on — that is expected.

---

## Repository layout

| Path | Contents |
|---|---|
| `src/simulation/` | M0–M4 engines, link adaptation, channel model, seeded RNG |
| `src/m2Schedulers/` | RB allocation and the M2 scheduler family |
| `src/m3Schedulers/` | The proposed QDF-PF scheduler |
| `src/components/` | Dashboards, charts and the frame · subframe · slot views |
| `src/workers/` | Web workers that keep long runs off the UI thread |
| `src/config/` | All experiment parameters — no experiment value is hard-coded |
| `src/metrics/` | Fairness, percentiles and statistics |
| `configs/` | M3 experiment protocol and its JSON schema |
| `docs/` | Architecture, scheduler specifications, experiment protocol, UI requirements |
| `docs/notes/` | Development notes kept as working evidence |

---

## Documentation

| Document | Purpose |
|---|---|
| [README_TR.md](README_TR.md) | Full Turkish reference: model assumptions, experiment matrices |
| [docs/SCHEDULER_SPECIFICATIONS.md](docs/SCHEDULER_SPECIFICATIONS.md) | Scheduler definitions |
| [docs/NQ_PF_TECHNICAL_SPEC.md](docs/NQ_PF_TECHNICAL_SPEC.md) | QDF-PF technical specification |
| [docs/M3_EXPERIMENT_PROTOCOL.md](docs/M3_EXPERIMENT_PROTOCOL.md) | Scientific experiment protocol |
| [docs/M4_ARCHITECTURE.md](docs/M4_ARCHITECTURE.md) | Slicing architecture |
| [docs/M4_NETWORK_SLICING_SPEC.md](docs/M4_NETWORK_SLICING_SPEC.md) | Slicing specification |
| [docs/M0_M2_SCIENTIFIC_AUDIT.md](docs/M0_M2_SCIENTIFIC_AUDIT.md) | Scientific audit of M0–M2 |
| [docs/UI_UX_REQUIREMENTS.md](docs/UI_UX_REQUIREMENTS.md) | UI/UX requirements |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

---

## Status and rights

This repository is an academic internship study. It is a simplified, system-level teaching and
research simulator — not a 3GPP-conformant 5G stack and not a product. All rights reserved; no
open-source licence is granted. Please contact the author before reusing the material.
