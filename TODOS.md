# TODOS

## Inbox

### Background inbox materialization

**What:** Add scheduled scans and precomputed inbox snapshots after the request-time inbox proves useful.

**Why:** Precomputing snapshots can reduce homepage latency, stabilize ranking inputs, and make the product feel ready the moment a trading session starts.

**Context:** The eng review intentionally reduced v1 to a request-time inbox with explicit snapshot and decision logging. The repo currently has no scheduler or job runner, and adding one before ranking quality is proven would spend complexity too early. Revisit this after the request-time loop ships and founder dogfooding shows the inbox is worth optimizing.

**Effort:** L
**Priority:** P3
**Depends on:** Request-time inbox shipping, ranking quality validation, and performance measurements from live dogfooding
