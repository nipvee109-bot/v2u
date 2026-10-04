/**
 * Test fixture (Phase 67): the real registry with every non-deprecated entry marked as
 * if it had been verified, so ranking / planning / recommendation logic can still be
 * exercised while the real registry has no verified links. Never used by the app.
 * Candidate URLs are kept (so YouTube embedding tests use real ids); entries with no
 * URL get an obviously fake example.org URL.
 */
export function asActionable(registry) {
  return registry.map((r) =>
    r.status === 'deprecated'
      ? r
      : {
          ...r,
          status: 'verified',
          url: r.url ?? r.candidateVideoUrl ?? r.candidateUrl ?? `https://example.org/fixture/${r.id}`,
          verification: { checkedAt: '2026-10-04', method: 'test fixture', note: 'fixture', httpStatus: 200, titleMatches: true, coverageChecked: true, legalSource: true },
        }
  );
}

export async function useActionableRegistry(jiti, root, path) {
  const { RESOURCE_REGISTRY } = await jiti.import(path.join(root, 'src/resources/registry.ts'));
  const E = await jiti.import(path.join(root, 'src/resources/engine.ts'));
  E.__setResourceRegistryForTests(asActionable(RESOURCE_REGISTRY));
}
