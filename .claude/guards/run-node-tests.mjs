#!/usr/bin/env node
/**
 * Runs `node --test` over the given files or glob patterns with a temporary folder of its own, and fails when the
 * tests leave files in it.
 * Usage: node .claude/guards/run-node-tests.mjs <pattern>...
 */
import { NodeTestRun } from './node-test-run.mjs';

process.exitCode = new NodeTestRun(process.argv.slice(2)).run();
