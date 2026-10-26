import { getQueue, getQueueSnapshot } from "./src/lib/queue";
const action = process.argv[2];
async function main() {
  const q = getQueue();
  if (action === "pause") await q.pause();
  if (action === "resume") await q.resume();
  if (action === "status") console.log(await getQueueSnapshot());
  if (action === "enqueue") {
    const [projectId, stage] = [process.argv[3], process.argv[4]];
    const job = await q.add(stage, { projectId }, { jobId: `${projectId}-${stage}-${Date.now()}` });
    console.log("queued", job.id);
  }
  if (action === "wait") {
    for (let i = 0; i < 120; i += 1) {
      const s = await getQueueSnapshot();
      if (s.active === 0) { console.log("idle", s); break; }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  await q.close();
  process.exit(0);
}
main();
