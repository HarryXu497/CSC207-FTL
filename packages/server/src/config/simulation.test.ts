import { createMessageRepositoryBuilder, InMemoryCallRepository } from '../repository/database';
import { StoredSimulationRepository } from '../repository/simulation';
import { describe, expect, it, vi } from 'vitest';
import { buildSimulationRepository } from './simulation';

const calls = new InMemoryCallRepository([]);
const factory = createMessageRepositoryBuilder('memory');
const enabled: NodeJS.ProcessEnv = {
  SIMULATION_ENABLED: 'true',
  OPENAI_API_KEY: 'test-key',
  SIMULATION_MODEL: 'test-chat-model',
};

describe('buildSimulationRepository', () => {
  it('leaves simulation unavailable by default without requiring credentials', () => {
    expect(buildSimulationRepository(calls, factory, {})).toBeNull();
  });

  it('uses the server key and default model without a simulation flag', () => {
    expect(
      buildSimulationRepository(calls, factory, { OPENAI_API_KEY: 'test-key' }),
    ).toBeInstanceOf(StoredSimulationRepository);
  });

  it('preserves an explicit opt-out', () => {
    expect(
      buildSimulationRepository(calls, factory, { ...enabled, SIMULATION_ENABLED: 'false' }),
    ).toBeNull();
  });

  it('requires a server key if explicitly enabled', () => {
    expect(() => buildSimulationRepository(calls, factory, { SIMULATION_ENABLED: 'true' })).toThrow(
      'OPENAI_API_KEY is required',
    );
  });

  it('constructs the configured service without calling external APIs at startup', () => {
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('Unexpected external request.'));

    try {
      const repository = buildSimulationRepository(calls, factory, {
        ...enabled,
        CHROMA_URL: 'https://chroma.example.com:8443',
        CHROMA_COLLECTION: 'company-documents',
        RAG_EMBEDDING_MODEL: 'text-embedding-3-small',
      });

      expect(repository).toBeInstanceOf(StoredSimulationRepository);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
});
