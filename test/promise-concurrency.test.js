const PromiseConcurrency = require('../src');

describe('functional', () => {
  it('fulfills all promises', async () => {
    const pc = new PromiseConcurrency();
    [...new Array(100)].map(() => {
      pc.push(async () => 123);
    });
    const results = await pc.results();
    expect(results.length).toBe(100);
    const expectedResult = [...new Array(100)].fill(123);
    expect(results).toEqual(expectedResult);
  });

  it('fulfills all promises slowly', async () => {
    const pc = new PromiseConcurrency();
    [...new Array(100)].map(() => {
      pc.push(async () => {
        await sleep(50);
        return 234;
      });
    });
    const results = await pc.results();
    expect(results.length).toBe(100);
    const expectedResult = [...new Array(100)].fill(234);
    expect(results).toEqual(expectedResult);
  });

  it('fulfills all promises somewhat slowly', async () => {
    const pc = new PromiseConcurrency({ concurrency: 10 });
    [...new Array(100)].map(() => {
      pc.push(async () => {
        await sleep(50);
        return 234;
      });
    });
    const results = await pc.results();
    expect(results.length).toBe(100);
    const expectedResult = [...new Array(100)].fill(234);
    expect(results).toEqual(expectedResult);
  });

  it('torrelate error in promises', async () => {
    const pc = new PromiseConcurrency();
    [...new Array(99)].map(() => {
      pc.push(async () => {
        return 234;
      });
    });
    pc.push(async () => {
      throw new Error('has error');
    });
    const results = await pc.results();
    expect(results.length).toBe(99);
    const expectedResult = [...new Array(99)].fill(234);
    expect(results).toEqual(expectedResult);
  });

  it('PromiseFulfillAll: await-able static method', async () => {
    const promises = [...new Array(10)].map(() => async () => {
      await sleep(50);
      return 'big-cheungus';
    });
    const results = await PromiseConcurrency.PromiseFulfillAll(promises);
    const expectedResult = [...new Array(10)].fill('big-cheungus');
    expect(results).toEqual(expectedResult);
  });

  it('PromiseFulfillAll: honors options', async () => {
    const promises = [...new Array(10)].map(() => async () => {
      await sleep(50);
      return 'big-cheungus';
    });
    const results = await PromiseConcurrency.PromiseFulfillAll(promises, { concurrency: 10 });
    const expectedResult = [...new Array(10)].fill('big-cheungus');
    expect(results).toEqual(expectedResult);
  });
});

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
