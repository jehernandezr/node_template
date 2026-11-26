import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IdGenerator } from '../../ids/id-generator.js';
import { RandomSource } from '../../random/random-source.js';
import { Clock } from '../../time/clock.js';
import { KernelModule } from '../kernel.module.js';

/** A module that imports nothing: it only sees the kernel because the kernel is global. */
@Module({})
class FeatureModule {}

describe('KernelModule', () => {
  it('gives every module of the application the same clock, randomness and id generator', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [KernelModule, FeatureModule],
    }).compile();

    const feature = moduleRef.select(FeatureModule);

    expect(feature.get(Clock, { strict: false })).toBe(moduleRef.get(Clock));
    expect(feature.get(RandomSource, { strict: false })).toBe(
      moduleRef.get(RandomSource),
    );
    expect(feature.get(IdGenerator, { strict: false })).toBe(
      moduleRef.get(IdGenerator),
    );
    await moduleRef.close();
  });

  it('generates ordered ids from its clock', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [KernelModule],
    }).compile();
    const ids = moduleRef.get(IdGenerator);

    const first = ids.next().toString();
    const second = ids.next().toString();

    expect(second > first).toBe(true);
    await moduleRef.close();
  });
});
