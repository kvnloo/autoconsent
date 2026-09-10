import { expect } from '@esm-bundle/chai';
import Autoconsent from '../../lib/web';

/**
 * Repro for https://github.com/duckduckgo/autoconsent/issues/1034:
 * static page + detectRetries > 0 must not hang on waitForMutation via Promise.all.
 */
describe('Autoconsent.findCmp static no-CMP retries', function () {
    // Retries use 500ms waits; keep headroom above mocha's default 2s.
    this.timeout(10000);

    let autoconsent: Autoconsent;

    beforeEach(() => {
        autoconsent = new Autoconsent(() => Promise.resolve(), {
            enabled: false, // bypass initialization / auto-start
            autoAction: null,
            heuristicMode: 'off',
            detectRetries: 2,
        });
        // Keep the suite focused on the retry-wait race, not rule volume.
        autoconsent.rules = [];
    });

    it('completes promptly when the DOM never mutates and retries remain', async () => {
        // Simulate a mutation wait that never settles (static page).
        autoconsent.domActions.waitForMutation = () => new Promise(() => {});

        const started = performance.now();
        const found = await autoconsent.findCmp(2);
        const elapsedMs = performance.now() - started;

        expect(found).to.have.length(0);
        // With Promise.all this would sit until waitForMutation's ~60s timeout.
        // With Promise.race, two 500ms waits should finish well under 5s.
        expect(elapsedMs).to.be.below(5000);
        expect(autoconsent.state.findCmpAttempts).to.be.at.least(3);
    });
});
