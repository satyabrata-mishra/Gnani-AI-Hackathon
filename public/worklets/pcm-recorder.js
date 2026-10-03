// Captures mono Float32 PCM from the mic and posts it to the main thread in batches.
const BATCH = 2048;

class PcmRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(BATCH);
    this.offset = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;

    let read = 0;
    while (read < channel.length) {
      const n = Math.min(channel.length - read, BATCH - this.offset);
      this.buffer.set(channel.subarray(read, read + n), this.offset);
      this.offset += n;
      read += n;
      if (this.offset === BATCH) {
        this.port.postMessage(this.buffer);
        this.buffer = new Float32Array(BATCH);
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-recorder", PcmRecorder);
