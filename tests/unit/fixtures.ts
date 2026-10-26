import type { Catalog, CatalogModel } from '../../src/simulator/types';

const model = (over: Partial<CatalogModel> & Pick<CatalogModel, 'slug' | 'name' | 'tier' | 'formFactor'>, prices: Record<number, number | null>): CatalogModel => {
  const variations = Object.entries(prices).map(([ram, reais]) => ({ ramGb: Number(ram), priceCents: reais === null ? null : reais * 100, inStock: true }));
  const priced = variations.map((v) => v.priceCents).filter((v): v is number => v !== null);
  return {
    id: Math.floor(Math.random() * 1e6),
    brand: 'Dell',
    sockets: 2,
    family: 'Teste',
    url: `https://msserver.com.br/servidor/${over.slug}/`,
    inStock: true,
    minPriceCents: priced.length ? Math.min(...priced) : null,
    variations,
    ...over,
  };
};

export const catalog: Catalog = {
  source: 'fixture',
  fetchedAt: '2026-10-26T12:00:00.000Z',
  currency: 'BRL',
  models: [
    model({ slug: 'r740', name: 'Dell PowerEdge R740', tier: 'scalable', formFactor: 'rack' }, { 16: 23500, 32: 24000, 64: 25000, 128: 26500 }),
    model({ slug: 'r540', name: 'Dell PowerEdge R540', tier: 'scalable', formFactor: 'rack' }, { 16: 20500, 64: 22000 }),
    model({ slug: 'dl380g10', name: 'HP Proliant DL380 G10', brand: 'HPE', tier: 'scalable', formFactor: 'rack' }, { 8: null, 16: null, 32: 19500 }),
    model({ slug: 't630', name: 'Dell PowerEdge T630', tier: 'e5v34', formFactor: 'torre' }, { 8: 12850, 16: 13050, 32: 13800 }),
    model({ slug: 'r630', name: 'Dell PowerEdge R630', tier: 'e5v34', formFactor: 'rack' }, { 8: 16250, 64: 18600 }),
    model({ slug: 't110', name: 'Dell PowerEdge T110', tier: 'entry', formFactor: 'torre' }, { 8: 2800, 16: 3750 }),
  ],
};
