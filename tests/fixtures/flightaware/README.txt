Recorded 2026-10-27 ~15:50Z from FlightAware AeroAPI (Personal tier) with 4 operator-approved calls:
  GET /account/usage?start=2026-10-01                          -> usage.json (fresh account: all zeros; usage data lags up to 10 min)
  GET /flights/{cs}?ident_type=designator&max_pages=1&start=2026-10-26&end=2026-10-28 for LHX1HL, TKJ9GC, LAV8091
Findings: FlightAware resolves the ATC callsign to the commercial ident (LHX1HL -> LHX1979 EDDK-EDDM, TKJ9GC -> TKJ26 EDDL-LTFJ),
both of which adsbdb/hexdb/VRS had wrong or missing. LAV8091 has two legs: the completed EDDL-LYBE (origin+destination) and the
return leg LYBE-? with position_only:true and destination null — the "no flight plan" case. Responses are unmodified public flight data;
no key material is contained. Do not record new fixtures without operator approval (each /flights call costs $0.005).
