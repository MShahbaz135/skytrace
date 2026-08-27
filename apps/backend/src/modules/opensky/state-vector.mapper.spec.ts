import { mapStateVector, mapStatesResponse, type RawStateVector } from './state-vector.mapper';

function vector(overrides: Partial<Record<number, unknown>> = {}): RawStateVector {
  const base: unknown[] = [
    '3c6444', // 0 icao24
    'DLH123  ', // 1 callsign, padded as the API sends it
    'Germany', // 2 origin country
    1700000000, // 3 time position
    1700000005, // 4 last contact
    8.5, // 5 longitude
    50.1, // 6 latitude
    10500.5, // 7 baro altitude
    false, // 8 on ground
    240.3, // 9 velocity
    91.2, // 10 true track
    -2.6, // 11 vertical rate
    null, // 12 sensors
    10700.1, // 13 geo altitude
    '1000', // 14 squawk
    false, // 15 spi
    0, // 16 position source
  ];

  for (const [index, value] of Object.entries(overrides)) {
    base[Number(index)] = value;
  }
  return base as RawStateVector;
}

describe('mapStateVector', () => {
  it('maps positional fields to named properties', () => {
    const state = mapStateVector(vector());

    expect(state).toEqual({
      icao24: '3c6444',
      callsign: 'DLH123',
      originCountry: 'Germany',
      lat: 50.1,
      lng: 8.5,
      baroAltitude: 10500.5,
      geoAltitude: 10700.1,
      velocity: 240.3,
      trueTrack: 91.2,
      verticalRate: -2.6,
      onGround: false,
      lastContact: 1700000005,
      timePosition: 1700000000,
      squawk: '1000',
    });
  });

  it('lower-cases the transponder address so it joins with enrichment records', () => {
    expect(mapStateVector(vector({ 0: '3C6444' }))?.icao24).toBe('3c6444');
  });

  it('treats an all-whitespace callsign as absent', () => {
    expect(mapStateVector(vector({ 1: '        ' }))?.callsign).toBeNull();
    expect(mapStateVector(vector({ 1: null }))?.callsign).toBeNull();
  });

  it('rejects vectors with no usable position', () => {
    expect(mapStateVector(vector({ 5: null }))).toBeNull();
    expect(mapStateVector(vector({ 6: null }))).toBeNull();
    expect(mapStateVector(vector({ 0: '' }))).toBeNull();
  });

  it('preserves a genuine zero rather than treating it as missing', () => {
    const state = mapStateVector(vector({ 7: 0, 9: 0, 10: 0, 11: 0 }));

    expect(state?.baroAltitude).toBe(0);
    expect(state?.velocity).toBe(0);
    expect(state?.trueTrack).toBe(0);
    expect(state?.verticalRate).toBe(0);
  });

  it('nulls out non-finite numerics', () => {
    expect(mapStateVector(vector({ 7: Number.NaN }))?.baroAltitude).toBeNull();
  });
});

describe('mapStatesResponse', () => {
  it('drops unusable vectors but keeps the rest', () => {
    const states = mapStatesResponse({
      time: 1700000000,
      states: [vector(), vector({ 5: null }), vector({ 0: '4ca123' })],
    });

    expect(states).toHaveLength(2);
    expect(states.map((state) => state.icao24)).toEqual(['3c6444', '4ca123']);
  });

  it('handles an empty feed', () => {
    expect(mapStatesResponse({ time: 1, states: null })).toEqual([]);
  });
});
