/**
 * Public surface of the guest ordering domain. Routes and middleware import the
 * orchestration layer from here; the `.data` and `.sse` services are internal
 * implementation details composed by the orchestrator.
 */
export * from './guestOrdering.service';
