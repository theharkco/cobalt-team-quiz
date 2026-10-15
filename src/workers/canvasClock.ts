// A worker pulse avoids the aggressive chained-window-timer throttling used
// for hidden tabs. The host still owns all decisions and database writes.
const pulse = setInterval(() => self.postMessage(Date.now()), 250);
self.onmessage = () => {
  clearInterval(pulse);
  self.close();
};