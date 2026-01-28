import { executeMutation } from "./executors/index";
import type { MutationResults, QueueItem, TableMutation } from "./mutationTypes";

const queues = new Map<string, QueueItem<TableMutation>[]>();
const running = new Set<string>();

export function enqueueTableMutation<M extends TableMutation>(
  mutation: M
): Promise<{ result: MutationResults[M["type"]] }> {
  return new Promise((resolve, reject) => {
    const mutationId = crypto.randomUUID();
    
    const item: QueueItem<M> = {
      id: mutationId,
      mutation,
      createdAt: Date.now(),
      attempt: 0,
      resolve,
      reject,
    };

    const queue = queues.get(mutation.tableId) ?? [];
    queue.push(item as unknown as QueueItem<TableMutation>);
    queues.set(mutation.tableId, queue);

    void processQueue(mutation.tableId);
  });
}

async function processQueue(tableId: string) {
  if (running.has(tableId)) return;

  const queue = queues.get(tableId);
  if (!queue || queue.length === 0) return;

  running.add(tableId);
  const item = queue[0]!;

  try {
    const result = await executeMutation(item.mutation);
    item.resolve({ result });
    queue.shift();
  } catch (err) {
    item.attempt++;
    console.error("Mutation failed", item.mutation, err);
    // optional retry/backoff here
    if (item.attempt > 5) {
      queue.shift(); // drop permanently
      item.reject(err);
    }
  } finally {
    running.delete(tableId);
    if (queue.length > 0) void processQueue(tableId);
  }
}
