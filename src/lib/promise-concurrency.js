const EventEmitter = require('events');
const debug = require('debug')('promise-concurrency:');

class PromiseConcurrency extends EventEmitter {
  static async PromiseFulfillAll(arrOfPromises, options = {}) {
    const inst = new PromiseConcurrency(options);
    inst.pushArr(arrOfPromises);
    return inst.results();
  }

  static async promiseMap(arr, fn, options = {}) {
    const inst = new PromiseConcurrency(options);
    arr.forEach((...args) => {
      inst.push(async () => fn(...args));
    });
    return inst.results();
  }

  constructor(options = {}) {
    super();
    this.jobs = [];
    this.res = [];
    this.pending = 0;
    this.running = 0;
    this.count = 0;
    this.errorCount = 0;

    this.options = {
      concurrency: 5,
      dequeueFrequency: 50,
      onError: this.noOpt,
      throwOnError: false,
      autoStart: true,
      ...options,
    };
  }

  push(fn) {
    const job = {
      status: 'PENDING',
      fn,
    };
    this.pending++;
    this.jobs.push(job);
    this.options.autoStart && this.dequeue();
  }

  pushArr(arrOfFn) {
    arrOfFn.forEach((fn) => {
      this.push(fn);
    });
  }

  getJobByStatus(status) {
    return this.jobs.filter((job) => {
      return job.status === status;
    });
  }

  shouldDequeue() {
    return this.running < this.options.concurrency;
  }

  availableSlots() {
    return this.options.concurrency - this.running;
  }

  dequeue() {
    const toDo = this.jobs.splice(0, this.availableSlots());
    toDo.forEach((job) => {
      this.run.apply(this, [job]).catch((e) => {
        if (this.options.throwOnError) {
          throw new Error('Aborted promises due to error');
        }
        this.options.onError(e, job);
      });
    });
  }

  _jobStarted() {
    this.running++;
    this.pending--;
  }

  _jobFinished(res) {
    this.running--;
    this.done++;
    if (this.shouldDequeue()) {
      this.dequeue();
    }
    return res;
  }

  _emitDefault() {
    return {
      pending: this.pending,
      running: this.running,
      count: this.count,
      errorCount: this.errorCount,
    };
  }

  run(job) {
    if (this.shouldDequeue()) {
      this._jobStarted();
      debug(`count: ${this.count++}, running: ${this.running}`);
      delete job.status;
      return job
        .fn()
        .then((res) => this._jobFinished.apply(this, [res]))
        .then((res) => {
          this.emit('data', res, this._emitDefault());
          this.res.push(res);
          delete job.fn;
          return job;
        })
        .catch((e) => {
          this.running--;
          this.errorCount++;
          this.emit('error', e, this._emitDefault());
          this.options.onError(e, job);
          console.error(e);
        });
    }
    return Promise.resolve();
  }

  results() {
    const { dequeueFrequency } = this.options;

    return new Promise((resolve, reject) => {
      let interval;
      try {
        interval = setInterval(() => {
          if (this.options.throwOnError && this.errorCount) {
            clearInterval(interval);
            reject('Aborted promises due to error');
          }
          const done = this.pending === 0 && this.running === 0;
          if (done) {
            clearInterval(interval);
            debug('Resolved promises');
            return resolve(this.res);
          }
          this.dequeue();
        }, dequeueFrequency);
      } catch (e) {
        clearInterval(interval);
        reject(e);
      }
    });
  }

  noOpt() {}
}

module.exports = PromiseConcurrency;
