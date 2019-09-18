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

  it('emits events', async () => {
    const pc = new PromiseConcurrency({ concurrency: 10 });
    [...new Array(100)].map(() => {
      pc.push(async () => {
        return 234;
      });
    });
    let count = 0;
    pc.on('data', (res, metrics) => {
      expect(metrics).toHaveProperty('pending');
      count += res;
    });
    const results = await pc.results();
    expect(results.length).toBe(100);
    expect(count).toBe(234*100);
    const expectedResult = [...new Array(100)].fill(234);
    expect(results).toEqual(expectedResult);
  });

  it('emits events should have metrics', async () => {
    const pc = new PromiseConcurrency({ concurrency: 10 });
    [...new Array(100)].map(() => {
      pc.push(async () => {
        return 234;
      });
    });
    pc.on('data', (res, metrics) => {
      expect(metrics).toHaveProperty('pending');
      expect(metrics).toHaveProperty('running');
      expect(metrics).toHaveProperty('count');
      expect(metrics).toHaveProperty('errorCount');
    });
    const results = await pc.results();
    expect(results.length).toBe(100);
    const expectedResult = [...new Array(100)].fill(234);
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

  it('PromiseMap: await-able static method', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = await PromiseConcurrency.promiseMap(arr, async (item) => {
      await sleep(30);
      return item;
    });
    expect(results).toEqual(arr);
  });

  Array.prototype.bigCheungus = function(...args) {
    return PromiseConcurrency.promiseMap.apply(this, [this, ...args]);
  };

  it('Array Prototype', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = await arr.bigCheungus(async (item) => {
      return item;
    });
    expect(results).toEqual(arr);
  });

  it('Array Prototype: with options', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const results = await arr.bigCheungus(
      async (item) => {
        await sleep(30);
        return item;
      },
      { concurrency: 2 },
    );
    expect(results).toEqual(arr);
  });

  it('autoStart: true', async () => {
    const pc = new PromiseConcurrency({ autoStart: true });
    const mockFunction = jest.fn(() => 'start');
    pc.push(async () => {
      return mockFunction();
    });
    expect(mockFunction).toBeCalledTimes(1);
    const results = await pc.results();
    expect(results.length).toBe(1);
    expect(results).toEqual(['start']);
  });

  it('autoStart: false', async () => {
    const pc = new PromiseConcurrency({ autoStart: false });
    const mockFunction = jest.fn(() => 'dont start');
    pc.push(async () => {
      return mockFunction();
    });
    expect(mockFunction).toBeCalledTimes(0);
    const results = await pc.results();
    expect(results.length).toBe(1);
    expect(results).toEqual(['dont start']);
  });
});

describe('error handling', () => {
  it('default: tolerate error in promises', async () => {
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

  it('onError handler: to throw', async (done) => {
    const pc = new PromiseConcurrency({
      autoStart: false,
      onError: (e) => {
        throw new Error('Error occurred: ' + e.message);
      },
    });
    pc.push(async () => {
      throw new Error('has error');
    });
    expect(pc.results()).rejects.toEqual('Error occurred: has error');
    done();
  });

  it('emits error', async () => {
    const pc = new PromiseConcurrency({
      onError: () => {},
    });
    pc.push(async () => {
      throw new Error('unique error');
    });
    let capturedError;
    pc.on('error', (e) => {
      capturedError = e.message;
    });
    await pc.results();
    expect(capturedError).toBe('unique error');
  });
});

function sleep(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
