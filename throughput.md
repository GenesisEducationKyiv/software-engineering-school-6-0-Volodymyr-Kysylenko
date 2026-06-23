── gRPC (HTTP/2 + Protobuf) ──────────────────────────────
requests : 200
total : 10090 ms
rps : 19.8
avg : 500.35 ms
p50 : 500.82 ms
p95 : 541.71 ms
p99 : 552.87 ms
min : 462.70 ms
max : 573.90 ms

── REST (HTTP/1.1 + JSON) ──────────────────────────────
requests : 200
total : 10454 ms
rps : 19.1
avg : 508.84 ms
p50 : 489.06 ms
p95 : 640.78 ms
p99 : 686.80 ms
min : 461.21 ms
max : 888.04 ms

── Summary ─────────────────────────────────
gRPC RPS : 19.8
REST RPS : 19.1
gRPC is 1.04x the throughput of REST
