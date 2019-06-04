const debug = require('debug')('promise-concurrency:');

class PromiseConcurrency {
  static async PromiseFulfillAll(arrOfPromises, options = {}) {
    const inst = new PromiseConcurrency(options);
    inst.pushArr(arrOfPromises);
    return inst.results();
  }

  constructor(options = {}) {
    this.pending = 0;
    this.running = 0;
    this.count = 0;
    this.options = {
      concurrency: 5,
      dequeueFrequency: 50,
      maxRetries: 50,
      streamResults: false,
      ...options,
    };
    this.jobs = [];
    this.res = [];
  }

  push(fn) {
    const job = {
      status: 'PENDING',
      fn,
    };
    this.pending++;
    this.jobs.push(job);
    this.dequeue();
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
      this.run.apply(this, [job]);
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

  run(job) {
    if (this.shouldDequeue()) {
      this._jobStarted();
      debug(`count: ${this.count++}, running: ${this.running}`);
      delete job.status;
      job
        .fn()
        .then((res) => this._jobFinished.apply(this, [res]))
        .then((res) => {
          this.res.push(res);
          return job;
        })
        .catch((e) => {
          this.running--;
          console.error(e);
        });
    }
  }

  results() {
    const { dequeueFrequency } = this.options;

    return new Promise((resolve, reject) => {
      try {
        const interval = setInterval(() => {
          const done = this.pending === 0 && this.running === 0;
          if (done) {
            clearInterval(interval);
            debug('Resolved promises');
            return resolve(this.res);
          }
          this.dequeue();
        }, dequeueFrequency);
      } catch (e) {
        reject(e);
      }
    });
  }
}

module.exports = PromiseConcurrency;
